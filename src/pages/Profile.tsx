import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import MyProfile from '@/components/profile/MyProfile';
import CompanyProfile from '@/components/profile/CompanyProfile';
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher';
import { DateFilterProvider } from '@/contexts/DateFilterContext';

const Profile = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('profile.title');
  }, [t]);

  return (
    <DateFilterProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-end items-center gap-4 p-4 border-b bg-white">
          <LanguageSwitcher />
        </div>
        <div className="container mx-auto px-6 py-8">
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