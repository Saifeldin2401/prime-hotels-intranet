DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_status') THEN
        CREATE TYPE entity_status AS ENUM (
            'draft','pending','submitted','approved','rejected','todo','open','in_progress','review','pending_parts','completed','cancelled','archived','published','closed','filled'
        );
    END IF;
END $$;;
