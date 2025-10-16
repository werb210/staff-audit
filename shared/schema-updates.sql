-- SQL for creating chat sessions and issue reports tables
-- These support the client-to-staff API integration

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  initial_message TEXT NOT NULL,
  priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  category VARCHAR(50) CHECK (category IN ('general_inquiry', 'application_help', 'technical_issue', 'complaint')) DEFAULT 'general_inquiry',
  status VARCHAR(20) CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Issue Reports Table
CREATE TABLE IF NOT EXISTS issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  reporter_email VARCHAR(255) NOT NULL,
  reporter_name VARCHAR(255) NOT NULL,
  issue_type VARCHAR(20) CHECK (issue_type IN ('bug', 'feature_request', 'complaint', 'other')) DEFAULT 'bug',
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(10) CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  browser_info TEXT,
  current_url TEXT,
  status VARCHAR(20) CHECK (status IN ('open', 'investigating', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_application_id ON chat_sessions(application_id);

CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_severity ON issue_reports(severity);
CREATE INDEX IF NOT EXISTS idx_issue_reports_created_at ON issue_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_issue_reports_application_id ON issue_reports(application_id);