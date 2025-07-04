-- Create RLS policy to allow HR managers to view their company's employee profiles
CREATE POLICY "HR managers can view their company's employee profiles" ON public.user_profiles
FOR SELECT
USING (
  is_hr_manager(auth.uid()) AND 
  employee_id IN (
    SELECT employee_id 
    FROM b2b_employees 
    WHERE b2b_partner_id = get_user_b2b_partner_id(auth.uid())
  )
);