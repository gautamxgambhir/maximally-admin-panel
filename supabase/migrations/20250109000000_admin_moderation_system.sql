-- Admin Moderation System Migration
-- Requirements: 5.1, 5.3, 2.1, 6.1, 6.5, 9.1, 9.2, 3.6, 7.5, 1.2, 1.3

-- ============================================================================
-- 1.1 Admin Audit Logs Table (Immutable)
-- Requirements: 5.1, 5.3 - Comprehensive audit trail for all admin actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action_type);

-- Add comment explaining immutability requirement
COMMENT ON TABLE public.admin_audit_logs IS 'Immutable audit log for all admin actions. Records should never be modified or deleted.';

-- ============================================================================
-- 1.2 Admin Activity Feed Table
-- Requirements: 2.1 - Real-time activity tracking with severity levels
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_username TEXT,
  actor_email TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for activity feed queries
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.admin_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON public.admin_activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_severity ON public.admin_activity_feed(severity);
CREATE INDEX IF NOT EXISTS idx_activity_feed_actor ON public.admin_activity_feed(actor_id);

COMMENT ON TABLE public.admin_activity_feed IS 'Real-time activity feed for monitoring platform events with severity levels.';


-- ============================================================================
-- 1.3 Moderation Queue Table
-- Requirements: 6.1, 6.5 - Priority-based queue with claiming mechanism
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('hackathon', 'user', 'project', 'report')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  title TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_data JSONB,
  report_count INTEGER DEFAULT 1,
  reporter_ids UUID[] DEFAULT '{}',
  claimed_by UUID REFERENCES auth.users(id),
  claimed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'resolved', 'dismissed')),
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for moderation queue queries
CREATE INDEX IF NOT EXISTS idx_mod_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_mod_queue_priority ON public.moderation_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_mod_queue_claimed ON public.moderation_queue(claimed_by);
CREATE INDEX IF NOT EXISTS idx_mod_queue_type ON public.moderation_queue(item_type);
CREATE INDEX IF NOT EXISTS idx_mod_queue_created ON public.moderation_queue(created_at DESC);

COMMENT ON TABLE public.moderation_queue IS 'Unified moderation queue with priority-based sorting and claim mechanism to prevent duplicate processing.';

-- ============================================================================
-- 1.4 Admin Roles Table with Permissions
-- Requirements: 9.1, 9.2 - Role-based access control
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer')),
  permissions JSONB NOT NULL DEFAULT '{
    "can_approve_hackathons": true,
    "can_reject_hackathons": true,
    "can_delete_hackathons": false,
    "can_edit_hackathons": false,
    "can_unpublish_hackathons": false,
    "can_feature_hackathons": false,
    "can_moderate_users": true,
    "can_ban_users": false,
    "can_delete_users": false,
    "can_manage_admins": false,
    "can_view_audit_logs": true,
    "can_export_data": false,
    "can_access_analytics": true,
    "can_send_announcements": false,
    "can_manage_queue": true,
    "can_revoke_organizers": false
  }',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);

COMMENT ON TABLE public.admin_roles IS 'Admin role assignments with granular permissions for access control.';


-- ============================================================================
-- 1.5 User Trust Scores Table
-- Requirements: 3.6 - Trust score calculation and storage for users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_trust_scores (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  factors JSONB NOT NULL DEFAULT '{
    "account_age_days": 0,
    "successful_hackathons": 0,
    "reports_received": 0,
    "reports_filed_valid": 0,
    "moderation_actions": 0,
    "verified_email": false
  }',
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for score-based queries
CREATE INDEX IF NOT EXISTS idx_user_trust_scores_score ON public.user_trust_scores(score);

COMMENT ON TABLE public.user_trust_scores IS 'User trust scores calculated from account age, hackathon participation, reports, and moderation history.';

-- ============================================================================
-- 1.5 Organizer Trust Scores Table
-- Requirements: 7.5 - Trust score calculation and storage for organizers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizer_trust_scores (
  organizer_id TEXT PRIMARY KEY,
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  factors JSONB NOT NULL DEFAULT '{
    "total_hackathons": 0,
    "approved_hackathons": 0,
    "rejected_hackathons": 0,
    "total_participants": 0,
    "violations": 0,
    "account_age_days": 0
  }',
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES auth.users(id),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for organizer trust score queries
CREATE INDEX IF NOT EXISTS idx_organizer_trust_scores_score ON public.organizer_trust_scores(score);
CREATE INDEX IF NOT EXISTS idx_organizer_trust_scores_flagged ON public.organizer_trust_scores(is_flagged) WHERE is_flagged = true;

COMMENT ON TABLE public.organizer_trust_scores IS 'Organizer trust scores with auto-flagging for those with multiple rejections or violations.';

-- ============================================================================
-- 1.6 Update organizer_hackathons Table
-- Requirements: 1.2, 1.3 - Add unpublished status, is_featured flag, internal_notes
-- ============================================================================

-- Add 'unpublished' to the status check constraint
ALTER TABLE public.organizer_hackathons 
DROP CONSTRAINT IF EXISTS organizer_hackathons_status_check;

ALTER TABLE public.organizer_hackathons 
ADD CONSTRAINT organizer_hackathons_status_check 
CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'ended', 'unpublished'));

-- Add is_featured column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizer_hackathons' 
    AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.organizer_hackathons ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add internal_notes column if not exists (for admin-only notes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizer_hackathons' 
    AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE public.organizer_hackathons ADD COLUMN internal_notes TEXT;
  END IF;
END $$;

-- Add unpublished_at timestamp for tracking when hackathon was unpublished
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizer_hackathons' 
    AND column_name = 'unpublished_at'
  ) THEN
    ALTER TABLE public.organizer_hackathons ADD COLUMN unpublished_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add unpublished_by to track which admin unpublished
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizer_hackathons' 
    AND column_name = 'unpublished_by'
  ) THEN
    ALTER TABLE public.organizer_hackathons ADD COLUMN unpublished_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add unpublish_reason for documenting why hackathon was unpublished
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizer_hackathons' 
    AND column_name = 'unpublish_reason'
  ) THEN
    ALTER TABLE public.organizer_hackathons ADD COLUMN unpublish_reason TEXT;
  END IF;
END $$;

-- Create index for featured hackathons
CREATE INDEX IF NOT EXISTS idx_hackathons_featured ON public.organizer_hackathons(is_featured) WHERE is_featured = true;

COMMENT ON COLUMN public.organizer_hackathons.is_featured IS 'Flag to mark hackathon as featured on the platform';
COMMENT ON COLUMN public.organizer_hackathons.internal_notes IS 'Internal admin notes not visible to organizers';
COMMENT ON COLUMN public.organizer_hackathons.unpublished_at IS 'Timestamp when hackathon was unpublished by admin';
COMMENT ON COLUMN public.organizer_hackathons.unpublished_by IS 'Admin who unpublished the hackathon';
COMMENT ON COLUMN public.organizer_hackathons.unpublish_reason IS 'Reason for unpublishing the hackathon';


-- ============================================================================
-- System Metrics Table (for health monitoring - supporting future requirements)
-- Requirements: 12.1 - System health monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON public.system_metrics(metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON public.system_metrics(metric_name, recorded_at DESC);

COMMENT ON TABLE public.system_metrics IS 'System metrics for health monitoring including API response times and error rates.';

-- ============================================================================
-- RLS Policies for Admin Tables
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Admin Audit Logs: Only admins can view, no one can modify/delete
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND (ar.permissions->>'can_view_audit_logs')::boolean = true
    )
  );

CREATE POLICY "System can insert audit logs" ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Admin Activity Feed: Admins can view and insert
CREATE POLICY "Admins can view activity feed" ON public.admin_activity_feed
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity feed" ON public.admin_activity_feed
  FOR INSERT
  WITH CHECK (true);

-- Moderation Queue: Admins can manage based on permissions
CREATE POLICY "Admins can view moderation queue" ON public.moderation_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND (ar.permissions->>'can_manage_queue')::boolean = true
    )
  );

CREATE POLICY "Admins can manage moderation queue" ON public.moderation_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND (ar.permissions->>'can_manage_queue')::boolean = true
    )
  );

-- Admin Roles: Only super_admins can manage, others can view their own
CREATE POLICY "Super admins can manage all roles" ON public.admin_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view their own role" ON public.admin_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- User Trust Scores: Admins can view and update
CREATE POLICY "Admins can view user trust scores" ON public.user_trust_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage user trust scores" ON public.user_trust_scores
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Organizer Trust Scores: Admins can view and update
CREATE POLICY "Admins can view organizer trust scores" ON public.organizer_trust_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage organizer trust scores" ON public.organizer_trust_scores
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- System Metrics: Admins can view, system can insert
CREATE POLICY "Admins can view system metrics" ON public.system_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert system metrics" ON public.system_metrics
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_moderation_queue_updated_at ON public.moderation_queue;
CREATE TRIGGER update_moderation_queue_updated_at
  BEFORE UPDATE ON public.moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_roles_updated_at ON public.admin_roles;
CREATE TRIGGER update_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Default Role Permissions by Role Type
-- ============================================================================

COMMENT ON COLUMN public.admin_roles.permissions IS 'JSON object containing granular permissions. Default permissions by role:
- super_admin: All permissions enabled
- admin: Most permissions except manage_admins and delete_users
- moderator: Basic moderation permissions (approve/reject hackathons, moderate users, manage queue)
- viewer: Read-only access to dashboard and analytics';
