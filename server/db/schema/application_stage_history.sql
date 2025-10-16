-- Application Stage History Table
-- Tracks automatic and manual stage changes for audit trail

CREATE TABLE IF NOT EXISTS application_stage_history (
  id VARCHAR(255) PRIMARY KEY,
  application_id VARCHAR(255) NOT NULL,
  previous_stage VARCHAR(50),
  new_stage VARCHAR(50) NOT NULL,
  reason TEXT,
  changed_by VARCHAR(255) DEFAULT 'system',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stage_history_app_id ON application_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_changed_at ON application_stage_history(changed_at);

-- Ensure applications table has stage column
ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'New';