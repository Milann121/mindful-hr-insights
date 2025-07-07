-- Update the calculate_department_avg_pain_level function to calculate per active program instead of per user
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
  active_programs_pain AS (
    SELECT 
      de.dept_id,
      de.dept_name,
      upt.user_id,
      upt.assessment_id,
      COALESCE(
        -- First try to get the latest follow-up response for this specific program
        (SELECT fr.pain_level 
         FROM follow_up_responses fr 
         WHERE fr.user_id = upt.user_id 
           AND fr.assessment_id = upt.assessment_id
         ORDER BY fr.created_at DESC 
         LIMIT 1),
        -- Fall back to initial pain level for this program
        upt.initial_pain_level
      ) as program_pain_level
    FROM department_employees de
    INNER JOIN user_program_tracking upt ON de.user_id = upt.user_id
    WHERE upt.program_status = 'active'
      AND de.user_id IS NOT NULL
  )
  SELECT 
    app.dept_id,
    app.dept_name,
    ROUND(AVG(app.program_pain_level), 2) as avg_pain,
    COUNT(DISTINCT app.user_id) as emp_count
  FROM active_programs_pain app
  WHERE app.program_pain_level IS NOT NULL
  GROUP BY app.dept_id, app.dept_name
  
  UNION ALL
  
  -- Include departments with no active programs or no pain data
  SELECT 
    cd.id,
    cd.department_name,
    NULL::numeric,
    COUNT(DISTINCT up.user_id)
  FROM company_departments cd
  LEFT JOIN user_profiles up ON cd.id = up.department_id
  WHERE cd.b2b_partner_id = target_b2b_partner_id
    AND cd.id NOT IN (
      SELECT app.dept_id FROM active_programs_pain app WHERE app.program_pain_level IS NOT NULL GROUP BY app.dept_id
    )
  GROUP BY cd.id, cd.department_name;
END;
$$;