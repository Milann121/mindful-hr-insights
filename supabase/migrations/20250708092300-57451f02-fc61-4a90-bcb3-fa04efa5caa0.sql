-- Add updated_at column to follow_up_responses table
ALTER TABLE public.follow_up_responses 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to have updated_at = created_at
UPDATE public.follow_up_responses 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after updating existing records
ALTER TABLE public.follow_up_responses 
ALTER COLUMN updated_at SET NOT NULL;

-- Create trigger to update updated_at on follow_up_responses
CREATE TRIGGER update_follow_up_responses_updated_at
BEFORE UPDATE ON public.follow_up_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to sync user_program_tracking when follow-up is created
CREATE OR REPLACE FUNCTION public.sync_program_tracking_on_followup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user_program_tracking with latest follow-up data
  UPDATE public.user_program_tracking 
  SET 
    pain_level_followup = NEW.pain_level,
    updated_at = NEW.updated_at
  WHERE assessment_id = NEW.assessment_id
    AND user_id = NEW.user_id;
    
  RETURN NEW;
END;
$$;

-- Create trigger to sync program tracking when follow-up is created or updated
CREATE TRIGGER sync_program_tracking_on_followup_trigger
AFTER INSERT OR UPDATE ON public.follow_up_responses
FOR EACH ROW
EXECUTE FUNCTION public.sync_program_tracking_on_followup();