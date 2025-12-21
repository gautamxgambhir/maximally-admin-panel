-- Fix the target_audience constraint to allow 'public' value for hackathon announcements
-- This enables public announcements that are visible to everyone on the website

-- First, drop the existing constraint
ALTER TABLE hackathon_announcements DROP CONSTRAINT IF EXISTS hackathon_announcements_target_audience_check;

-- Add the new constraint that includes 'public'
ALTER TABLE hackathon_announcements ADD CONSTRAINT hackathon_announcements_target_audience_check 
CHECK (target_audience IN ('all', 'confirmed', 'waitlist', 'teams', 'individuals', 'public'));