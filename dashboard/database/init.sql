-- Optional database initialization script
-- TypeORM migrations will handle schema creation in the backend
-- This file can be used for additional setup like extensions, roles, etc.

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database user if needed (docker-compose handles this)
-- This is a placeholder for any additional database setup
