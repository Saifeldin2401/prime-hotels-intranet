-- Migration to add JSONB subtopics array to system_wiki table
alter table if exists public.system_wiki 
add column if not exists subtopics jsonb default '[]'::jsonb;
