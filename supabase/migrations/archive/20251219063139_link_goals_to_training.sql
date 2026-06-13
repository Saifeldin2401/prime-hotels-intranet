ALTER TABLE goals ADD COLUMN training_module_id UUID REFERENCES training_modules(id);
COMMENT ON COLUMN goals.training_module_id IS 'Link this goal to a specific training module to track progress.';;
