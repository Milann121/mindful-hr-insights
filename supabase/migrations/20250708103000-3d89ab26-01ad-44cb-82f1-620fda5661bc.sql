-- Sync user_profiles to b2b_employees and update RLS policy

-- Function to upsert b2b_employees rows when user_profiles change
CREATE OR REPLACE FUNCTION public.sync_profile_to_b2b_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Find existing employee by employee_id or user_id
  PERFORM 1 FROM public.b2b_employees
   WHERE employee_id = NEW.employee_id OR user_id = NEW.user_id
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.b2b_employees (
      id,
      b2b_partner_id,
      b2b_partner_name,
      user_id,
      employee_id,
      first_name,
      last_name,
      email,
      state,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.b2b_partner_id,
      NEW.b2b_partner_name,
      NEW.user_id,
      NEW.employee_id,
      NEW.first_name,
      NEW.last_name,
      NEW.email,
      'active',
      now(),
      now()
    );
  ELSE
    UPDATE public.b2b_employees
      SET employee_id = NEW.employee_id,
          first_name = NEW.first_name,
          last_name = NEW.last_name,
          email = NEW.email,
          b2b_partner_id = NEW.b2b_partner_id,
          b2b_partner_name = NEW.b2b_partner_name,
          updated_at = now()
      WHERE employee_id = NEW.employee_id OR user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to call the sync function
DROP TRIGGER IF EXISTS sync_profile_to_b2b_employee_trigger ON public.user_profiles;
CREATE TRIGGER sync_profile_to_b2b_employee_trigger
AFTER INSERT OR UPDATE OF employee_id, first_name, last_name, email, b2b_partner_id, b2b_partner_name
ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_b2b_employee();

-- Backfill missing employee records
INSERT INTO public.b2b_employees (
  id, b2b_partner_id, b2b_partner_name, user_id, employee_id, first_name, last_name, email, state, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  up.b2b_partner_id,
  up.b2b_partner_name,
  up.user_id,
  up.employee_id,
  up.first_name,
  up.last_name,
  up.email,
  'active',
  now(),
  now()
FROM public.user_profiles up
LEFT JOIN public.b2b_employees be
  ON be.employee_id = up.employee_id OR be.user_id = up.user_id
WHERE be.id IS NULL;

-- Replace policy to also check user_id
DROP POLICY IF EXISTS "HR managers can view their company's employee profiles" ON public.user_profiles;
CREATE POLICY "HR managers can view their company's employee profiles" ON public.user_profiles
FOR SELECT
USING (
  is_hr_manager(auth.uid()) AND
  (
    employee_id IN (
      SELECT employee_id FROM public.b2b_employees
      WHERE b2b_partner_id = get_user_b2b_partner_id(auth.uid())
    )
    OR user_id IN (
      SELECT user_id FROM public.b2b_employees
      WHERE b2b_partner_id = get_user_b2b_partner_id(auth.uid())
    )
  )
);
