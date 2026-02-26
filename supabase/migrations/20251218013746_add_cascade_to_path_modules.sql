-- Ensure ON DELETE CASCADE for training_path_modules
ALTER TABLE public.training_path_modules
DROP CONSTRAINT IF EXISTS training_path_modules_path_id_fkey,
ADD CONSTRAINT training_path_modules_path_id_fkey 
  FOREIGN KEY (path_id) 
  REFERENCES public.training_paths(id) 
  ON DELETE CASCADE;
;
