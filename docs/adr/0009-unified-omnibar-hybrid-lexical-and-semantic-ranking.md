# 0009. Unified Omnibar with Hybrid Lexical and Semantic Ranking (RRF)

We chose a single unified search omnibar that executes hybrid search combining PostgreSQL full-text search (`tsvector` across titles, bodies, and OCR transcripts) and vector cosine similarity (`pgvector` against ONNX image embeddings). The search engine parses inline filter tokens (e.g., `kind:image`, `city:Austin`, `after:2026-01-01`) and ranks results using Reciprocal Rank Fusion (RRF) to merge textual relevance with visual semantic similarity into a single, intuitive results stream.
