-- Add updated_at column to hackathon_announcements table for tracking edits
ALTER TABLE hackathon_announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();