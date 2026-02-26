ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS reduced_motion boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS high_contrast boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS large_text boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS keyboard_shortcuts boolean DEFAULT true;

-- Update RLS if needed (assuming user_settings already has policy for user_id = auth.uid())
COMMENT ON COLUMN public.user_settings.reduced_motion IS 'Accessibility: Minimize animations';
COMMENT ON COLUMN public.user_settings.high_contrast IS 'Accessibility: Increase text contrast';
COMMENT ON COLUMN public.user_settings.large_text IS 'Accessibility: Increase font size';
COMMENT ON COLUMN public.user_settings.keyboard_shortcuts IS 'Productivity: Enable rapid keys';;
