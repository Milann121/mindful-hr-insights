-- Create company_departments table
CREATE TABLE public.company_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  b2b_partner_id BIGINT NOT NULL REFERENCES public."B2B_partners"(id),
  department_name TEXT NOT NULL,
  department_headcount INTEGER NOT NULL DEFAULT 0,
  job_type TEXT NOT NULL CHECK (job_type IN ('office_work', 'manual_work')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(b2b_partner_id, department_name)
);

-- Create job_properties table to store available job properties
CREATE TABLE public.job_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create department_job_properties junction table
CREATE TABLE public.department_job_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.company_departments(id) ON DELETE CASCADE,
  job_property_id UUID NOT NULL REFERENCES public.job_properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_id, job_property_id)
);

-- Insert default job properties
INSERT INTO public.job_properties (property_name) VALUES
  ('sitting_positions'),
  ('heavy_objects_lifting'),
  ('repetitive_movements'),
  ('driving'),
  ('cold_environment'),
  ('hot_environment'),
  ('vibrations'),
  ('specific_tools'),
  ('prolonged_standing');

-- Enable RLS on all tables
ALTER TABLE public.company_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_job_properties ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_departments
CREATE POLICY "HR managers can manage their company's departments" 
ON public.company_departments 
FOR ALL 
USING (is_hr_manager(auth.uid()) AND b2b_partner_id = get_user_b2b_partner_id(auth.uid()))
WITH CHECK (is_hr_manager(auth.uid()) AND b2b_partner_id = get_user_b2b_partner_id(auth.uid()));

-- RLS policies for job_properties (readable by all authenticated users)
CREATE POLICY "Authenticated users can view job properties" 
ON public.job_properties 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- RLS policies for department_job_properties
CREATE POLICY "HR managers can manage their company's department job properties" 
ON public.department_job_properties 
FOR ALL 
USING (
  department_id IN (
    SELECT id FROM public.company_departments 
    WHERE is_hr_manager(auth.uid()) AND b2b_partner_id = get_user_b2b_partner_id(auth.uid())
  )
)
WITH CHECK (
  department_id IN (
    SELECT id FROM public.company_departments 
    WHERE is_hr_manager(auth.uid()) AND b2b_partner_id = get_user_b2b_partner_id(auth.uid())
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_company_departments_updated_at
BEFORE UPDATE ON public.company_departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for profile pictures and company logos
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('profile-pictures', 'profile-pictures', true),
  ('company-logos', 'company-logos', true);

-- Create storage policies for profile pictures
CREATE POLICY "Users can upload their own profile pictures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile pictures" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile pictures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Profile pictures are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-pictures');

-- Create storage policies for company logos
CREATE POLICY "HR managers can upload company logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-logos' AND is_hr_manager(auth.uid()));

CREATE POLICY "HR managers can update company logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-logos' AND is_hr_manager(auth.uid()));

CREATE POLICY "HR managers can delete company logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'company-logos' AND is_hr_manager(auth.uid()));

CREATE POLICY "Company logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-logos');