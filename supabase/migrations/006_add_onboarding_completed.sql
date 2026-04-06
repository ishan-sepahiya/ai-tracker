-- Add onboarding_completed column to profiles table
ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX idx_profiles_onboarding_completed ON profiles(onboarding_completed);
