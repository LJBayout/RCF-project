-- Add embedding column to cfr_sections for RAG
ALTER TABLE cfr_sections ADD COLUMN embedding TEXT;

-- Add embedding_updated_at to track when embeddings were generated
ALTER TABLE cfr_sections ADD COLUMN embedding_updated_at TIMESTAMP;

-- Add index on embedding_updated_at for efficient queries
CREATE INDEX embedding_updated_idx ON cfr_sections(embedding_updated_at);
