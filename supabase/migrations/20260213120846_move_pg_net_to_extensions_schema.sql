create schema if not exists extensions;

drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;;
