import logging
import re
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy import select, text, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.phaste import Phaste
from app.services.embedding_service import embedding_service
from app.schemas.phaste import PhasteResponse, SearchResultItem, SearchResponse

logger = logging.getLogger(__name__)


def parse_query_filters(raw_query: str) -> Tuple[str, Dict[str, Any]]:
    """
    Extracts structured inline filter tokens from query string.
    e.g. 'flight ticket kind:image city:Chicago' -> ('flight ticket', {'kind': 'image', 'city': 'Chicago'})
    """
    filters: Dict[str, Any] = {}
    tokens = []
    
    # Match key:value or key:"value with spaces"
    pattern = r'(\b\w+):("([^"]+)"|(\S+))'
    
    last_end = 0
    clean_parts = []
    
    for match in re.finditer(pattern, raw_query):
        key = match.group(1).lower()
        val = match.group(3) if match.group(3) is not None else match.group(4)
        
        # Add text before this match
        clean_parts.append(raw_query[last_end:match.start()])
        last_end = match.end()
        
        if key in ("kind", "type"):
            filters["kind"] = val.lower()
        elif key in ("city", "location"):
            filters["city"] = val
        elif key in ("country", "country_code"):
            filters["country"] = val.upper()
        elif key in ("status",):
            filters["status"] = val.lower()
        elif key in ("pinned", "is_pinned"):
            filters["is_pinned"] = val.lower() in ("true", "1", "yes")
        elif key in ("after", "since"):
            filters["after"] = val
        elif key in ("before", "until"):
            filters["before"] = val
        else:
            # If not a recognized filter, treat as normal query word
            clean_parts.append(match.group(0))

    clean_parts.append(raw_query[last_end:])
    cleaned_text = " ".join("".join(clean_parts).split()).strip()
    return cleaned_text, filters


async def execute_hybrid_search(
    db: AsyncSession,
    raw_query: str,
    limit: int = 50,
    offset: int = 0
) -> SearchResponse:
    """
    Executes blended hybrid search combining PostgreSQL full-text search
    and pgvector cosine similarity with Reciprocal Rank Fusion (RRF).
    """
    cleaned_query, filters = parse_query_filters(raw_query)

    # 1. Base filter conditions
    filter_clauses = ["is_archived = false"]
    params: Dict[str, Any] = {"limit": limit, "offset": offset}

    if "kind" in filters:
        filter_clauses.append("kind = :filter_kind")
        params["filter_kind"] = filters["kind"]

    if "status" in filters:
        filter_clauses.append("status = :filter_status")
        params["filter_status"] = filters["status"]

    if "is_pinned" in filters:
        filter_clauses.append("is_pinned = :filter_pinned")
        params["filter_pinned"] = filters["is_pinned"]

    if "city" in filters:
        filter_clauses.append("metadata_context->>'city' ILIKE :filter_city")
        params["filter_city"] = f"%{filters['city']}%"

    if "country" in filters:
        filter_clauses.append("metadata_context->>'country_code' = :filter_country")
        params["filter_country"] = filters["country"]

    where_sql = " AND ".join(filter_clauses)

    # If query text is empty, return latest matching filter items
    if not cleaned_query:
        sql = f"""
            SELECT *, 1.0 AS score, 'filter' AS match_type
            FROM phastes
            WHERE {where_sql}
            ORDER BY is_pinned DESC, created_at DESC
            LIMIT :limit OFFSET :offset
        """
        result = await db.execute(text(sql), params)
        rows = result.mappings().all()

        results = [
            SearchResultItem(
                phaste=PhasteResponse.model_validate(dict(row)),
                score=1.0,
                match_type="filter"
            )
            for row in rows
        ]
        return SearchResponse(
            results=results,
            total=len(results),
            query=raw_query,
            filters_applied=filters
        )

    # 2. Vector embedding for query
    query_vector = await embedding_service.embed_text(cleaned_query)
    params["query_vector"] = str(query_vector)
    params["text_query"] = cleaned_query

    # Extract individual search words for multi-term query (matching across document, not just in sequence)
    raw_words = [w.strip() for w in re.findall(r'[a-zA-Z0-9_\-]+', cleaned_query) if len(w.strip()) > 0]
    search_words = raw_words if raw_words else [cleaned_query]

    and_tsquery = " & ".join(search_words)
    or_tsquery = " | ".join(search_words)
    params["and_tsquery"] = and_tsquery
    params["or_tsquery"] = or_tsquery

    ilike_clauses = []
    for i, w in enumerate(search_words[:8]):
        p_name = f"sw_{i}"
        params[p_name] = f"%{w}%"
        ilike_clauses.append(f"title ILIKE :{p_name} OR content ILIKE :{p_name} OR ocr_transcript ILIKE :{p_name}")
    
    words_ilike_sql = f"({') OR ('.join(ilike_clauses)})" if ilike_clauses else "1=1"

    # 3. Hybrid query with Reciprocal Rank Fusion (RRF)
    # Multi-term full-text search:
    # 1. Documents matching ALL words receive highest rank bonus
    # 2. Documents matching ANY word are included
    # 3. Exact full-phrase matches receive extra boost
    hybrid_sql = f"""
        WITH lexical_ranked AS (
            SELECT id,
                   (
                       (CASE WHEN search_vector @@ to_tsquery('english', :and_tsquery) THEN 3.0 ELSE 0.0 END) +
                       ts_rank_cd(search_vector, to_tsquery('english', :or_tsquery)) +
                       (CASE WHEN (title ILIKE '%' || :text_query || '%' OR content ILIKE '%' || :text_query || '%') THEN 1.5 ELSE 0.0 END)
                   ) AS text_rank,
                   ROW_NUMBER() OVER (
                       ORDER BY (
                           (CASE WHEN search_vector @@ to_tsquery('english', :and_tsquery) THEN 3.0 ELSE 0.0 END) +
                           ts_rank_cd(search_vector, to_tsquery('english', :or_tsquery)) +
                           (CASE WHEN (title ILIKE '%' || :text_query || '%' OR content ILIKE '%' || :text_query || '%') THEN 1.5 ELSE 0.0 END)
                       ) DESC
                   ) AS text_pos
            FROM phastes
            WHERE {where_sql}
              AND (
                  search_vector @@ to_tsquery('english', :or_tsquery)
                  OR {words_ilike_sql}
                  OR title ILIKE '%' || :text_query || '%'
                  OR content ILIKE '%' || :text_query || '%'
                  OR ocr_transcript ILIKE '%' || :text_query || '%'
              )
            LIMIT 100
        ),
        vector_ranked AS (
            SELECT id,
                   (1.0 - (visual_embedding <=> CAST(:query_vector AS vector))) AS sim_score,
                   ROW_NUMBER() OVER (ORDER BY (visual_embedding <=> CAST(:query_vector AS vector)) ASC) AS vec_pos
            FROM phastes
            WHERE {where_sql}
              AND visual_embedding IS NOT NULL
            LIMIT 100
        ),
        merged_rrf AS (
            SELECT 
                COALESCE(l.id, v.id) AS id,
                (
                    COALESCE(1.0 / (60.0 + l.text_pos), 0.0) +
                    COALESCE(1.0 / (60.0 + v.vec_pos), 0.0)
                ) AS rrf_score,
                CASE 
                    WHEN l.id IS NOT NULL AND v.id IS NOT NULL THEN 'hybrid'
                    WHEN l.id IS NOT NULL THEN 'lexical'
                    ELSE 'semantic'
                END AS match_type
            FROM lexical_ranked l
            FULL OUTER JOIN vector_ranked v ON l.id = v.id
        )
        SELECT p.*, m.rrf_score AS score, m.match_type
        FROM merged_rrf m
        JOIN phastes p ON p.id = m.id
        ORDER BY m.rrf_score DESC
        LIMIT :limit OFFSET :offset;
    """

    try:
        res = await db.execute(text(hybrid_sql), params)
        rows = res.mappings().all()

        results = [
            SearchResultItem(
                phaste=PhasteResponse.model_validate(dict(row)),
                score=float(row["score"]),
                match_type=str(row["match_type"])
            )
            for row in rows
        ]

        return SearchResponse(
            results=results,
            total=len(results),
            query=raw_query,
            filters_applied=filters
        )
    except Exception as e:
        logger.warning(f"Hybrid search failed, rolling back and falling back to ILIKE: {e}")
        await db.rollback()
        # Fallback to multi-term ILIKE search if tsquery or vector fails
        fallback_sql = f"""
            SELECT *,
                   (CASE WHEN (title ILIKE '%' || :text_query || '%' OR content ILIKE '%' || :text_query || '%') THEN 1.0 ELSE 0.5 END) AS score,
                   'lexical' AS match_type
            FROM phastes
            WHERE {where_sql}
              AND (
                  {words_ilike_sql}
                  OR title ILIKE '%' || :text_query || '%'
                  OR content ILIKE '%' || :text_query || '%'
                  OR ocr_transcript ILIKE '%' || :text_query || '%'
              )
            ORDER BY score DESC, is_pinned DESC, created_at DESC
            LIMIT :limit OFFSET :offset
        """
        fallback_res = await db.execute(text(fallback_sql), params)
        rows = fallback_res.mappings().all()
        results = [
            SearchResultItem(
                phaste=PhasteResponse.model_validate(dict(row)),
                score=0.5,
                match_type="lexical"
            )
            for row in rows
        ]
        return SearchResponse(
            results=results,
            total=len(results),
            query=raw_query,
            filters_applied=filters
        )
