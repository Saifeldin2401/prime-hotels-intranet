-- Migration: Add summary fields to documents table for TL;DR feature
-- Run this in Supabase SQL Editor

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS summary_ar TEXT;

-- Add comment for documentation
COMMENT ON COLUMN documents.summary IS 'TL;DR summary in English for quick reading';
COMMENT ON COLUMN documents.summary_ar IS 'TL;DR summary in Arabic for quick reading';
