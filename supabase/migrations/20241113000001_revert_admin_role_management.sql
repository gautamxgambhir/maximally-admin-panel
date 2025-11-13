-- Revert Migration: Remove admin role management functions and policies that cause 500 errors

-- Drop the functions
DROP FUNCTION IF EXISTS get_profile_by_email(TEXT);
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT);

-- Drop the problematic policies that cause recursion (500 errors)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile role" ON profiles;

-- Drop any policies we may have created
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- The existing policies should be sufficient:
-- - "allow_read_all_profiles" allows everyone to read profiles
-- - "allow_update_own_profile" allows users to update their own profile
-- - "allow_insert_own_profile" allows users to insert their own profile
-- - "allow_delete_own_profile" allows users to delete their own profile
