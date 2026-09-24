-- TemplateEditor.tsx has always tried to save a required-training-modules picker onto
-- onboarding_templates.required_training_ids, but the column never existed -- every template
-- create/edit failed with a schema-cache error. Add the column to match the UI's intent.
ALTER TABLE public.onboarding_templates ADD COLUMN required_training_ids uuid[] NOT NULL DEFAULT '{}';
