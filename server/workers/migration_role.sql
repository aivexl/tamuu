-- Enterprise Migration: Add RBAC Role to Users
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));
