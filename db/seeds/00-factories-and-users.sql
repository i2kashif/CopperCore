-- CopperCore ERP - Seed Data: Factories and Users
-- Creates 2 test factories and users with proper roles

-- Clear existing data
TRUNCATE TABLE user_factory_links CASCADE;
TRUNCATE TABLE factories CASCADE;
TRUNCATE TABLE users CASCADE;

-- Insert test factories
INSERT INTO factories (id, code, name, address, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'FAC1', 'Main Plant - Karachi', 'Industrial Area, Karachi, Pakistan', true),
('550e8400-e29b-41d4-a716-446655440002', 'FAC2', 'Secondary Plant - Lahore', 'Industrial Area, Lahore, Pakistan', true);

-- Insert test users with hashed passwords (password is "password123" for all)
-- Password hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewruI/4uVqZY.z5i (bcrypt of "password123")
INSERT INTO users (id, username, password_hash, full_name, email, role, is_active) VALUES 
('110e8400-e29b-41d4-a716-446655440001', 'ceo', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewruI/4uVqZY.z5i', 'Chief Executive Officer', 'ceo@coppercore.com', 'CEO', true),
('110e8400-e29b-41d4-a716-446655440002', 'director', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewruI/4uVqZY.z5i', 'Managing Director', 'director@coppercore.com', 'Director', true),
('110e8400-e29b-41d4-a716-446655440003', 'fm1', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewruI/4uVqZY.z5i', 'Factory Manager - FAC1', 'fm1@coppercore.com', 'Factory Manager', true),
('110e8400-e29b-41d4-a716-446655440004', 'fm2', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewruI/4uVqZY.z5i', 'Factory Manager - FAC2', 'fm2@coppercore.com', 'Factory Manager', true),
('110e8400-e29b-41d4-a716-446655440005', 'office1', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewruI/4uVqZY.z5i', 'Office Worker - FAC1', 'office1@coppercore.com', 'Office', true);

-- Assign users to factories
INSERT INTO user_factory_links (user_id, factory_id) VALUES 
-- CEO and Director have access to all factories (handled by RLS, but we'll add explicit links for consistency)
('110e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001'),
('110e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'),
('110e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),
('110e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002'),
-- Factory Managers assigned to specific factories
('110e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001'),
('110e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002'),
-- Office worker assigned to FAC1
('110e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001');