import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher';

const ActionRoom = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <PageHeader 
          title={t('actionRoom.title')}
          subtitle={t('actionRoom.subtitle')}
        />
        
        {/* Blank page as requested */}
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500">{t('common.noDataAvailable')}</p>
        </div>
      </div>
    </div>
  );
};

export default ActionRoom;