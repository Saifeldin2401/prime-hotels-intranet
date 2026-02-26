ALTER TABLE documents ADD COLUMN IF NOT EXISTS linked_training_id UUID REFERENCES training_modules(id) ON DELETE SET NULL;;
