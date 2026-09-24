-- PropertyContext.tsx, useMaintenanceTickets.ts, and usePrayerTimes.ts already expect
-- properties.latitude / properties.longitude (nullable, optional per-property geolocation
-- used for prayer times and, via PROPERTY_RELATION_COLUMNS, joined into maintenance ticket
-- queries). The columns were never actually added, so every maintenance-ticket fetch that
-- joins properties has been failing with "column properties_1.latitude does not exist",
-- and prayer times have been silently defaulting to Riyadh for every property.
alter table public.properties
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.properties.latitude is 'Property geolocation latitude, used for prayer times / weather. Null until set by an admin.';
comment on column public.properties.longitude is 'Property geolocation longitude, used for prayer times / weather. Null until set by an admin.';
