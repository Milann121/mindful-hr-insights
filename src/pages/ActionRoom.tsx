import { useTranslation } from 'react-i18next';

const ActionRoom = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('actionRoom.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('actionRoom.subtitle')}
          </p>
        </div>
        
        {/* Blank page as requested */}
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500">{t('common.noDataAvailable')}</p>
        </div>
      </div>
    </div>
  );
};

export default ActionRoom;