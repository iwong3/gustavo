-- Migration 002: Flexible Data Schema
-- Adds tables for dynamic data storage and visualization

-- Table to define custom data collections (like custom tables)
CREATE TABLE data_collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    -- Schema definition stored as JSONB
    schema_definition JSONB NOT NULL DEFAULT '{}',
    -- UI configuration for visualization
    ui_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store the actual flexible data
CREATE TABLE data_records (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER REFERENCES data_collections(id) ON DELETE CASCADE,
    -- All flexible data stored as JSONB
    data JSONB NOT NULL DEFAULT '{}',
    -- Optional metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better JSONB query performance
CREATE INDEX idx_data_records_collection_id ON data_records(collection_id);
CREATE INDEX idx_data_records_data_gin ON data_records USING GIN (data);
CREATE INDEX idx_data_collections_name ON data_collections(name);

-- Example: Create a sample data collection for "Project Tracking"
INSERT INTO data_collections (name, description, schema_definition, ui_config) VALUES (
    'project_tracking',
    'Track project progress and tasks',
    '{
        "fields": [
            {
                "name": "project_name",
                "type": "string",
                "required": true,
                "label": "Project Name"
            },
            {
                "name": "status",
                "type": "select",
                "options": ["planning", "in_progress", "completed", "on_hold"],
                "required": true,
                "label": "Status"
            },
            {
                "name": "priority",
                "type": "select",
                "options": ["low", "medium", "high", "critical"],
                "required": true,
                "label": "Priority"
            },
            {
                "name": "due_date",
                "type": "date",
                "required": false,
                "label": "Due Date"
            },
            {
                "name": "budget",
                "type": "number",
                "required": false,
                "label": "Budget ($)"
            },
            {
                "name": "team_members",
                "type": "array",
                "required": false,
                "label": "Team Members"
            },
            {
                "name": "notes",
                "type": "text",
                "required": false,
                "label": "Notes"
            }
        ]
    }',
    '{
        "defaultView": "table",
        "allowedViews": ["table", "kanban", "chart"],
        "chartTypes": ["bar", "pie", "line"],
        "groupBy": ["status", "priority"],
        "sortBy": "due_date"
    }'
);

-- Example: Insert sample data for the project tracking collection
INSERT INTO data_records (collection_id, data) VALUES (
    (SELECT id FROM data_collections WHERE name = 'project_tracking'),
    '{
        "project_name": "Website Redesign",
        "status": "in_progress", 
        "priority": "high",
        "due_date": "2024-02-15",
        "budget": 15000,
        "team_members": ["Alice", "Bob", "Charlie"],
        "notes": "Focus on mobile responsiveness and SEO optimization"
    }'
),
(
    (SELECT id FROM data_collections WHERE name = 'project_tracking'),
    '{
        "project_name": "Database Migration",
        "status": "planning",
        "priority": "medium", 
        "due_date": "2024-03-01",
        "budget": 8000,
        "team_members": ["David", "Eve"],
        "notes": "Migrate from MySQL to PostgreSQL"
    }'
);

-- Example: Create another collection for "Customer Feedback"
INSERT INTO data_collections (name, description, schema_definition, ui_config) VALUES (
    'customer_feedback',
    'Collect and analyze customer feedback',
    '{
        "fields": [
            {
                "name": "customer_name", 
                "type": "string",
                "required": true,
                "label": "Customer Name"
            },
            {
                "name": "rating",
                "type": "number",
                "min": 1,
                "max": 5,
                "required": true,
                "label": "Rating (1-5)"
            },
            {
                "name": "feedback_type",
                "type": "select",
                "options": ["bug_report", "feature_request", "general", "complaint"],
                "required": true,
                "label": "Feedback Type"
            },
            {
                "name": "description",
                "type": "text",
                "required": true,
                "label": "Feedback Description"
            },
            {
                "name": "contact_email",
                "type": "email", 
                "required": false,
                "label": "Contact Email"
            },
            {
                "name": "follow_up_needed",
                "type": "boolean",
                "required": false,
                "label": "Follow-up Required"
            }
        ]
    }',
    '{
        "defaultView": "table",
        "allowedViews": ["table", "chart"],
        "chartTypes": ["bar", "pie"],
        "groupBy": ["rating", "feedback_type"],
        "sortBy": "created_at"
    }'
); 