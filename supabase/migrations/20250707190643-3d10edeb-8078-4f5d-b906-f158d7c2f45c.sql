-- Create table to track weekly goal completions
CREATE TABLE public.weekly_goal_completions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    goal_target INTEGER NOT NULL,
    exercises_completed INTEGER NOT NULL DEFAULT 0,
    goal_met BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure one record per user per week
    UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.weekly_goal_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own weekly goal completions" 
ON public.weekly_goal_completions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly goal completions" 
ON public.weekly_goal_completions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly goal completions" 
ON public.weekly_goal_completions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "HR managers can view their company's weekly goal completions" 
ON public.weekly_goal_completions 
FOR SELECT 
USING (
    is_hr_manager(auth.uid()) AND 
    user_id IN (
        SELECT be.user_id 
        FROM b2b_employees be 
        WHERE be.b2b_partner_id = get_user_b2b_partner_id(auth.uid())
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_weekly_goal_completions_updated_at
    BEFORE UPDATE ON public.weekly_goal_completions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update/insert weekly goal completion
CREATE OR REPLACE FUNCTION public.update_weekly_goal_completion(
    target_user_id UUID,
    target_week_start DATE,
    target_week_end DATE
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to update weekly goal completions for all users for a given week
CREATE OR REPLACE FUNCTION public.update_all_weekly_goal_completions(
    target_week_start DATE DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    week_start DATE;
    week_end DATE;
BEGIN
    -- Default to current week if not specified
    IF target_week_start IS NULL THEN
        week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    ELSE
        week_start := target_week_start;
    END IF;
    
    week_end := week_start + 6;
    
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
$$;