-- Add profile_picture_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN profile_picture_url TEXT;