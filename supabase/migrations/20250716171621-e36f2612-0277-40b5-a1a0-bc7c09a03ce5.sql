-- Add manager_id to hr_managers table
ALTER TABLE public.hr_managers 
ADD COLUMN manager_id TEXT UNIQUE;

-- Generate manager_id for existing records
UPDATE public.hr_managers 
SET manager_id = 'MGR_' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE manager_id IS NULL;

-- Make manager_id not null after updating existing records
ALTER TABLE public.hr_managers 
ALTER COLUMN manager_id SET NOT NULL;

-- Create rotation_reminder table
CREATE TABLE public.rotation_reminder (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reminder_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT fk_rotation_reminder_manager 
    FOREIGN KEY (manager_id) 
    REFERENCES public.hr_managers(manager_id) 
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.rotation_reminder ENABLE ROW LEVEL SECURITY;

-- Create policies for rotation_reminder
CREATE POLICY "HR managers can view their own rotation reminders"
ON public.rotation_reminder
FOR SELECT
USING (manager_id IN (
  SELECT hm.manager_id 
  FROM public.hr_managers hm 
  INNER JOIN public.users u ON u.hr_manager_id = hm.id 
  WHERE u.id = auth.uid()
));

CREATE POLICY "HR managers can create their own rotation reminders"
ON public.rotation_reminder
FOR INSERT
WITH CHECK (manager_id IN (
  SELECT hm.manager_id 
  FROM public.hr_managers hm 
  INNER JOIN public.users u ON u.hr_manager_id = hm.id 
  WHERE u.id = auth.uid()
));

CREATE POLICY "HR managers can update their own rotation reminders"
ON public.rotation_reminder
FOR UPDATE
USING (manager_id IN (
  SELECT hm.manager_id 
  FROM public.hr_managers hm 
  INNER JOIN public.users u ON u.hr_manager_id = hm.id 
  WHERE u.id = auth.uid()
));

CREATE POLICY "HR managers can delete their own rotation reminders"
ON public.rotation_reminder
FOR DELETE
USING (manager_id IN (
  SELECT hm.manager_id 
  FROM public.hr_managers hm 
  INNER JOIN public.users u ON u.hr_manager_id = hm.id 
  WHERE u.id = auth.uid()
));

-- Create trigger for updating updated_at
CREATE TRIGGER update_rotation_reminder_updated_at
BEFORE UPDATE ON public.rotation_reminder
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();