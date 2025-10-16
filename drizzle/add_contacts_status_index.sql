-- Add index for fast filtering by status
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts (status);