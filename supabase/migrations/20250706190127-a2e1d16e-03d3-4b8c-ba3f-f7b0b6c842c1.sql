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
AS $$
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
      SELECT dept_id FROM pain_levels pl WHERE pl.current_pain_level IS NOT NULL GROUP BY pl.dept_id
    )
  GROUP BY cd.id, cd.department_name;
END;
$$;