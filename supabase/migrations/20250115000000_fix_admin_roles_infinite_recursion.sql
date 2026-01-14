-- Fix infinite recursion in admin_roles RLS policies
-- The issue: policies on admin_roles query admin_roles itself, causing infinite recursion

-- Step 1: Drop the existing is_admin() function (no args) to avoid conflicts
DROP FUNCTION IF EXISTS public.is_admin();

-- Step 2: Create a SECURITY DEFINER function to check if user is super_admin
-- This bypasses RLS and breaks the recursion cycle
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = user_uuid
    AND role = 'super_admin'
  );
$$;

-- Step 3: Create a function to check if user is any admin (in admin_roles table)
CREATE OR REPLACE FUNCTION public.is_admin_role(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = user_uuid
  );
$$;

-- Step 4: Recreate is_admin() with SECURITY DEFINER to check profiles table (original behavior)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- Step 5: Create a function to check admin permissions
CREATE OR REPLACE FUNCTION public.admin_has_permission(permission_key text, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = user_uuid
    AND (permissions->>permission_key)::boolean = true
  );
$$;

-- Step 6: Drop existing problematic policies on admin_roles
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can view their own role" ON public.admin_roles;

-- Step 7: Recreate policies using the SECURITY DEFINER functions
-- Policy for super admins to manage all roles (uses function to avoid recursion)
CREATE POLICY "Super admins can manage all roles" ON public.admin_roles
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Policy for admins to view their own role (simple check, no recursion)
CREATE POLICY "Admins can view their own role" ON public.admin_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Step 8: Update other policies that reference admin_roles to use the helper functions
-- This improves performance and prevents potential recursion issues

-- Update admin_activity_feed policy
DROP POLICY IF EXISTS "Admins can view activity feed" ON public.admin_activity_feed;
CREATE POLICY "Admins can view activity feed" ON public.admin_activity_feed
  FOR SELECT
  USING (public.is_admin_role(auth.uid()));

-- Update admin_audit_logs policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT
  USING (public.admin_has_permission('can_view_audit_logs', auth.uid()));

-- Grant execute permissions on the helper functions
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_has_permission(text, uuid) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.is_super_admin IS 'Check if user is a super_admin. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
COMMENT ON FUNCTION public.is_admin_role IS 'Check if user has any admin role in admin_roles table. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
COMMENT ON FUNCTION public.admin_has_permission IS 'Check if admin user has a specific permission. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
