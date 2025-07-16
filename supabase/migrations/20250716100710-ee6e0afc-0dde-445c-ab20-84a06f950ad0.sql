-- Add RLS policy to allow HR managers to view their company's employee secondary programs
CREATE POLICY "HR managers can view their company's employee secondary programs"
ON public.secondary_programs
FOR SELECT
TO authenticated
USING (
  is_hr_manager(auth.uid()) AND 
  user_id IN (
    SELECT be.user_id 
    FROM b2b_employees be 
    WHERE be.b2b_partner_id = get_user_b2b_partner_id(auth.uid())
  )
);