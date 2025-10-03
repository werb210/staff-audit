-- Insert default tenant
INSERT INTO tenants (id, name, domain, is_active) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'default.localhost', true)
ON CONFLICT (id) DO NOTHING;

-- Insert default business  
INSERT INTO businesses (id, business_name, business_type, industry, tenant_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Business', 'LLC', 'Technology', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- Insert default user
INSERT INTO users (id, email, first_name, last_name, role, tenant_id, username, password_hash)
VALUES ('00000000-0000-0000-0000-000000000001', 'default@system.local', 'Default', 'User', 'client', '00000000-0000-0000-0000-000000000000', 'default', 'placeholder')
ON CONFLICT (id) DO NOTHING;
