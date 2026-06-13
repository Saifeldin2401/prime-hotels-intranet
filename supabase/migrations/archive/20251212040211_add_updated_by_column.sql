ALTER TABLE sop_documents 
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);;
