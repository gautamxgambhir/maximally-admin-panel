-- Create people table for managing team members
CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role_in_company VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('advisors', 'organizing_board', 'developers', 'alumni')),
    image_url TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    github_url TEXT,
    website_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_people_category ON people(category);

-- Create an index on is_active for filtering active members
CREATE INDEX IF NOT EXISTS idx_people_active ON people(is_active);

-- Create an index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_people_display_order ON people(display_order);

-- Enable Row Level Security (RLS)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin panel access)
CREATE POLICY "Allow all operations for authenticated users" ON people
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow public read access for the main website
CREATE POLICY "Allow public read access" ON people
    FOR SELECT USING (is_active = true);