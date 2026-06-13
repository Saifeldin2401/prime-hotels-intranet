create policy "allow_certificate_history_insert"
on "public"."certificate_history"
as permissive
for insert
to authenticated
with check ((auth.uid() = performed_by));;
