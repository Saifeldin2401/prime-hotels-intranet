begin;

with ranked_user_departments as (
  select
    id,
    row_number() over (partition by user_id, department_id order by id) as row_num
  from public.user_departments
)
delete from public.user_departments
where id in (
  select id
  from ranked_user_departments
  where row_num > 1
);

with ranked_user_properties as (
  select
    id,
    row_number() over (partition by user_id, property_id order by id) as row_num
  from public.user_properties
)
delete from public.user_properties
where id in (
  select id
  from ranked_user_properties
  where row_num > 1
);

create unique index if not exists idx_user_departments_user_department_unique
  on public.user_departments (user_id, department_id);

create unique index if not exists idx_user_properties_user_property_unique
  on public.user_properties (user_id, property_id);

update public.properties
set property_code = case
  when name = 'PRIME Head Office' then 'PRIME-HQ'
  when name = 'Prime Al Hamra Hotel Jeddah' then 'JED-HAMRA'
  when name = 'Prime Al Corniche Hotel Jeddah' then 'JED-CORNICHE'
  when name = 'Medhal Qurtuba by Prime Hotels' then 'RUH-QURTUBA'
  when name = 'Prime Al Hamra Hotel Riyadh' then 'RUH-HAMRA'
  else property_code
end
where coalesce(property_code, '') = '';

update public.profiles
set
  job_title = 'Housekeeping Attendant',
  job_title_id = '0ad09a9d-eb96-4ffc-8773-0a74e0d74ed0'
where id = 'e9fa04e9-3f69-4f16-bc84-4271f20f9c64'
  and coalesce(job_title, '') = '';

commit;
