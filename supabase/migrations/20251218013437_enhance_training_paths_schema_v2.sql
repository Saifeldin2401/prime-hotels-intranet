-- Add missing columns to training_paths
ALTER TABLE public.training_paths 
ADD COLUMN IF NOT EXISTS estimated_duration_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS target_role app_role,
ADD COLUMN IF NOT EXISTS target_department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Rename order_index to sequence in training_path_modules if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_path_modules' AND column_name='order_index') THEN
    ALTER TABLE public.training_path_modules RENAME COLUMN order_index TO sequence;
  END IF;
END $$;
;
