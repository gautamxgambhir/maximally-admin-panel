-- Migration: Allow admins to manage user roles via a function
-- This bypasses RLS to avoid infinite recursion issues

-- First, let's ensure RLS is enabled on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON profiles;

-- Allow users to read their own profile (this is safe and won't cause recursion)
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile (except role field)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create a function that admins can call to update user roles
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS profiles AS $$
DECLARE
  current_user_role TEXT;
  updated_profile profiles;
BEGIN
  -- Get the current user's role (this query is allowed because it's SECURITY DEFINER)
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Check if current user is admin
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  -- Validate the new role
  IF new_role NOT IN ('user', 'admin', 'judge') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Update the target user's role
  UPDATE profiles
  SET role = new_role,
      updated_at = NOW()
  WHERE id = target_user_id
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get profile by email (for admins)
CREATE OR REPLACE FUNCTION get_profile_by_email(
  target_email TEXT
)
RETURNS profiles AS $$
DECLARE
  current_user_role TEXT;
  target_profile profiles;
BEGIN
  -- Get the current user's role
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Check if current user is admin
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can look up profiles by email';
  END IF;

  -- Get the target profile
  SELECT * INTO target_profile
  FROM profiles
  WHERE email = target_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for email: %', target_email;
  END IF;

  RETURN target_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_by_email(TEXT) TO authenticated;
