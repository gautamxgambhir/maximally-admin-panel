-- Function to reject a judge application
CREATE OR REPLACE FUNCTION reject_judge_application(
  application_id_param INTEGER,
  rejection_reason_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update application status to rejected
  UPDATE judge_applications
  SET 
    status = 'rejected',
    rejection_reason = rejection_reason_param,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = application_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Return success result
  result := json_build_object(
    'success', true,
    'message', 'Application rejected successfully'
  );

  RETURN result;
END;
$$;
