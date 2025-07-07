-- Fix the calculate_department_avg_pain_level function to use correct tables and columns
CREATE OR REPLACE FUNCTION public.calculate_department_avg_pain_level(target_b2b_partner_id bigint)
RETURNS TABLE(
  department_id uuid,
  department_name text,
  avg_pain_level numeric,
  employee_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH department_employees AS (
    SELECT 
      cd.id as dept_id,
      cd.department_name as dept_name,
      up.user_id
    FROM company_departments cd
    LEFT JOIN user_profiles up ON cd.id = up.department_id
    WHERE cd.b2b_partner_id = target_b2b_partner_id
  ),
  user_pain_levels AS (
    SELECT 
      de.dept_id,
      de.dept_name,
      de.user_id,
      COALESCE(
        -- First try to get the latest follow-up response pain level
        (SELECT fr.pain_level 
         FROM follow_up_responses fr 
         WHERE fr.user_id = de.user_id 
         ORDER BY fr.created_at DESC 
         LIMIT 1),
        -- Then try to get ended pain level from program tracking
        (SELECT upt.pain_level_ended 
         FROM user_program_tracking upt 
         WHERE upt.user_id = de.user_id 
           AND upt.pain_level_ended IS NOT NULL
         ORDER BY upt.updated_at DESC 
         LIMIT 1),
        -- Finally fall back to initial pain level
        (SELECT upt.initial_pain_level 
         FROM user_program_tracking upt 
         WHERE upt.user_id = de.user_id 
           AND upt.initial_pain_level IS NOT NULL
         ORDER BY upt.created_at DESC 
         LIMIT 1)
      ) as current_pain_level
    FROM department_employees de
    WHERE de.user_id IS NOT NULL
  )
  SELECT 
    upl.dept_id,
    upl.dept_name,
    ROUND(AVG(upl.current_pain_level), 2) as avg_pain,
    COUNT(upl.user_id) as emp_count
  FROM user_pain_levels upl
  WHERE upl.current_pain_level IS NOT NULL
  GROUP BY upl.dept_id, upl.dept_name
  
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
      SELECT upl.dept_id FROM user_pain_levels upl WHERE upl.current_pain_level IS NOT NULL GROUP BY upl.dept_id
    )
  GROUP BY cd.id, cd.department_name;
END;
$$;