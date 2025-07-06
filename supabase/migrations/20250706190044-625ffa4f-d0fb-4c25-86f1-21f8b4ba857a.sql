-- Create function to calculate average pain level per department
CREATE OR REPLACE FUNCTION public.calculate_department_avg_pain_level(target_b2b_partner_id bigint)
RETURNS TABLE(
  department_id uuid,
  department_name text,
  avg_pain_level numeric,
  employee_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH department_employees AS (
    SELECT 
      cd.id as dept_id,
      cd.department_name as dept_name,
      up.user_id,
      up.pain_level_initial,
      up.pain_level_followup
    FROM company_departments cd
    LEFT JOIN user_profiles up ON cd.id = up.department_id
    WHERE cd.b2b_partner_id = target_b2b_partner_id
  ),
  pain_levels AS (
    SELECT 
      dept_id,
      dept_name,
      user_id,
      CASE 
        WHEN pain_level_followup IS NOT NULL THEN pain_level_followup
        ELSE pain_level_initial
      END as current_pain_level
    FROM department_employees
    WHERE user_id IS NOT NULL
  )
  SELECT 
    pl.dept_id,
    pl.dept_name,
    ROUND(AVG(pl.current_pain_level), 2) as avg_pain,
    COUNT(pl.user_id) as emp_count
  FROM pain_levels pl
  WHERE pl.current_pain_level IS NOT NULL
  GROUP BY pl.dept_id, pl.dept_name
  
  UNION ALL
  
  -- Include departments with no employees or no pain data
  SELECT 
    cd.id,
    cd.department_name,
    NULL::numeric,
    COUNT(up.user_id)
  FROM company_departments cd
  LEFT JOIN user_profiles up ON cd.id = up.department_id
  WHERE cd.b2b_partner_id = target_b2b_partner_id
    AND cd.id NOT IN (
      SELECT dept_id FROM pain_levels pl GROUP BY pl.dept_id
    )
  GROUP BY cd.id, cd.department_name;
END;
$function$

-- Create table to store daily pain level trends
CREATE TABLE IF NOT EXISTS public.department_pain_trends (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid NOT NULL,
  b2b_partner_id bigint NOT NULL,
  avg_pain_level numeric,
  trend_direction text, -- 'increase', 'decrease', 'no_change'
  calculated_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(department_id, calculated_date)
);

-- Enable RLS on department_pain_trends
ALTER TABLE public.department_pain_trends ENABLE ROW LEVEL SECURITY;

-- Create policy for HR managers to view their company's trends
CREATE POLICY "HR managers can view their company's pain trends"
ON public.department_pain_trends
FOR SELECT
USING (
  is_hr_manager(auth.uid()) 
  AND b2b_partner_id = get_user_b2b_partner_id(auth.uid())
);

-- Create function to calculate and store daily trends
CREATE OR REPLACE FUNCTION public.update_department_pain_trends()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  partner_record RECORD;
  dept_record RECORD;
  current_avg numeric;
  previous_avg numeric;
  trend_dir text;
BEGIN
  -- Loop through all B2B partners
  FOR partner_record IN 
    SELECT DISTINCT b2b_partner FROM hr_managers WHERE b2b_partner IS NOT NULL
  LOOP
    -- Calculate current averages for this partner's departments
    FOR dept_record IN 
      SELECT * FROM calculate_department_avg_pain_level(partner_record.b2b_partner)
      WHERE avg_pain_level IS NOT NULL
    LOOP
      current_avg := dept_record.avg_pain_level;
      
      -- Get previous day's average
      SELECT avg_pain_level INTO previous_avg
      FROM department_pain_trends
      WHERE department_id = dept_record.department_id 
        AND calculated_date = CURRENT_DATE - INTERVAL '1 day'
      ORDER BY calculated_date DESC
      LIMIT 1;
      
      -- Determine trend direction
      IF previous_avg IS NULL THEN
        trend_dir := 'no_change';
      ELSIF current_avg > previous_avg THEN
        trend_dir := 'increase';
      ELSIF current_avg < previous_avg THEN
        trend_dir := 'decrease';
      ELSE
        trend_dir := 'no_change';
      END IF;
      
      -- Insert or update today's record
      INSERT INTO department_pain_trends (
        department_id, 
        b2b_partner_id, 
        avg_pain_level, 
        trend_direction,
        calculated_date
      )
      VALUES (
        dept_record.department_id,
        partner_record.b2b_partner,
        current_avg,
        trend_dir,
        CURRENT_DATE
      )
      ON CONFLICT (department_id, calculated_date)
      DO UPDATE SET
        avg_pain_level = EXCLUDED.avg_pain_level,
        trend_direction = EXCLUDED.trend_direction,
        created_at = now();
    END LOOP;
  END LOOP;
END;
$function$