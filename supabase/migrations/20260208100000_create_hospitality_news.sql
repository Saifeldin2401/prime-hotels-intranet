-- Create hospitality_news table
CREATE TABLE IF NOT EXISTS public.hospitality_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_title TEXT NOT NULL,
    title_en TEXT,
    title_ar TEXT,
    summary_en TEXT,
    summary_ar TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    image_url TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    category TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hospitality_news_published_at ON public.hospitality_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospitality_news_category ON public.hospitality_news(category);
CREATE INDEX IF NOT EXISTS idx_hospitality_news_is_visible ON public.hospitality_news(is_visible);

-- Enable Row Level Security
ALTER TABLE public.hospitality_news ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- 1. Allow authenticated users to view visible news
CREATE POLICY "Authenticated users can view visible news"
    ON public.hospitality_news
    FOR SELECT
    TO authenticated
    USING (is_visible = true);

-- 2. Allow service role to manage all news (for edge functions)
-- Note: Service role bypasses RLS, but explicit policies for admin management can be added here if needed
CREATE POLICY "Admins can manage news"
    ON public.hospitality_news
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('corporate_admin', 'super_admin')
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.hospitality_news IS 'Stores bilingual hospitality news for the KSA market';
COMMENT ON COLUMN public.hospitality_news.title_en IS 'English translation of the title';
COMMENT ON COLUMN public.hospitality_news.title_ar IS 'Arabic translation of the title';
