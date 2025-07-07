-- Update get_week_of_month function to use Sunday-based weeks
CREATE OR REPLACE FUNCTION public.get_week_of_month(target_date date, target_month_year date)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  first_sunday DATE;
  days_diff INTEGER;
  week_number INTEGER;
BEGIN
  -- Get the first day of the target month
  first_sunday := DATE_TRUNC('month', target_month_year)::DATE;
  
  -- Find the first Sunday of the month (or the Sunday before if month doesn't start on Sunday)
  first_sunday := first_sunday - EXTRACT(DOW FROM first_sunday)::INTEGER;
  IF first_sunday > DATE_TRUNC('month', target_month_year)::DATE THEN
    first_sunday := first_sunday - 7;
  END IF;
  
  -- Calculate which week the target date falls into
  days_diff := target_date - first_sunday;
  week_number := (days_diff / 7) + 1;
  
  -- Handle fifth week logic: if week spans months, it belongs to the previous month
  IF week_number = 5 AND target_date >= DATE_TRUNC('month', target_month_year + INTERVAL '1 month')::DATE THEN
    -- This is actually the first week of next month, return NULL for this month
    RETURN NULL;
  END IF;
  
  -- If the date is before the target month, it might be a fifth week of previous month
  IF target_date < DATE_TRUNC('month', target_month_year)::DATE THEN
    RETURN 5; -- Fifth week of previous month
  END IF;
  
  RETURN LEAST(week_number, 5);
END;
$function$;

-- Update update_weekly_exercise_goals_for_month function to use Sunday-based weeks
CREATE OR REPLACE FUNCTION public.update_weekly_exercise_goals_for_month(target_user_id uuid, target_month_year date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  week_start DATE;
  week_end DATE;
  week_num INTEGER;
  completion_pct NUMERIC;
  first_week_pct NUMERIC := NULL;
  second_week_pct NUMERIC := NULL;
  third_week_pct NUMERIC := NULL;
  fourth_week_pct NUMERIC := NULL;
  fifth_week_pct NUMERIC := NULL;
BEGIN
  -- Calculate first day of month
  target_month_year := DATE_TRUNC('month', target_month_year)::DATE;
  
  -- Find the first Sunday of the month (or the Sunday before)
  week_start := target_month_year - EXTRACT(DOW FROM target_month_year)::INTEGER;
  IF week_start > target_month_year THEN
    week_start := week_start - 7;
  END IF;
  
  -- Process up to 5 weeks
  FOR i IN 1..5 LOOP
    week_end := week_start + 6;
    
    -- Check if this week belongs to this month
    week_num := public.get_week_of_month(week_start, target_month_year);
    
    IF week_num IS NOT NULL THEN
      -- Calculate completion percentage for this week
      completion_pct := public.calculate_weekly_completion_percentage(
        target_user_id, 
        week_start, 
        week_end
      );
      
      -- Assign to appropriate week variable
      CASE week_num
        WHEN 1 THEN first_week_pct := completion_pct;
        WHEN 2 THEN second_week_pct := completion_pct;
        WHEN 3 THEN third_week_pct := completion_pct;
        WHEN 4 THEN fourth_week_pct := completion_pct;
        WHEN 5 THEN fifth_week_pct := completion_pct;
      END CASE;
    END IF;
    
    -- Move to next week (Sunday to Sunday)
    week_start := week_start + 7;
  END LOOP;
  
  -- Upsert the record
  INSERT INTO public.user_weekly_exercise_goals (
    user_id,
    goal_type,
    month_year,
    first_month_week,
    second_month_week,
    third_month_week,
    fourth_month_week,
    fifth_month_week,
    updated_at
  )
  VALUES (
    target_user_id,
    'weekly_exercise',
    target_month_year,
    first_week_pct,
    second_week_pct,
    third_week_pct,
    fourth_week_pct,
    fifth_week_pct,
    now()
  )
  ON CONFLICT (user_id, month_year, goal_type)
  DO UPDATE SET
    first_month_week = EXCLUDED.first_month_week,
    second_month_week = EXCLUDED.second_month_week,
    third_month_week = EXCLUDED.third_month_week,
    fourth_month_week = EXCLUDED.fourth_month_week,
    fifth_month_week = EXCLUDED.fifth_month_week,
    updated_at = now();
END;
$function$;