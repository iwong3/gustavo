-- Migration 00006: create_expense_participants
-- Created: 2026-03-04

CREATE TABLE expense_participants (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expense_id  BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id),

    UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX idx_expense_participants_user_id ON expense_participants(user_id);
