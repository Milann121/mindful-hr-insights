import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import FileUpload from './FileUpload';

const MyProfile = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
      }

      // Try to get user profile with position
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userProfile) {
        setPosition(userProfile.job || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Update user_profiles table
      const { error: userProfileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          job: position,
          updated_at: new Date().toISOString()
        });

      if (userProfileError) throw userProfileError;

      toast({
        title: t('common.save'),
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      setProfilePictureUrl(data.publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to upload profile picture',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.myProfile.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <Label>{t('profile.myProfile.profilePicture')}</Label>
            <FileUpload
              onFileSelect={handleFileUpload}
              currentImageUrl={profilePictureUrl}
              placeholder={t('profile.myProfile.uploadPicture')}
              className="w-24 h-24"
              circular
            />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <Label htmlFor="firstName">{t('profile.myProfile.firstName')}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="lastName">{t('profile.myProfile.lastName')}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="position">{t('profile.myProfile.position')}</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={loading}>
          {loading ? t('common.loading') : t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MyProfile;