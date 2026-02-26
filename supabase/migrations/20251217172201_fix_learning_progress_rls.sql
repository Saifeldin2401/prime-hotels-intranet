-- Allow admins and managers to manage learning progress for users
create policy "Admins can manage progress"
on learning_progress
for all
to public
using (
  can_manage_assignments(auth.uid())
);
;
