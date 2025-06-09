# Database Schema Planning

```
users (
    id: UUID PRIMARY KEY,
    email: TEXT UNIQUE NOT NULL,
    name: TEXT,
    role: TEXT,
    created_at: TIMESTAMPTZ DEFAULT NOW(),
    updated_at: TIMESTAMPTZ DEFAULT NOW(),
    deleted_at: TIMESTAMPTZ NULL
)

tables (
  id: UUID PRIMARY KEY,
  name: TEXT NOT NULL,
  description: TEXT,
  category_id: UUID REFERENCES table_categories(id) ON DELETE SET NULL,
  is_private: BOOLEAN DEFAULT FALSE, -- for future "only viewable to me" feature
  created_by: UUID REFERENCES users(id),
  created_at: TIMESTAMPTZ DEFAULT NOW(),
  updated_at: TIMESTAMPTZ DEFAULT NOW(),
  deleted_at: TIMESTAMPTZ NULL
)

table_categories (
  id: UUID PRIMARY KEY,
  name: TEXT NOT NULL,
  description: TEXT,
  created_by: UUID REFERENCES users(id),
  created_at: TIMESTAMPTZ DEFAULT NOW(),
  updated_at: TIMESTAMPTZ DEFAULT NOW(),
  deleted_at: TIMESTAMPTZ NULL
)

columns (
  id: UUID PRIMARY KEY,
  table_id: UUID REFERENCES tables(id),
  name: TEXT NOT NULL,
  data_type: TEXT,
  validation_rules: JSONB, -- e.g. is_required, dropdown_options
  created_by: UUID REFERENCES users(id),
  created_at: TIMESTAMPTZ DEFAULT NOW(),
  updated_at: TIMESTAMPTZ DEFAULT NOW(),
  version: INTEGER DEFAULT 1, -- for optimistic locking
  deleted_at: TIMESTAMPTZ NULL
)

records (
  id: UUID PRIMARY KEY,
  table_id: UUID REFERENCES tables(id),
  data: JSONB NOT NULL, -- stores { key: value } pairs { column.id: value }
  created_by: UUID REFERENCES users(id),
  created_at: TIMESTAMPTZ DEFAULT NOW(),
  updated_at: TIMESTAMPTZ DEFAULT NOW(),
  version: INTEGER DEFAULT 1, -- for optimistic locking
  deleted_at: TIMESTAMPTZ NULL
)

record_logs (
  id: UUID PRIMARY KEY,
  record_id: UUID REFERENCES records(id),
  table_id: UUID REFERENCES tables(id),
  previous_data: JSONB, -- only store the changed fields, not entire record
  changed_by: UUID REFERENCES users(id),
  created_at: TIMESTAMPTZ DEFAULT NOW()
)

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tables_created_by ON tables(created_by);
CREATE INDEX idx_columns_table_id ON columns(table_id);
CREATE INDEX idx_records_table_id ON records(table_id);
CREATE INDEX idx_record_logs_record_id ON record_logs(record_id);
CREATE INDEX idx_record_logs_table_id ON record_logs(table_id);
```

## To Do

-   [ ] File uploads
    -   [ ] If we can't get a cheap option for S3, can we use Google Photos?
