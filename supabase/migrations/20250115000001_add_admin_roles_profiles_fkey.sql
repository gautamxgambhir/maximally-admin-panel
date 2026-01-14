-- Add foreign key from admin_roles.user_id to profiles.id
-- This enables Supabase to automatically join admin_roles with profiles

-- First, ensure all existing admin_roles have corresponding profiles
-- (This should already be the case since profiles are created on user signup)

-- Add the foreign key constraint
ALTER TABLE public.admin_roles
ADD CONSTRAINT admin_roles_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add a comment explaining the relationship
COMMENT ON CONSTRAINT admin_roles_user_id_profiles_fkey ON public.admin_roles IS 
'Links admin_roles to profiles for Supabase auto-join support. user_id references both auth.users and profiles.';
    