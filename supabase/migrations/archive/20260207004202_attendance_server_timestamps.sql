-- Attendance server-side check-in/out for reliable timestamps

CREATE OR REPLACE FUNCTION public.attendance_check_in(p_notes TEXT DEFAULT NULL)
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.attendance;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance
    WHERE employee_id = auth.uid()
      AND date = current_date
      AND check_out IS NULL
  ) THEN
    RAISE EXCEPTION 'Already checked in';
  END IF;

  INSERT INTO public.attendance (employee_id, date, check_in, status, notes)
  VALUES (auth.uid(), current_date, now(), 'present', p_notes)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_check_out(p_attendance_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.attendance;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.attendance
  SET check_out = now(),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_attendance_id
    AND employee_id = auth.uid()
    AND check_out IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Attendance record not found or already checked out';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attendance_check_in(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_check_out(UUID, TEXT) TO authenticated;;
