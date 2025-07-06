-- Create function to calculate and store daily trends
CREATE OR REPLACE FUNCTION public.update_department_pain_trends()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;