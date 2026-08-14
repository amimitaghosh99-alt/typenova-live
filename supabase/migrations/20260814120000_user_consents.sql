-- Create the legally required consent audit trail table
CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agreed_at TIMESTAMPTZ NOT NULL,
    legal_version TEXT NOT NULL,
    scope JSONB NOT NULL,
    consent_method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Create a unique constraint so a user can't have duplicate records for the same version
    UNIQUE(user_id, legal_version)
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own consent records
CREATE POLICY "Users can insert their own consent"
    ON public.user_consents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own consent records (so the client knows if it's already recorded)
CREATE POLICY "Users can view their own consent"
    ON public.user_consents
    FOR SELECT
    USING (auth.uid() = user_id);

-- Explicitly DO NOT create UPDATE or DELETE policies.
-- This ensures the audit trail is immutable!
