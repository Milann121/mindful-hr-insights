-- Policy to allow reading pain areas from user_profiles
CREATE POLICY "Allow select on user_profiles" ON public.user_profiles
FOR SELECT
USING (true);
