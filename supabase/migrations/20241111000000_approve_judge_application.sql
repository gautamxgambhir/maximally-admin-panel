-- Function to approve a judge application
-- This function atomically creates a judge from an application
CREATE OR REPLACE FUNCTION approve_judge_application(
  application_id_param INTEGER,
  tier_param TEXT DEFAULT 'starter'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record RECORD;
  new_judge_id INTEGER;
  result JSON;
BEGIN
  -- Get the application
  SELECT * INTO app_record
  FROM judge_applications
  WHERE id = application_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Check if already approved
  IF app_record.status = 'approved' THEN
    RAISE EXCEPTION 'Application has already been approved';
  END IF;

  -- Check if judge already exists with this username or email
  IF EXISTS (
    SELECT 1 FROM judges 
    WHERE username = app_record.username OR email = app_record.email
  ) THEN
    RAISE EXCEPTION 'A judge with this username or email already exists';
  END IF;

  -- Insert into judges table (let the database auto-generate the ID)
  INSERT INTO judges (
    username,
    full_name,
    profile_photo,
    headline,
    short_bio,
    judge_location,
    role_title,
    company,
    primary_expertise,
    secondary_expertise,
    total_events_judged,
    total_teams_evaluated,
    total_mentorship_hours,
    years_of_experience,
    average_feedback_rating,
    linkedin,
    github,
    twitter,
    website,
    languages_spoken,
    public_achievements,
    mentorship_statement,
    availability_status,
    tier,
    is_published,
    email,
    phone,
    resume,
    proof_of_judging,
    timezone,
    calendar_link,
    compensation_preference,
    judge_references,
    conflict_of_interest,
    agreed_to_nda,
    address
  )
  VALUES (
    app_record.username,
    app_record.full_name,
    app_record.profile_photo,
    app_record.headline,
    app_record.short_bio,
    app_record.judge_location,
    app_record.role_title,
    app_record.company,
    app_record.primary_expertise,
    app_record.secondary_expertise,
    app_record.total_events_judged,
    app_record.total_teams_evaluated,
    app_record.total_mentorship_hours,
    app_record.years_of_experience,
    app_record.average_feedback_rating,
    app_record.linkedin,
    app_record.github,
    app_record.twitter,
    app_record.website,
    app_record.languages_spoken,
    app_record.public_achievements,
    app_record.mentorship_statement,
    app_record.availability_status,
    tier_param,
    true, -- is_published
    app_record.email,
    app_record.phone,
    app_record.resume,
    app_record.proof_of_judging,
    app_record.timezone,
    app_record.calendar_link,
    app_record.compensation_preference,
    app_record.judge_references,
    app_record.conflict_of_interest,
    app_record.agreed_to_nda,
    app_record.address
  )
  RETURNING id INTO new_judge_id;

  -- Copy application events to judge events
  INSERT INTO judge_events (
    judge_id,
    event_name,
    event_role,
    event_date,
    event_link,
    verified
  )
  SELECT
    new_judge_id,
    event_name,
    event_role,
    event_date,
    event_link,
    verified
  FROM judge_application_events
  WHERE application_id = application_id_param;

  -- Update application status
  UPDATE judge_applications
  SET 
    status = 'approved',
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = application_id_param;

  -- Update user profile role if exists
  UPDATE profiles
  SET role = 'judge'
  WHERE username = app_record.username;

  -- Return success result
  result := json_build_object(
    'success', true,
    'judge_id', new_judge_id,
    'username', app_record.username,
    'message', 'Application approved successfully'
  );

  RETURN result;
END;
$$;
