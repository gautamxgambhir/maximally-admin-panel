-- Migrate existing admins from profiles.role='admin' to the new admin_roles table
-- This ensures backward compatibility with users who were admins before the new system

-- Insert existing admins into admin_roles table
-- They will be given 'admin' role (not super_admin) with standard admin permissions
INSERT INTO public.admin_roles (user_id, role, permissions, created_at, updated_at)
SELECT 
  p.id as user_id,
  'admin' as role,
  '{
    "can_ban_users": true,
    "can_export_data": true,
    "can_delete_users": false,
    "can_manage_queue": true,
    "can_manage_admins": false,
    "can_moderate_users": true,
    "can_edit_hackathons": true,
    "can_view_audit_logs": true,
    "can_access_analytics": true,
    "can_delete_hackathons": false,
    "can_reject_hackathons": true,
    "can_revoke_organizers": true,
    "can_approve_hackathons": true,
    "can_feature_hackathons": true,
    "can_send_announcements": true,
    "can_unpublish_hackathons": true
  }'::jsonb as permissions,
  NOW() as created_at,
  NOW() as updated_at
FROM public.profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = p.id
  );

-- Optional: Promote the first admin to super_admin (uncomment and set the email)
-- UPDATE public.admin_roles 
-- SET role = 'super_admin',
--     permissions = '{
--       "can_ban_users": true,
--       "can_export_data": true,
--       "can_delete_users": true,
--       "can_manage_queue": true,
--       "can_manage_admins": true,
--       "can_moderate_users": true,
--       "can_edit_hackathons": true,
--       "can_view_audit_logs": true,
--       "can_access_analytics": true,
--       "can_delete_hackathons": true,
--       "can_reject_hackathons": true,
--       "can_revoke_organizers": true,
--       "can_approve_hackathons": true,
--       "can_feature_hackathons": true,
--       "can_send_announcements": true,
--       "can_unpublish_hackathons": true
--     }'::jsonb
-- WHERE user_id = (SELECT id FROM profiles WHERE email = 'your-email@example.com');

-- Log the migration
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM public.admin_roles;
  RAISE NOTICE 'Migrated % admins to admin_roles table', migrated_count;
END $$;
