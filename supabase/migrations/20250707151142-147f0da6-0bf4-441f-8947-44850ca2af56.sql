-- Create RLS policy for HR managers to access their company's exercise completion clicks
CREATE POLICY "HR managers can view their company's exercise completion clicks"
ON public.exercise_completion_clicks
FOR SELECT
USING (
  is_hr_manager(auth.uid()) AND 
  user_id IN (
    SELECT be.user_id 
    FROM b2b_employees be 
    WHERE be.b2b_partner_id = get_user_b2b_partner_id(auth.uid())
  )
);