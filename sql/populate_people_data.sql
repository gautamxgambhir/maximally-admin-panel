-- Insert sample data for people table
INSERT INTO people (name, role_in_company, company, description, category, display_order, is_active) VALUES

-- Advisors
('John Smith', 'Senior Tech Advisor', 'TechCorp Inc.', 'Former CTO with 15+ years of experience in scaling technology companies. Expertise in cloud architecture and team leadership.', 'advisors', 1, true),
('Sarah Johnson', 'Business Strategy Advisor', 'Innovation Partners', 'Serial entrepreneur with 3 successful exits. Specializes in go-to-market strategies and product-market fit.', 'advisors', 2, true),
('Dr. Michael Chen', 'AI Research Advisor', 'MIT Labs', 'Leading AI researcher with 50+ published papers. Expert in machine learning and neural networks.', 'advisors', 3, true),

-- Organizing Board
('Emily Rodriguez', 'Executive Director', 'Maximally', 'Oversees all operations and strategic initiatives. Background in event management and startup ecosystems.', 'organizing_board', 1, true),
('David Kim', 'Technical Director', 'Maximally', 'Leads technical infrastructure and hackathon platform development. Full-stack developer with DevOps expertise.', 'organizing_board', 2, true),
('Lisa Wang', 'Community Manager', 'Maximally', 'Builds and nurtures our developer community. Expert in community engagement and social media strategy.', 'organizing_board', 3, true),
('Alex Thompson', 'Partnerships Director', 'Maximally', 'Manages sponsor relationships and corporate partnerships. Former business development manager at tech startups.', 'organizing_board', 4, true),

-- Developers
('Jake Martinez', 'Lead Frontend Developer', 'Maximally', 'React and TypeScript expert building our web platform. Previously worked at major tech companies.', 'developers', 1, true),
('Priya Patel', 'Backend Engineer', 'Maximally', 'Node.js and database specialist. Handles API development and server infrastructure.', 'developers', 2, true),
('Tom Wilson', 'DevOps Engineer', 'Maximally', 'Manages CI/CD pipelines and cloud infrastructure. Expert in AWS and containerization.', 'developers', 3, true),
('Anna Kowalski', 'UI/UX Designer', 'Maximally', 'Designs user interfaces and experiences across all our platforms. Background in product design.', 'developers', 4, true),

-- Alumni
('Ryan Brooks', 'Software Engineer', 'Google', 'Former organizing team member, now working at Google. Helped establish our judging criteria and mentor program.', 'alumni', 1, true),
('Maria Gonzalez', 'Product Manager', 'Startup Inc.', 'Previous developer on our team, now PM at a successful startup she co-founded after participating in our hackathon.', 'alumni', 2, true),
('Kevin Lee', 'Data Scientist', 'Meta', 'Former community manager who moved on to become a data scientist. Still mentors participants in our events.', 'alumni', 3, true),
('Sophie Turner', 'Founder & CEO', 'InnovateTech', 'One of our first hackathon winners who built her company from her winning project. Regular speaker at our events.', 'alumni', 4, true);

-- Update the updated_at timestamp to match created_at for initial data
UPDATE people SET updated_at = created_at WHERE updated_at = created_at;