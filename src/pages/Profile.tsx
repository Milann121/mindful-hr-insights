import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import MyProfile from '@/components/profile/MyProfile';
import CompanyProfile from '@/components/profile/CompanyProfile';
import { DateFilterProvider } from '@/contexts/DateFilterContext';

const Profile = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('profile.title');
  }, [t]);

  return (
    <DateFilterProvider>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title={t('profile.title')}
            subtitle=""
          />
          
          <div className="space-y-8">
            <MyProfile />
            <CompanyProfile />
          </div>
        </div>
      </div>
    </DateFilterProvider>
  );
};

export default Profile;