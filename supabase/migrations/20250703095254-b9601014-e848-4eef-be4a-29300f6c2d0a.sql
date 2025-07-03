-- Add policy to allow public verification of HR manager credentials
CREATE POLICY "Allow HR manager verification" 
ON public.hr_managers 
FOR SELECT 
USING (true);