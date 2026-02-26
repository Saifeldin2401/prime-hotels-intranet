-- Add missing content block types to enum
ALTER TYPE content_block_type ADD VALUE IF NOT EXISTS 'quiz';
ALTER TYPE content_block_type ADD VALUE IF NOT EXISTS 'sop_reference';
ALTER TYPE content_block_type ADD VALUE IF NOT EXISTS 'audio';
ALTER TYPE content_block_type ADD VALUE IF NOT EXISTS 'interactive';;
