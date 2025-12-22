-- Enterprise RBAC Demo Seeds
-- Admin Account: admin@tamuu.id / password123
-- User Account: user@tamuu.id / password123

INSERT INTO users (id, email, password_hash, name, role, plan, is_verified, created_at, updated_at)
VALUES 
('admin-uuid-001', 'admin@tamuu.id', '01b04b43fdc28fdba0100ac516c7fbf302c880ef572202659f9bc71891e5bdf8', 'Tamuu Admin', 'admin', 'priority', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('user-uuid-001', 'user@tamuu.id', '01b04b43fdc28fdba0100ac516c7fbf302c880ef572202659f9bc71891e5bdf8', 'Demo User', 'user', 'free', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
