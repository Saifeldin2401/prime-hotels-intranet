CREATE TABLE IF NOT EXISTS document_favorites (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, document_id)
);

ALTER TABLE document_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
    ON document_favorites
    FOR ALL
    USING (auth.uid() = user_id);
;
