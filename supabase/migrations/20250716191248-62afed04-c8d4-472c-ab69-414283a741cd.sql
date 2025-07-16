-- Clean up duplicate weekly goal completion records
-- First, create a temporary table to identify duplicates
CREATE TEMP TABLE duplicate_weekly_completions AS
SELECT user_id, week_start_date, week_end_date, 
       COUNT(*) as duplicate_count,
       MIN(id) as keep_id
FROM weekly_goal_completions
GROUP BY user_id, week_start_date, week_end_date
HAVING COUNT(*) > 1;

-- Delete the duplicate records, keeping only the oldest one
DELETE FROM weekly_goal_completions 
WHERE id IN (
  SELECT wgc.id 
  FROM weekly_goal_completions wgc
  INNER JOIN duplicate_weekly_completions dwc 
    ON wgc.user_id = dwc.user_id 
    AND wgc.week_start_date = dwc.week_start_date 
    AND wgc.week_end_date = dwc.week_end_date
  WHERE wgc.id != dwc.keep_id
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE weekly_goal_completions 
ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_start_date, week_end_date);

-- Update the update_weekly_goal_completion function to handle conflicts
CREATE OR REPLACE FUNCTION public.update_weekly_goal_completion(target_user_id uuid, target_week_start date, target_week_end date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_weekly_goal INTEGER;
    completed_exercises INTEGER;
    goal_achieved BOOLEAN;
BEGIN
    -- Get user's current weekly goal
    SELECT weekly_exercises_goal INTO user_weekly_goal
    FROM public.user_goals
    WHERE user_id = target_user_id 
      AND goal_type = 'weekly_exercise'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no goal set, exit
    IF user_weekly_goal IS NULL THEN
        RETURN;
    END IF;
    
    -- Count unique days with exercise completions in this week
    SELECT COUNT(DISTINCT DATE(clicked_at)) INTO completed_exercises
    FROM public.exercise_completion_clicks
    WHERE user_id = target_user_id
      AND is_active = true
      AND DATE(clicked_at) >= target_week_start
      AND DATE(clicked_at) <= target_week_end;
    
    -- Determine if goal was met
    goal_achieved := completed_exercises >= user_weekly_goal;
    
    -- Upsert the completion record with conflict resolution
    INSERT INTO public.weekly_goal_completions (
        user_id,
        week_start_date,
        week_end_date,
        goal_target,
        exercises_completed,
        goal_met,
        updated_at
    ) VALUES (
        target_user_id,
        target_week_start,
        target_week_end,
        user_weekly_goal,
        completed_exercises,
        goal_achieved,
        now()
    )
    ON CONFLICT (user_id, week_start_date, week_end_date)
    DO UPDATE SET
        goal_target = EXCLUDED.goal_target,
        exercises_completed = EXCLUDED.exercises_completed,
        goal_met = EXCLUDED.goal_met,
        updated_at = now();
END;
$function$;

-- Update the update_all_weekly_goal_completions function to use proper week boundaries
CREATE OR REPLACE FUNCTION public.update_all_weekly_goal_completions(target_week_start date DEFAULT NULL::date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_record RECORD;
    week_start DATE;
    week_end DATE;
BEGIN
    -- Default to current week if not specified (Monday to Sunday)
    IF target_week_start IS NULL THEN
        week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '1 day'; -- Monday
    ELSE
        week_start := target_week_start;
    END IF;
    
    week_end := week_start + INTERVAL '6 days'; -- Sunday
    
    -- Process all users with weekly exercise goals
    FOR user_record IN 
        SELECT DISTINCT user_id
        FROM public.user_goals
        WHERE goal_type = 'weekly_exercise'
    LOOP
        PERFORM public.update_weekly_goal_completion(
            user_record.user_id,
            week_start,
            week_end
        );
    END LOOP;
END;
$function$;