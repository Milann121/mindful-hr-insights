-- Create function to sync pain areas from user_assessments to user_profiles
CREATE OR REPLACE FUNCTION public.sync_pain_areas_to_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user_profiles with aggregated pain areas from all assessments for this user
  INSERT INTO public.user_profiles (user_id, pain_area, updated_at)
  SELECT 
    NEW.user_id,
    string_agg(DISTINCT pain_area, ', ' ORDER BY pain_area),
    NOW()
  FROM public.user_assessments 
  WHERE user_id = NEW.user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    pain_area = (
      SELECT string_agg(DISTINCT pain_area, ', ' ORDER BY pain_area)
      FROM public.user_assessments 
      WHERE user_id = NEW.user_id
    ),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync pain areas when assessments are created or updated
CREATE TRIGGER sync_pain_areas_trigger
  AFTER INSERT OR UPDATE ON public.user_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_pain_areas_to_profiles();

-- Manually sync existing data
INSERT INTO public.user_profiles (user_id, pain_area, updated_at)
SELECT 
  user_id,
  string_agg(DISTINCT pain_area, ', ' ORDER BY pain_area),
  NOW()
FROM public.user_assessments 
GROUP BY user_id
ON CONFLICT (user_id) 
DO UPDATE SET 
  pain_area = EXCLUDED.pain_area,
  updated_at = EXCLUDED.updated_at;