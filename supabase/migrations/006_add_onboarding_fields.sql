-- Add onboarding tracking fields to profiles table
ALTER TABLE profiles
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN selected_plan VARCHAR(50);

-- Create index for onboarding_completed for faster queries
CREATE INDEX idx_profiles_onboarding_completed ON profiles(onboarding_completed);
