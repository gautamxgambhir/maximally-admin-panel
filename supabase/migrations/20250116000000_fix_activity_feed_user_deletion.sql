-- Fix foreign key constraint to allow user deletion
-- This migration updates the admin_activity_feed table to set actor_id to NULL
-- when a user is deleted from auth.users, instead of blocking the deletion

-- Drop the existing foreign key constraint
ALTER TABLE public.admin_activity_feed 
DROP CONSTRAINT IF EXISTS admin_activity_feed_actor_id_fkey;

-- Recreate the constraint with ON DELETE SET NULL
-- This allows user deletion while preserving the activity history
ALTER TABLE public.admin_activity_feed 
ADD CONSTRAINT admin_activity_feed_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Add comment explaining the behavior
COMMENT ON CONSTRAINT admin_activity_feed_actor_id_fkey ON public.admin_activity_feed IS 
'Foreign key to auth.users with ON DELETE SET NULL to preserve activity history when users are deleted';
//////////////////////////////////////////////////////////////////////////////////////////////////////////