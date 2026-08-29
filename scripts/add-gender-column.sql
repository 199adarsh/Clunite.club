-- Add gender column to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender VARCHAR(50);

-- Add comment to the column
COMMENT ON COLUMN users.gender IS 'User gender (male, female, other, prefer-not-to-say)';

-- Optional: Create an index if you plan to filter by gender frequently
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);

