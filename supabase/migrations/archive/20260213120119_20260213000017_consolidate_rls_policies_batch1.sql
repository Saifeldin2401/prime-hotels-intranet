-- Batch 1 RLS consolidation to reduce multiple-permissive-policy overhead.
-- Keep equivalent access semantics while avoiding overlapping SELECT via ALL policies.

-- -----------------------------
-- learning_quizzes
-- -----------------------------
drop policy if exists "Draft quizzes viewable by creators and HR" on public.learning_quizzes;
drop policy if exists "Published quizzes viewable by all" on public.learning_quizzes;

create policy learning_quizzes_select
on public.learning_quizzes
for select
to public
using (
  status = 'published'::question_status
  or created_by = (select auth.uid())
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
);

create policy learning_quizzes_insert
on public.learning_quizzes
for insert
to public
with check (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
);

create policy learning_quizzes_update
on public.learning_quizzes
for update
to public
using (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
)
with check (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
);

create policy learning_quizzes_delete
on public.learning_quizzes
for delete
to public
using (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
);

-- -----------------------------
-- learning_quiz_questions
-- -----------------------------
drop policy if exists "HR can manage quiz questions" on public.learning_quiz_questions;
drop policy if exists "Quiz questions viewable if quiz is viewable" on public.learning_quiz_questions;

create policy learning_quiz_questions_select
on public.learning_quiz_questions
for select
to public
using (
  quiz_id in (select id from public.learning_quizzes)
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
);

create policy learning_quiz_questions_insert
on public.learning_quiz_questions
for insert
to public
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
);

create policy learning_quiz_questions_update
on public.learning_quiz_questions
for update
to public
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
);

create policy learning_quiz_questions_delete
on public.learning_quiz_questions
for delete
to public
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_hr'::public.app_role,
        'department_head'::public.app_role
      ])
  )
);

-- -----------------------------
-- training_assignment_rules
-- -----------------------------
drop policy if exists "Training rules manageable by admins" on public.training_assignment_rules;
drop policy if exists "Training rules viewable by admins" on public.training_assignment_rules;

create policy training_assignment_rules_select
on public.training_assignment_rules
for select
to public
using (
  (select auth.uid()) in (
    select ur.user_id
    from public.user_roles ur
    where ur.role = any (array[
      'regional_admin'::public.app_role,
      'regional_hr'::public.app_role,
      'property_manager'::public.app_role
    ])
  )
);

create policy training_assignment_rules_insert
on public.training_assignment_rules
for insert
to public
with check (
  (select auth.uid()) in (
    select ur.user_id
    from public.user_roles ur
    where ur.role = any (array[
      'regional_admin'::public.app_role,
      'regional_hr'::public.app_role,
      'property_manager'::public.app_role
    ])
  )
);

create policy training_assignment_rules_update
on public.training_assignment_rules
for update
to public
using (
  (select auth.uid()) in (
    select ur.user_id
    from public.user_roles ur
    where ur.role = any (array[
      'regional_admin'::public.app_role,
      'regional_hr'::public.app_role,
      'property_manager'::public.app_role
    ])
  )
)
with check (
  (select auth.uid()) in (
    select ur.user_id
    from public.user_roles ur
    where ur.role = any (array[
      'regional_admin'::public.app_role,
      'regional_hr'::public.app_role,
      'property_manager'::public.app_role
    ])
  )
);

create policy training_assignment_rules_delete
on public.training_assignment_rules
for delete
to public
using (
  (select auth.uid()) in (
    select ur.user_id
    from public.user_roles ur
    where ur.role = any (array[
      'regional_admin'::public.app_role,
      'regional_hr'::public.app_role,
      'property_manager'::public.app_role
    ])
  )
);

-- -----------------------------
-- document_categories
-- -----------------------------
drop policy if exists "Admins can manage categories" on public.document_categories;
drop policy if exists "Users can view all categories" on public.document_categories;

create policy document_categories_select
on public.document_categories
for select
to public
using ((select auth.role()) = 'authenticated'::text);

create policy document_categories_insert
on public.document_categories
for insert
to public
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_manager'::public.app_role,
        'property_hr'::public.app_role
      ])
  )
);

create policy document_categories_update
on public.document_categories
for update
to public
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_manager'::public.app_role,
        'property_hr'::public.app_role
      ])
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_manager'::public.app_role,
        'property_hr'::public.app_role
      ])
  )
);

create policy document_categories_delete
on public.document_categories
for delete
to public
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (array[
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role,
        'property_manager'::public.app_role,
        'property_hr'::public.app_role
      ])
  )
);

-- -----------------------------
-- document_feedback
-- -----------------------------
drop policy if exists "Users can manage own feedback" on public.document_feedback;
drop policy if exists "Users can view all feedback" on public.document_feedback;

create policy document_feedback_select
on public.document_feedback
for select
to public
using ((select auth.role()) = 'authenticated'::text);

create policy document_feedback_insert
on public.document_feedback
for insert
to public
with check ((select auth.uid()) = user_id);

create policy document_feedback_update
on public.document_feedback
for update
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy document_feedback_delete
on public.document_feedback
for delete
to public
using ((select auth.uid()) = user_id);;
