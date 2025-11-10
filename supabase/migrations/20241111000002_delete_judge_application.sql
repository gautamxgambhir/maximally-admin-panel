-- Function to delete a judge application
CREATE OR REPLACE FUNCTION delete_judge_application(
  application_id_param INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Delete associated events first (cascade)
  DELETE FROM judge_application_events
  WHERE application_id = application_id_param;

  -- Delete the application
  DELETE FROM judge_applications
  WHERE id = application_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Return success result
  result := json_build_object(
    'success', true,
    'message', 'Application deleted successfully'
  );

  RETURN result;
END;
$$;
