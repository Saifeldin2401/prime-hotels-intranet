-- Create motivational_content table
CREATE TABLE IF NOT EXISTS public.motivational_content (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content_en text NOT NULL,
    content_ar text NOT NULL,
    author_en text,
    author_ar text,
    category text DEFAULT 'general' CHECK (category IN ('general', 'leadership', 'service', 'wellness', 'sales')),
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.motivational_content ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can read active motivational content"
    ON public.motivational_content
    FOR SELECT
    USING (is_active = true);

-- Policy for Admins using user_roles table
CREATE POLICY "Admins can manage motivational content"
    ON public.motivational_content
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role::text IN ('admin', 'super_admin')
        )
    );

-- Seed Initial Data
INSERT INTO public.motivational_content (content_en, content_ar, author_en, author_ar, category) VALUES
('The best way to find yourself is to lose yourself in the service of others.', 'أفضل طريقة لتجد نفسك هي أن تفقد نفسك في خدمة الآخرين.', 'Mahatma Gandhi', 'المهاتما غاندي', 'service'),
('Quality is not an act, it is a habit.', 'الجودة ليست فعلاً، بل هي عادة.', 'Aristotle', 'أرسطو', 'service'),
('Leadership is not about being in charge. It is about taking care of those in your charge.', 'القيادة ليست مجرد تولي المسؤولية، بل هي العناية بمن هم تحت مسؤوليتك.', 'Simon Sinek', 'سايمون سينك', 'leadership'),
('Success is not final, failure is not fatal: it is the courage to continue that counts.', 'النجاح ليس نهائياً، والفشل ليس قاتلاً: إن الشجاعة للاستمرار هي ما يهم.', 'Winston Churchill', 'ونستون تشرشل', 'general'),
('Your health is an investment, not an expense.', 'صحتك استثمار وليست مجرد تكلفة.', 'Unknown', 'غير معروف', 'wellness');
