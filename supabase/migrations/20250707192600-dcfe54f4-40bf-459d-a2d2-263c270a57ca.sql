-- Enable RLS on user_goals and create policies

-- Ensure row level security is enabled
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage their own goals
CREATE POLICY "Users can manage their own goals"
ON public.user_goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: HR managers can view goals for employees in their company
CREATE POLICY "HR managers can view employee goals"
ON public.user_goals
FOR SELECT
USING (
  is_hr_manager(auth.uid()) AND
  user_id IN (
    SELECT be.user_id
    FROM b2b_employees be
    WHERE be.b2b_partner_id = get_user_b2b_partner_id(auth.uid())
  )
);
