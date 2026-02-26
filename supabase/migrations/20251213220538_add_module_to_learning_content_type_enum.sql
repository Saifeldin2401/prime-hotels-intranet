-- Add 'module' to the learning_content_type enum
ALTER TYPE learning_content_type ADD VALUE IF NOT EXISTS 'module';

-- Also add 'microlearning' if not exists for future use
ALTER TYPE learning_content_type ADD VALUE IF NOT EXISTS 'microlearning';;
