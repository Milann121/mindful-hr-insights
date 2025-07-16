-- Fix the Weekly Goals Met calculation issues

-- 1. First, let's create a proper user record for the current HR manager if it doesn't exist
-- We need to ensure the HR manager is properly linked in the users table

-- 2. Update the get_user_b2b_partner_id function to be more robust
CREATE OR REPLACE FUNCTION public.get_user_b2b_partner_id(user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT CASE 
    WHEN u.user_type = 'hr_manager' THEN hm.b2b_partner
    WHEN u.user_type = 'employee' THEN be.b2b_partner_id
    ELSE 
      -- Fallback: try to find the user as HR manager directly
      COALESCE(
        (SELECT hm.b2b_partner FROM hr_managers hm WHERE hm.id = user_id),
        -- Or try to find as employee
        (SELECT be.b2b_partner_id FROM b2b_employees be WHERE be.user_id = user_id)
      )
  END
  FROM public.users u
  LEFT JOIN public.hr_managers hm ON u.hr_manager_id = hm.id
  LEFT JOIN public.b2b_employees be ON u.b2b_employee_id = be.id
  WHERE u.id = user_id;
$function$;

-- 3. Update the is_hr_manager function to be more robust
CREATE OR REPLACE FUNCTION public.is_hr_manager(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(
    (SELECT u.user_type = 'hr_manager' FROM public.users u WHERE u.id = user_id),
    -- Fallback: check if user exists directly in hr_managers table
    (SELECT true FROM public.hr_managers hm WHERE hm.id = user_id),
    false
  );
$function$;

-- 4. Update RLS policies to ensure HR managers can access their company's data
DROP POLICY IF EXISTS "HR managers can view their company's weekly goal completions" ON public.weekly_goal_completions;
CREATE POLICY "HR managers can view their company's weekly goal completions" 
ON public.weekly_goal_completions 
FOR SELECT 
USING (
  is_hr_manager(auth.uid()) AND 
  (user_id IN (
    SELECT be.user_id
    FROM b2b_employees be
    WHERE be.b2b_partner_id = get_user_b2b_partner_id(auth.uid())
    AND be.user_id IS NOT NULL
  ))
);

-- 5. Update the user_goals RLS policy to allow HR managers to see their company's goals
DROP POLICY IF EXISTS "HR managers can view their company's user goals" ON public.user_goals;
CREATE POLICY "HR managers can view their company's user goals" 
ON public.user_goals 
FOR SELECT 
USING (
  is_hr_manager(auth.uid()) AND 
  (user_id IN (
    SELECT be.user_id
    FROM b2b_employees be
    WHERE be.b2b_partner_id = get_user_b2b_partner_id(auth.uid())
    AND be.user_id IS NOT NULL
  ))
);

-- 6. Fix the exercise_completion_clicks table to ensure proper date handling
-- Update the update_weekly_goal_completion function to handle timezone issues
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
    -- Use DATE() to ensure we're comparing dates correctly
    SELECT COUNT(DISTINCT DATE(clicked_at)) INTO completed_exercises
    FROM public.exercise_completion_clicks
    WHERE user_id = target_user_id
      AND is_active = true
      AND DATE(clicked_at) >= target_week_start
      AND DATE(clicked_at) <= target_week_end;
    
    -- Determine if goal was met
    goal_achieved := completed_exercises >= user_weekly_goal;
    
    -- Upsert the completion record
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
    ON CONFLICT (user_id, week_start_date)
    DO UPDATE SET
        goal_target = EXCLUDED.goal_target,
        exercises_completed = EXCLUDED.exercises_completed,
        goal_met = EXCLUDED.goal_met,
        updated_at = now();
END;
$function$;