-- Add RLS policies for training_content_blocks

-- Allow authenticated users to read all content blocks
DROP POLICY IF EXISTS "training_content_blocks_select" ON training_content_blocks;
CREATE POLICY "training_content_blocks_select" 
ON training_content_blocks 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert content blocks for modules they own
DROP POLICY IF EXISTS "training_content_blocks_insert" ON training_content_blocks;
CREATE POLICY "training_content_blocks_insert" 
ON training_content_blocks 
FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM training_modules 
        WHERE id = training_module_id 
        AND created_by = auth.uid()
    )
);

-- Allow authenticated users to update content blocks for modules they own
DROP POLICY IF EXISTS "training_content_blocks_update" ON training_content_blocks;
CREATE POLICY "training_content_blocks_update" 
ON training_content_blocks 
FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM training_modules 
        WHERE id = training_module_id 
        AND created_by = auth.uid()
    )
);

-- Allow authenticated users to delete content blocks for modules they own
DROP POLICY IF EXISTS "training_content_blocks_delete" ON training_content_blocks;
CREATE POLICY "training_content_blocks_delete" 
ON training_content_blocks 
FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM training_modules 
        WHERE id = training_module_id 
        AND created_by = auth.uid()
    )
);;
