import re
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy import select, text, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.phaste import Phaste
from app.services.embedding_service import embedding_service
from app.schemas.phaste import PhasteResponse, SearchResultItem, SearchResponse


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

    # 3. Hybrid query with Reciprocal Rank Fusion (RRF)
    # Uses PostgreSQL websearch_to_tsquery for natural queries ("term1 or term2", "phrase")
    hybrid_sql = f"""
        WITH lexical_ranked AS (
            SELECT id,
                   ts_rank_cd(search_vector, websearch_to_tsquery('english', :text_query)) AS text_rank,
                   ROW_NUMBER() OVER (ORDER BY ts_rank_cd(search_vector, websearch_to_tsquery('english', :text_query)) DESC) AS text_pos
            FROM phastes
            WHERE {where_sql}
              AND (
                  search_vector @@ websearch_to_tsquery('english', :text_query)
                  OR title ILIKE '%' || :text_query || '%'
                  OR content ILIKE '%' || :text_query || '%'
                  OR ocr_transcript ILIKE '%' || :text_query || '%'
              )
            LIMIT 100
        ),
        vector_ranked AS (
            SELECT id,
                   (1.0 - (visual_embedding <=> :query_vector::vector)) AS sim_score,
                   ROW_NUMBER() OVER (ORDER BY (visual_embedding <=> :query_vector::vector) ASC) AS vec_pos
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
        # Fallback to simple ILIKE search if tsquery or vector fails
        fallback_sql = f"""
            SELECT *, 0.5 AS score, 'lexical' AS match_type
            FROM phastes
            WHERE {where_sql}
              AND (
                  title ILIKE '%' || :text_query || '%'
                  OR content ILIKE '%' || :text_query || '%'
                  OR ocr_transcript ILIKE '%' || :text_query || '%'
              )
            ORDER BY is_pinned DESC, created_at DESC
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
