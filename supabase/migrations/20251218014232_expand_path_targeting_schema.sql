-- Expand targeting options for training_paths
ALTER TABLE public.training_paths 
ADD COLUMN IF NOT EXISTS target_property_id UUID REFERENCES properties(id),
ADD COLUMN IF NOT EXISTS target_user_ids UUID[] DEFAULT '{}';
;
