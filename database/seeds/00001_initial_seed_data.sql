-- Seed Data 00001: Initial sample data for table management system

-- Insert sample users
INSERT INTO users (id, email, name, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@example.com', 'Admin User', 'admin'),
    ('550e8400-e29b-41d4-a716-446655440002', 'user@example.com', 'Regular User', 'user'),
    ('550e8400-e29b-41d4-a716-446655440003', 'manager@example.com', 'Manager User', 'manager');

-- Insert sample categories
INSERT INTO table_categories (id, name, description, created_by) VALUES 
    ('650e8400-e29b-41d4-a716-446655440001', 'Project Management', 'Tables for managing projects and tasks', '550e8400-e29b-41d4-a716-446655440001'),
    ('650e8400-e29b-41d4-a716-446655440002', 'Customer Relations', 'Tables for customer data and feedback', '550e8400-e29b-41d4-a716-446655440001'),
    ('650e8400-e29b-41d4-a716-446655440003', 'Inventory Management', 'Tables for tracking inventory and supplies', '550e8400-e29b-41d4-a716-446655440002'),
    ('650e8400-e29b-41d4-a716-446655440004', 'Finance', 'Tables for financial tracking and reporting', '550e8400-e29b-41d4-a716-446655440003');

-- Insert sample tables
INSERT INTO tables (id, name, description, category_id, is_private, created_by) VALUES 
    ('750e8400-e29b-41d4-a716-446655440001', 'Projects', 'Track all company projects', '650e8400-e29b-41d4-a716-446655440001', false, '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440002', 'Tasks', 'Individual tasks and assignments', '650e8400-e29b-41d4-a716-446655440001', false, '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440003', 'Customers', 'Customer information and contacts', '650e8400-e29b-41d4-a716-446655440002', false, '550e8400-e29b-41d4-a716-446655440002'),
    ('750e8400-e29b-41d4-a716-446655440004', 'Feedback', 'Customer feedback and reviews', '650e8400-e29b-41d4-a716-446655440002', false, '550e8400-e29b-41d4-a716-446655440002'),
    ('750e8400-e29b-41d4-a716-446655440005', 'Personal Notes', 'Private notes and reminders', null, true, '550e8400-e29b-41d4-a716-446655440002');

-- Insert columns for Projects table
INSERT INTO columns (id, table_id, name, data_type, validation_rules, created_by) VALUES 
    ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'name', 'text', '{"required": true, "max_length": 255}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 'status', 'select', '{"required": true, "options": ["planning", "in_progress", "completed", "on_hold"]}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440001', 'priority', 'select', '{"required": true, "options": ["low", "medium", "high", "critical"]}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440001', 'due_date', 'date', '{"required": false}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440001', 'budget', 'number', '{"required": false, "min": 0}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440001', 'description', 'textarea', '{"required": false, "max_length": 1000}', '550e8400-e29b-41d4-a716-446655440001');

-- Insert columns for Tasks table
INSERT INTO columns (id, table_id, name, data_type, validation_rules, created_by) VALUES 
    ('850e8400-e29b-41d4-a716-446655440007', '750e8400-e29b-41d4-a716-446655440002', 'title', 'text', '{"required": true, "max_length": 255}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440008', '750e8400-e29b-41d4-a716-446655440002', 'project_id', 'reference', '{"required": false, "reference_table": "750e8400-e29b-41d4-a716-446655440001"}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440009', '750e8400-e29b-41d4-a716-446655440002', 'assignee', 'text', '{"required": false}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440010', '750e8400-e29b-41d4-a716-446655440002', 'status', 'select', '{"required": true, "options": ["todo", "in_progress", "review", "done"]}', '550e8400-e29b-41d4-a716-446655440001'),
    ('850e8400-e29b-41d4-a716-446655440011', '750e8400-e29b-41d4-a716-446655440002', 'estimated_hours', 'number', '{"required": false, "min": 0}', '550e8400-e29b-41d4-a716-446655440001');

-- Insert columns for Customers table
INSERT INTO columns (id, table_id, name, data_type, validation_rules, created_by) VALUES 
    ('850e8400-e29b-41d4-a716-446655440012', '750e8400-e29b-41d4-a716-446655440003', 'company_name', 'text', '{"required": true, "max_length": 255}', '550e8400-e29b-41d4-a716-446655440002'),
    ('850e8400-e29b-41d4-a716-446655440013', '750e8400-e29b-41d4-a716-446655440003', 'contact_person', 'text', '{"required": true, "max_length": 255}', '550e8400-e29b-41d4-a716-446655440002'),
    ('850e8400-e29b-41d4-a716-446655440014', '750e8400-e29b-41d4-a716-446655440003', 'email', 'email', '{"required": true}', '550e8400-e29b-41d4-a716-446655440002'),
    ('850e8400-e29b-41d4-a716-446655440015', '750e8400-e29b-41d4-a716-446655440003', 'phone', 'text', '{"required": false}', '550e8400-e29b-41d4-a716-446655440002'),
    ('850e8400-e29b-41d4-a716-446655440016', '750e8400-e29b-41d4-a716-446655440003', 'industry', 'select', '{"required": false, "options": ["technology", "healthcare", "finance", "retail", "manufacturing", "other"]}', '550e8400-e29b-41d4-a716-446655440002');

-- Insert sample records for Projects table
INSERT INTO records (id, table_id, data, created_by) VALUES 
    ('950e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 
     '{"850e8400-e29b-41d4-a716-446655440001": "Website Redesign", "850e8400-e29b-41d4-a716-446655440002": "in_progress", "850e8400-e29b-41d4-a716-446655440003": "high", "850e8400-e29b-41d4-a716-446655440004": "2024-03-15", "850e8400-e29b-41d4-a716-446655440005": "15000", "850e8400-e29b-41d4-a716-446655440006": "Complete overhaul of company website with modern design"}', 
     '550e8400-e29b-41d4-a716-446655440001'),
    ('950e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 
     '{"850e8400-e29b-41d4-a716-446655440001": "Database Migration", "850e8400-e29b-41d4-a716-446655440002": "planning", "850e8400-e29b-41d4-a716-446655440003": "medium", "850e8400-e29b-41d4-a716-446655440004": "2024-04-01", "850e8400-e29b-41d4-a716-446655440005": "8000", "850e8400-e29b-41d4-a716-446655440006": "Migrate from old system to new table management platform"}', 
     '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample records for Tasks table
INSERT INTO records (id, table_id, data, created_by) VALUES 
    ('950e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440002', 
     '{"850e8400-e29b-41d4-a716-446655440007": "Design mockups", "850e8400-e29b-41d4-a716-446655440008": "950e8400-e29b-41d4-a716-446655440001", "850e8400-e29b-41d4-a716-446655440009": "Alice", "850e8400-e29b-41d4-a716-446655440010": "in_progress", "850e8400-e29b-41d4-a716-446655440011": "16"}', 
     '550e8400-e29b-41d4-a716-446655440001'),
    ('950e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440002', 
     '{"850e8400-e29b-41d4-a716-446655440007": "Setup development environment", "850e8400-e29b-41d4-a716-446655440008": "950e8400-e29b-41d4-a716-446655440002", "850e8400-e29b-41d4-a716-446655440009": "Bob", "850e8400-e29b-41d4-a716-446655440010": "todo", "850e8400-e29b-41d4-a716-446655440011": "8"}', 
     '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample records for Customers table
INSERT INTO records (id, table_id, data, created_by) VALUES 
    ('950e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440003', 
     '{"850e8400-e29b-41d4-a716-446655440012": "TechCorp Inc", "850e8400-e29b-41d4-a716-446655440013": "John Smith", "850e8400-e29b-41d4-a716-446655440014": "john@techcorp.com", "850e8400-e29b-41d4-a716-446655440015": "+1-555-0123", "850e8400-e29b-41d4-a716-446655440016": "technology"}', 
     '550e8400-e29b-41d4-a716-446655440002'),
    ('950e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440003', 
     '{"850e8400-e29b-41d4-a716-446655440012": "Healthcare Solutions", "850e8400-e29b-41d4-a716-446655440013": "Sarah Johnson", "850e8400-e29b-41d4-a716-446655440014": "sarah@healthsolutions.com", "850e8400-e29b-41d4-a716-446655440015": "+1-555-0456", "850e8400-e29b-41d4-a716-446655440016": "healthcare"}', 
     '550e8400-e29b-41d4-a716-446655440002'); 