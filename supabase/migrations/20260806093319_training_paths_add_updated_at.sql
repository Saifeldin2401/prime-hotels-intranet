-- TrainingPaths.tsx's edit mutation has always tried to set updated_at on every save, but the
-- column never existed, so every training-path edit failed with a schema-cache error. Sibling
-- tables (training_modules, documents) already track updated_at -- add it here too rather than
-- just deleting the write, since staleness tracking is clearly the intent.
ALTER TABLE public.training_paths ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
