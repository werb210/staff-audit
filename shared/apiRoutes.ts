export const API_ROOT = "/api" as const;

export const AUTH_BASE_PATH = `${API_ROOT}/auth` as const;
export const AUTH_SESSION_ENDPOINT = `${AUTH_BASE_PATH}/session` as const;

export const TWILIO_BASE_PATH = `${API_ROOT}/twilio` as const;
export const TWILIO_TOKEN_ENDPOINT = `${TWILIO_BASE_PATH}/token` as const;

export const COMMUNICATIONS_BASE_PATH = `${API_ROOT}/communications` as const;

export const DOCUMENTS_BASE_PATH = `${API_ROOT}/documents` as const;

export const PIPELINE_BASE_PATH = `${API_ROOT}/pipeline` as const;

export const ANALYTICS_BASE_PATH = `${API_ROOT}/analytics` as const;
export const CLIENT_BASE_PATH = `${API_ROOT}/client` as const;
export const STAFF_BASE_PATH = `${API_ROOT}/staff` as const;
export const ADMIN_CODEX_BASE_PATH = `${API_ROOT}/admin/codex` as const;
