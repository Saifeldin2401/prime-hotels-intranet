-- PMS Integration Platform - Phase 1A Database Schema
-- Creates standardized data model for multi-PMS hotel operations

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE pms_type AS ENUM ('opera', 'cloudbeds', 'mews', 'local', 'other');
CREATE TYPE import_type AS ENUM ('csv', 'api', 'manual');
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'completed', 'failed');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- PMS Configuration per property
CREATE TABLE IF NOT EXISTS pms_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    pms_type pms_type NOT NULL,
    pms_name TEXT NOT NULL,
    api_endpoint TEXT,
    api_credentials JSONB, -- Store encrypted or use Vault
    sync_frequency TEXT DEFAULT 'daily',
    reporting_cutoff_time TIME DEFAULT '23:00:00',
    last_sync_at TIMESTAMPTZ,
    sync_status sync_status DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id),
    UNIQUE(property_id) -- One PMS per property
);

-- Field mapping rules for each PMS
CREATE TABLE IF NOT EXISTS pms_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pms_system_id UUID NOT NULL REFERENCES pms_systems(id) ON DELETE CASCADE,
    source_field TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_field TEXT NOT NULL,
    transform_rule JSONB, -- {type: 'direct'|'lookup'|'formula', config: {...}}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pms_system_id, source_field, target_table, target_field)
);

-- ============================================================================
-- STANDARDIZED OPERATIONAL DATA
-- ============================================================================

-- Daily Occupancy - Core metric
CREATE TABLE IF NOT EXISTS daily_occupancy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    rooms_available INTEGER NOT NULL DEFAULT 0,
    rooms_sold INTEGER NOT NULL DEFAULT 0,
    rooms_ooo INTEGER DEFAULT 0, -- Out of order
    occupancy_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN rooms_available > 0 
        THEN ROUND((rooms_sold::DECIMAL / rooms_available * 100), 2)
        ELSE 0 END
    ) STORED,
    adults INTEGER DEFAULT 0,
    children INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    cancellations INTEGER DEFAULT 0,
    walk_ins INTEGER DEFAULT 0,
    source_import_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, business_date)
);

-- Daily Revenue - Financial data
CREATE TABLE IF NOT EXISTS daily_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    room_revenue DECIMAL(12,2) DEFAULT 0,
    fb_revenue DECIMAL(12,2) DEFAULT 0, -- Food & Beverage
    spa_revenue DECIMAL(12,2) DEFAULT 0,
    other_revenue DECIMAL(12,2) DEFAULT 0,
    total_revenue DECIMAL(12,2) GENERATED ALWAYS AS (
        room_revenue + fb_revenue + spa_revenue + other_revenue
    ) STORED,
    rooms_sold INTEGER DEFAULT 0,
    adr DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE WHEN rooms_sold > 0 
        THEN ROUND(room_revenue / rooms_sold, 2)
        ELSE 0 END
    ) STORED,
    revpar DECIMAL(10,2) DEFAULT 0, -- Calculated with rooms_available
    cash_collections DECIMAL(12,2) DEFAULT 0,
    credit_collections DECIMAL(12,2) DEFAULT 0,
    ar_collections DECIMAL(12,2) DEFAULT 0, -- Accounts receivable
    source_import_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, business_date)
);

-- Market Segments - Guest segmentation
CREATE TABLE IF NOT EXISTS market_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    segment_code TEXT NOT NULL,
    segment_name TEXT NOT NULL,
    room_nights INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    guests INTEGER DEFAULT 0,
    source_import_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Room Inventory by Type
CREATE TABLE IF NOT EXISTS room_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    room_type TEXT NOT NULL,
    rooms_available INTEGER DEFAULT 0,
    rooms_sold INTEGER DEFAULT 0,
    rooms_ooo INTEGER DEFAULT 0,
    avg_rate DECIMAL(10,2) DEFAULT 0,
    source_import_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, business_date, room_type)
);

-- Rate Summary
CREATE TABLE IF NOT EXISTS rate_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    rate_code TEXT NOT NULL,
    rate_name TEXT NOT NULL,
    room_nights INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    avg_rate DECIMAL(10,2) DEFAULT 0,
    source_import_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- AUDIT & IMPORT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    pms_system_id UUID REFERENCES pms_systems(id),
    import_type import_type NOT NULL,
    file_name TEXT,
    business_date_start DATE,
    business_date_end DATE,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status sync_status DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,
    imported_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_daily_occupancy_property_date ON daily_occupancy(property_id, business_date DESC);
CREATE INDEX idx_daily_revenue_property_date ON daily_revenue(property_id, business_date DESC);
CREATE INDEX idx_market_segments_property_date ON market_segments(property_id, business_date DESC);
CREATE INDEX idx_room_inventory_property_date ON room_inventory(property_id, business_date DESC);
CREATE INDEX idx_rate_summary_property_date ON rate_summary(property_id, business_date DESC);
CREATE INDEX idx_import_logs_property ON data_import_logs(property_id, started_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pms_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE pms_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_logs ENABLE ROW LEVEL SECURITY;

-- PMS Systems policies
CREATE POLICY "Users see PMS for accessible properties" ON pms_systems
    FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Admins can manage PMS config" ON pms_systems
    FOR ALL USING (
        public.has_role(auth.uid(), 'regional_admin') AND
        public.has_property_access(auth.uid(), property_id)
    );

-- Field Mappings policies
CREATE POLICY "Users see mappings for accessible PMS" ON pms_field_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pms_systems ps
            WHERE ps.id = pms_field_mappings.pms_system_id
            AND public.has_property_access(auth.uid(), ps.property_id)
        )
    );

CREATE POLICY "Admins can manage field mappings" ON pms_field_mappings
    FOR ALL USING (
        public.has_role(auth.uid(), 'regional_admin')
    );

-- Operational data policies (SELECT for property access, INSERT/UPDATE for managers+)
CREATE POLICY "Users see occupancy for accessible properties" ON daily_occupancy
    FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Managers can insert occupancy data" ON daily_occupancy
    FOR INSERT WITH CHECK (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

CREATE POLICY "Managers can update occupancy data" ON daily_occupancy
    FOR UPDATE USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- Revenue policies
CREATE POLICY "Users see revenue for accessible properties" ON daily_revenue
    FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Managers can insert revenue data" ON daily_revenue
    FOR INSERT WITH CHECK (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

CREATE POLICY "Managers can update revenue data" ON daily_revenue
    FOR UPDATE USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- Market segments policies
CREATE POLICY "Users see segments for accessible properties" ON market_segments
    FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Managers can manage segments" ON market_segments
    FOR ALL USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- Room inventory policies
CREATE POLICY "Users see inventory for accessible properties" ON room_inventory
    FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Managers can manage inventory" ON room_inventory
    FOR ALL USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- Rate summary policies
CREATE POLICY "Users see rates for accessible properties" ON rate_summary
    FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Managers can manage rates" ON rate_summary
    FOR ALL USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- Import logs policies
CREATE POLICY "Users see import logs for accessible properties" ON data_import_logs
    FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Managers can create import logs" ON data_import_logs
    FOR INSERT WITH CHECK (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate RevPAR and update daily_revenue
CREATE OR REPLACE FUNCTION update_revpar()
RETURNS TRIGGER AS $$
BEGIN
    -- Get rooms_available from daily_occupancy for same property/date
    SELECT rooms_available INTO NEW.revpar
    FROM daily_occupancy
    WHERE property_id = NEW.property_id 
    AND business_date = NEW.business_date;
    
    IF NEW.revpar IS NOT NULL AND NEW.revpar > 0 THEN
        NEW.revpar := ROUND(NEW.room_revenue / NEW.revpar, 2);
    ELSE
        NEW.revpar := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_revpar
    BEFORE INSERT OR UPDATE ON daily_revenue
    FOR EACH ROW
    EXECUTE FUNCTION update_revpar();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_ops_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_occupancy_timestamp
    BEFORE UPDATE ON daily_occupancy
    FOR EACH ROW
    EXECUTE FUNCTION update_ops_timestamp();

CREATE TRIGGER trg_update_revenue_timestamp
    BEFORE UPDATE ON daily_revenue
    FOR EACH ROW
    EXECUTE FUNCTION update_ops_timestamp();

CREATE TRIGGER trg_update_pms_timestamp
    BEFORE UPDATE ON pms_systems
    FOR EACH ROW
    EXECUTE FUNCTION update_ops_timestamp();
