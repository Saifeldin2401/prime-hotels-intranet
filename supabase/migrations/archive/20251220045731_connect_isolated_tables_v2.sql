-- Connect isolated tables with proper foreign keys

-- 1. holidays table - connect property_id to properties
ALTER TABLE holidays
ADD CONSTRAINT holidays_property_id_fkey 
FOREIGN KEY (property_id) 
REFERENCES properties(id) 
ON DELETE CASCADE;

-- 2. knowledge_related_articles - connect both document IDs to documents table
ALTER TABLE knowledge_related_articles
ADD CONSTRAINT knowledge_related_articles_document_id_fkey 
FOREIGN KEY (document_id) 
REFERENCES documents(id) 
ON DELETE CASCADE;

ALTER TABLE knowledge_related_articles
ADD CONSTRAINT knowledge_related_articles_related_document_id_fkey 
FOREIGN KEY (related_document_id) 
REFERENCES documents(id) 
ON DELETE CASCADE;;
