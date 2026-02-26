drop policy "HR can manage assignments" on "public"."learning_assignments";

create policy "HR can manage assignments"
on "public"."learning_assignments"
as permissive
for all
to authenticated
using (
  (
    has_role(auth.uid(), 'regional_admin'::text) OR 
    has_role(auth.uid(), 'regional_hr'::text) OR 
    (
      (
        has_role(auth.uid(), 'property_manager'::text) OR 
        has_role(auth.uid(), 'property_hr'::text) OR 
        has_role(auth.uid(), 'department_manager'::text)
      ) AND (
        (assigned_by = auth.uid()) OR 
        (
          (target_type = 'property'::learning_target_type) AND 
          has_property_access(auth.uid(), (target_id)::uuid)
        ) OR 
        (
          (target_type = 'department'::learning_target_type) AND 
          (EXISTS ( SELECT 1 FROM departments d WHERE ((d.id = (learning_assignments.target_id)::uuid) AND has_property_access(auth.uid(), d.property_id))))
        ) OR 
        (
          EXISTS ( SELECT 1 FROM (user_properties up_me JOIN user_properties up_creator ON ((up_me.property_id = up_creator.property_id))) WHERE ((up_me.user_id = auth.uid()) AND (up_creator.user_id = learning_assignments.assigned_by)))
        )
      )
    )
  )
);;
