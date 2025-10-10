-- Add featured core team and judges columns to dashboard table
ALTER TABLE dashboard ADD COLUMN IF NOT EXISTS featured_core_id_1 INTEGER;
ALTER TABLE dashboard ADD COLUMN IF NOT EXISTS featured_core_id_2 INTEGER;
ALTER TABLE dashboard ADD COLUMN IF NOT EXISTS featured_core_id_3 INTEGER;
ALTER TABLE dashboard ADD COLUMN IF NOT EXISTS featured_judge_id_1 INTEGER;
ALTER TABLE dashboard ADD COLUMN IF NOT EXISTS featured_judge_id_2 INTEGER;
ALTER TABLE dashboard ADD COLUMN IF NOT EXISTS featured_judge_id_3 INTEGER;

-- Add foreign key constraints to ensure data integrity
ALTER TABLE dashboard ADD CONSTRAINT fk_featured_core_1 
    FOREIGN KEY (featured_core_id_1) REFERENCES people(id) ON DELETE SET NULL;
ALTER TABLE dashboard ADD CONSTRAINT fk_featured_core_2 
    FOREIGN KEY (featured_core_id_2) REFERENCES people(id) ON DELETE SET NULL;
ALTER TABLE dashboard ADD CONSTRAINT fk_featured_core_3 
    FOREIGN KEY (featured_core_id_3) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE dashboard ADD CONSTRAINT fk_featured_judge_1 
    FOREIGN KEY (featured_judge_id_1) REFERENCES judges(id) ON DELETE SET NULL;
ALTER TABLE dashboard ADD CONSTRAINT fk_featured_judge_2 
    FOREIGN KEY (featured_judge_id_2) REFERENCES judges(id) ON DELETE SET NULL;
ALTER TABLE dashboard ADD CONSTRAINT fk_featured_judge_3 
    FOREIGN KEY (featured_judge_id_3) REFERENCES judges(id) ON DELETE SET NULL;

-- Initialize the dashboard row if it doesn't exist
INSERT INTO dashboard (id) VALUES (1) ON CONFLICT (id) DO NOTHING;