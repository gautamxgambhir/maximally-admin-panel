-- Function to delete a judge and revert their profile role
CREATE OR REPLACE FUNCTION delete_judge_with_profile_update(
  judge_id_param INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  judge_username TEXT;
  result JSON;
BEGIN
  -- Get the judge's username
  SELECT username INTO judge_username
  FROM judges
  WHERE id = judge_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Judge not found';
  END IF;

  -- Delete associated judge events
  DELETE FROM judge_events
  WHERE judge_id = judge_id_param;

  -- Delete the judge
  DELETE FROM judges
  WHERE id = judge_id_param;

  -- Update the user's profile role back to 'user'
  UPDATE profiles
  SET role = 'user',
      updated_at = NOW()
  WHERE username = judge_username;

  -- Return success result
  result := json_build_object(
    'success', true,
    'username', judge_username,
    'message', 'Judge deleted and profile role reverted to user'
  );

  RETURN result;
END;
$$;
