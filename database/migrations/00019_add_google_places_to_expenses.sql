-- Add Google Places data to expenses
-- These columns store the selected Google Place for an expense.
-- All nullable — Google Place is optional.

ALTER TABLE expenses
  ADD COLUMN google_place_id TEXT,
  ADD COLUMN google_place_name TEXT,
  ADD COLUMN google_place_address TEXT,
  ADD COLUMN google_place_lat NUMERIC(10,7),
  ADD COLUMN google_place_lng NUMERIC(11,7);

-- Index for looking up expenses by place (e.g., future "places directory" feature)
CREATE INDEX idx_expenses_google_place ON expenses (google_place_id)
  WHERE google_place_id IS NOT NULL;
