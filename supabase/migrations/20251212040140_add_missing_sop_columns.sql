ALTER TABLE sop_documents 
ADD COLUMN IF NOT EXISTS code text,
ADD COLUMN IF NOT EXISTS title_ar text,
ADD COLUMN IF NOT EXISTS category_id uuid,
ADD COLUMN IF NOT EXISTS subcategory_id uuid,
ADD COLUMN IF NOT EXISTS compliance_level text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS review_frequency_months integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS next_review_date timestamptz;;
