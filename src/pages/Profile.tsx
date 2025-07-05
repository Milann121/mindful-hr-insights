import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MyProfile from '@/components/profile/MyProfile';
import CompanyProfile from '@/components/profile/CompanyProfile';

const Profile = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('profile.title');
  }, [t]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('profile.title')}
          </h1>
        </div>
        
        <div className="space-y-8">
          <MyProfile />
          <CompanyProfile />
        </div>
      </div>
    </div>
  );
};

export default Profile;