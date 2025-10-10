-- Fix people table structure
-- This script handles potential issues with the people table

-- If is_active column exists but doesn't have a default, set one
-- This is needed in case the column exists from previous setup
DO $$
BEGIN
    -- Check if is_active column exists and add default if it does
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'people' 
        AND column_name = 'is_active'
    ) THEN
        -- Set default value for is_active column
        ALTER TABLE people ALTER COLUMN is_active SET DEFAULT true;
        
        -- Update any null values to true
        UPDATE people SET is_active = true WHERE is_active IS NULL;
    END IF;
    
    -- Ensure all required columns exist with proper defaults
    -- These should already exist from the create_people_table.sql script
    
    -- Make sure display_order has a default
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'people' 
        AND column_name = 'display_order'
    ) THEN
        ALTER TABLE people ALTER COLUMN display_order SET DEFAULT 0;
        UPDATE people SET display_order = 0 WHERE display_order IS NULL;
    END IF;
    
END $$;