# 0001. PostgreSQL with pgvector for Relational, Full-Text, and Vector Storage

We chose PostgreSQL with the `pgvector` extension (leveraging the existing PostgreSQL infrastructure on `linsrv`) over embedded SQLite and standalone vector databases (like Qdrant or Chroma). This provides a single, unified database engine capable of handling relational metadata, PostgreSQL full-text search (`tsvector`), and multimodal vector similarity queries simultaneously, with robust concurrency for asynchronous background ingestion workers.
