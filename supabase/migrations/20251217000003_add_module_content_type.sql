-- Add 'module' to learning_content_type enum
-- This is required for assigning Training Modules

ALTER TYPE learning_content_type ADD VALUE IF NOT EXISTS 'module';
