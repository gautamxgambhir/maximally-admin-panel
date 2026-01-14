-- Activity Feed Triggers Migration
-- Automatically log platform events to admin_activity_feed table

-- ============================================================================
-- Trigger: Log new user signups to activity feed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_user_signup_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_activity_feed (
    activity_type,
    actor_id,
    actor_username,
    actor_email,
    target_type,
    target_id,
    target_name,
    action,
    metadata,
    severity
  ) VALUES (
    'user_signup',
    NEW.id,
    NEW.username,
    NEW.email,
    'user',
    NEW.id::text,
    COALESCE(NEW.full_name, NEW.username, NEW.email),
    'New user signed up',
    jsonb_build_object(
      'role', NEW.role,
      'is_verified', NEW.is_verified
    ),
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_user_signup ON public.profiles;
CREATE TRIGGER trigger_log_user_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_signup_activity();

-- ============================================================================
-- Trigger: Log hackathon creation to activity feed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_hackathon_created_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_activity_feed (
    activity_type,
    actor_id,
    actor_username,
    actor_email,
    target_type,
    target_id,
    target_name,
    action,
    metadata,
    severity
  ) VALUES (
    'hackathon_created',
    NULL, -- organizer_id is text, not UUID
    NULL, -- no organizer_name column exists
    NEW.organizer_email,
    'hackathon',
    NEW.id::text,
    NEW.hackathon_name,
    'New hackathon created',
    jsonb_build_object(
      'status', NEW.status,
      'format', NEW.format,
      'organizer_id', NEW.organizer_id
    ),
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_hackathon_created ON public.organizer_hackathons;
CREATE TRIGGER trigger_log_hackathon_created
  AFTER INSERT ON public.organizer_hackathons
  FOR EACH ROW
  EXECUTE FUNCTION public.log_hackathon_created_activity();

-- ============================================================================
-- Trigger: Log hackathon status changes to activity feed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_hackathon_status_change_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_action TEXT;
  activity_severity TEXT;
BEGIN
  -- Only log if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine action and severity based on new status
  CASE NEW.status
    WHEN 'published' THEN
      activity_action := 'Hackathon published';
      activity_severity := 'info';
    WHEN 'pending_review' THEN
      activity_action := 'Hackathon submitted for review';
      activity_severity := 'info';
    WHEN 'rejected' THEN
      activity_action := 'Hackathon rejected';
      activity_severity := 'warning';
    WHEN 'unpublished' THEN
      activity_action := 'Hackathon unpublished';
      activity_severity := 'warning';
    WHEN 'ended' THEN
      activity_action := 'Hackathon ended';
      activity_severity := 'info';
    ELSE
      activity_action := 'Hackathon status changed to ' || NEW.status;
      activity_severity := 'info';
  END CASE;

  INSERT INTO public.admin_activity_feed (
    activity_type,
    actor_id,
    actor_username,
    actor_email,
    target_type,
    target_id,
    target_name,
    action,
    metadata,
    severity
  ) VALUES (
    'hackathon_' || NEW.status,
    NULL,
    NULL, -- no organizer_name column exists
    NEW.organizer_email,
    'hackathon',
    NEW.id::text,
    NEW.hackathon_name,
    activity_action,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'organizer_id', NEW.organizer_id
    ),
    activity_severity
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_hackathon_status_change ON public.organizer_hackathons;
CREATE TRIGGER trigger_log_hackathon_status_change
  AFTER UPDATE ON public.organizer_hackathons
  FOR EACH ROW
  EXECUTE FUNCTION public.log_hackathon_status_change_activity();

-- ============================================================================
-- Trigger: Log hackathon registrations to activity feed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_registration_activity()
RETURNS TRIGGER AS $$
DECLARE
  hackathon_name TEXT;
  user_name TEXT;
  user_email TEXT;
BEGIN
  -- Get hackathon name
  SELECT oh.hackathon_name INTO hackathon_name
  FROM public.organizer_hackathons oh
  WHERE oh.id = NEW.hackathon_id;

  -- Get user info if user_id exists
  IF NEW.user_id IS NOT NULL THEN
    SELECT p.full_name, p.email INTO user_name, user_email
    FROM public.profiles p
    WHERE p.id = NEW.user_id;
  ELSE
    user_name := NEW.full_name;
    user_email := NEW.email;
  END IF;

  INSERT INTO public.admin_activity_feed (
    activity_type,
    actor_id,
    actor_username,
    actor_email,
    target_type,
    target_id,
    target_name,
    action,
    metadata,
    severity
  ) VALUES (
    'registration_created',
    NEW.user_id,
    user_name,
    user_email,
    'registration',
    NEW.id::text,
    hackathon_name,
    'User registered for hackathon',
    jsonb_build_object(
      'hackathon_id', NEW.hackathon_id,
      'hackathon_name', hackathon_name,
      'registration_status', NEW.status
    ),
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_registration ON public.hackathon_registrations;
CREATE TRIGGER trigger_log_registration
  AFTER INSERT ON public.hackathon_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_registration_activity();

-- ============================================================================
-- Trigger: Log team formation to activity feed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_team_formed_activity()
RETURNS TRIGGER AS $$
DECLARE
  hackathon_name TEXT;
BEGIN
  -- Get hackathon name
  SELECT oh.hackathon_name INTO hackathon_name
  FROM public.organizer_hackathons oh
  WHERE oh.id = NEW.hackathon_id;

  INSERT INTO public.admin_activity_feed (
    activity_type,
    actor_id,
    actor_username,
    actor_email,
    target_type,
    target_id,
    target_name,
    action,
    metadata,
    severity
  ) VALUES (
    'team_formed',
    NULL, -- team_leader_id is text, not UUID
    NEW.team_name,
    NULL,
    'team',
    NEW.id::text,
    NEW.team_name,
    'New team formed',
    jsonb_build_object(
      'hackathon_id', NEW.hackathon_id,
      'hackathon_name', hackathon_name,
      'team_name', NEW.team_name,
      'team_leader_id', NEW.team_leader_id
    ),
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_team_formed ON public.hackathon_teams;
CREATE TRIGGER trigger_log_team_formed
  AFTER INSERT ON public.hackathon_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.log_team_formed_activity();

-- ============================================================================
-- Trigger: Log submission creation to activity feed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_submission_activity()
RETURNS TRIGGER AS $$
DECLARE
  hackathon_name TEXT;
  team_name TEXT;
BEGIN
  -- Get hackathon name
  SELECT oh.hackathon_name INTO hackathon_name
  FROM public.organizer_hackathons oh
  WHERE oh.id = NEW.hackathon_id;

  -- Get team name if exists
  IF NEW.team_id IS NOT NULL THEN
    SELECT ht.team_name INTO team_name
    FROM public.hackathon_teams ht
    WHERE ht.id = NEW.team_id;
  END IF;

  INSERT INTO public.admin_activity_feed (
    activity_type,
    actor_id,
    actor_username,
    actor_email,
    target_type,
    target_id,
    target_name,
    action,
    metadata,
    severity
  ) VALUES (
    'submission_created',
    NULL, -- user_id is text, not UUID
    COALESCE(team_name, NEW.project_name),
    NULL,
    'submission',
    NEW.id::text,
    NEW.project_name,
    'New project submitted',
    jsonb_build_object(
      'hackathon_id', NEW.hackathon_id,
      'hackathon_name', hackathon_name,
      'project_name', NEW.project_name,
      'team_id', NEW.team_id,
      'team_name', team_name,
      'user_id', NEW.user_id
    ),
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_submission ON public.hackathon_submissions;
CREATE TRIGGER trigger_log_submission
  AFTER INSERT ON public.hackathon_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_submission_activity();

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

-- Allow the triggers to insert into admin_activity_feed
GRANT INSERT ON public.admin_activity_feed TO authenticated;
GRANT INSERT ON public.admin_activity_feed TO service_role;
