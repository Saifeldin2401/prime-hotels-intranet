SELECT cron.unschedule(5);
SELECT cron.unschedule(6);

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.notifications,
  public.messages,
  public.requests,
  public.tasks,
  public.user_dashboard_preferences,
  public.learning_assignment_exemptions,
  public.learning_assignment_user_overrides,
  public.training_progress,
  public.profiles,
  public.documents,
  public.document_department_access;
