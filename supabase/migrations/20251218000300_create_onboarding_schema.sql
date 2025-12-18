-- Onboarding Templates Table
create table public.onboarding_templates (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  role app_role, -- Target role (optional if department specific)
  department_id uuid references public.departments(id), -- Target department (optional)
  tasks jsonb not null default '[]'::jsonb, -- List of task definitions
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Onboarding Process Table (Tracks a user's onboarding journey)
create table public.onboarding_process (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  template_id uuid references public.onboarding_templates(id),
  status entity_status default 'pending'::entity_status,
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  progress_percent integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Onboarding Tasks Table (Individual tasks instances for a user)
create table public.onboarding_tasks (
  id uuid default gen_random_uuid() primary key,
  process_id uuid references public.onboarding_process(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'pending', -- pending, in_progress, completed
  assigned_to_id uuid references public.profiles(id), -- Specific assignee (could be the new hire, manager, or IT)
  due_date timestamp with time zone,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.onboarding_templates enable row level security;
alter table public.onboarding_process enable row level security;
alter table public.onboarding_tasks enable row level security;

-- Policies for Onboarding Templates
create policy "Templates are viewable by everyone"
  on public.onboarding_templates for select
  using (true);

create policy "Templates editable by admins"
  on public.onboarding_templates for all
  using (
    exists (
      select 1 from public.user_roles
      and role in ('regional_admin', 'property_manager', 'department_head')
    )
  );

-- Policies for Onboarding Process
create policy "Users can view their own process"
  on public.onboarding_process for select
  using (user_id = auth.uid());

create policy "Managers can view/edit their staff's process"
  on public.onboarding_process for all
  using (
    exists (
      select 1 from public.profiles
      where id = public.onboarding_process.user_id
      and (
          reporting_to = auth.uid() OR
          exists (
             select 1 from public.user_roles
             and role in ('regional_admin', 'property_manager', 'department_head')
          )
      )
    )
  );
  
-- Policies for Onboarding Tasks
create policy "Users can view assigned tasks"
  on public.onboarding_tasks for select
  using (
    assigned_to_id = auth.uid() OR
    exists (
        select 1 from public.onboarding_process
        where id = process_id and user_id = auth.uid()
    ) OR 
    exists (
      select 1 from public.user_roles
      and role in ('regional_admin', 'property_manager', 'department_head')
    )
  );
  
create policy "Users can update their own tasks"
  on public.onboarding_tasks for update
  using (assigned_to_id = auth.uid());

-- Function to Handle Onboarding Trigger
create or replace function public.handle_new_user_onboarding()
returns trigger as $$
declare
  v_template_id uuid;
  v_process_id uuid;
  v_task jsonb;
  v_due_date timestamp with time zone;
  v_assignee_id uuid;
  v_user_role public.app_role;
begin
  -- 1. Find the User's Role (if not passed, look it up)
  select role into v_user_role from public.user_roles where user_id = new.user_id limit 1;
  
  -- 2. Find a matching template
  -- Priority: Exact Department Match -> Role Match -> Fallback
  select id into v_template_id
  from public.onboarding_templates
  where is_active = true
  and (department_id = new.department_id OR (department_id is null and role = v_user_role))
  order by department_id nulls last, created_at desc
  limit 1;

  -- If no template found, do nothing
  if v_template_id is null then
    return new;
  end if;

  -- 3. Create Process
  insert into public.onboarding_process (user_id, template_id, status, start_date)
  values (new.user_id, v_template_id, 'pending', now())
  returning id into v_process_id;

  -- 4. Create Tasks from JSON Template
  for v_task in select * from jsonb_array_elements((select tasks from public.onboarding_templates where id = v_template_id))
  loop
      -- Calculate due date
      v_due_date := now() + ((v_task->>'due_day_offset')::int || ' days')::interval;
      
      -- Determine Assignee
      -- 'self' = the new hire
      -- 'manager' = user's reporting_to (if available) or leave null for manual assignment
      if (v_task->>'assignee_role') = 'self' then
          v_assignee_id := new.user_id;
      elsif (v_task->>'assignee_role') = 'manager' then
           select reporting_to into v_assignee_id from public.profiles where id = new.user_id;
      else
          v_assignee_id := null; -- Pending assignment
      end if;

      insert into public.onboarding_tasks (
          process_id,
          title,
          description,
          assigned_to_id,
          due_date,
          status
      ) values (
          v_process_id,
          v_task->>'title',
          v_task->>'description',
          v_assignee_id,
          v_due_date,
          'pending'
      );
  end loop;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger: When a user_department is inserted (assigned to a dept)
create trigger on_department_assigned_start_onboarding
  after insert on public.user_departments
  for each row
  execute function public.handle_new_user_onboarding();
