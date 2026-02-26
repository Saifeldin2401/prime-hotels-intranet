-- Add property_id to requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id);

-- Add index for performance in sidebar counts
CREATE INDEX IF NOT EXISTS idx_requests_property_id ON public.requests(property_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);

-- Optionally populate property_id from requester's property if possible
-- This is a bit complex without knowing the mapping table, but let's assume one exists or just leave it for new requests.
;
