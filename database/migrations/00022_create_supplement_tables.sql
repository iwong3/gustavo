-- Supplement definitions + daily logging

CREATE TABLE supplements (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    dosage      TEXT,                           -- '5g', '400mg', '2 capsules', free text
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

-- Unique name per user (among non-deleted)
CREATE UNIQUE INDEX idx_supplements_user_name
    ON supplements (user_id, name) WHERE deleted_at IS NULL;

CREATE TABLE supplement_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    supplement_id   BIGINT NOT NULL REFERENCES supplements(id),
    date            DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

-- Prevent double-logging same supplement on same day
CREATE UNIQUE INDEX idx_supplement_logs_unique
    ON supplement_logs (user_id, supplement_id, date);

-- Indexes
CREATE INDEX idx_supplements_user ON supplements (user_id);
CREATE INDEX idx_supplements_active
    ON supplements (user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplement_logs_user_date ON supplement_logs (user_id, date);
CREATE INDEX idx_supplement_logs_supplement ON supplement_logs (supplement_id);

-- updated_at triggers
CREATE TRIGGER set_supplements_updated_at
    BEFORE UPDATE ON supplements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_supplement_logs_updated_at
    BEFORE UPDATE ON supplement_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit triggers
CREATE TRIGGER audit_supplements
    AFTER INSERT OR UPDATE OR DELETE ON supplements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_supplement_logs
    AFTER INSERT OR UPDATE OR DELETE ON supplement_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
