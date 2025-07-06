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