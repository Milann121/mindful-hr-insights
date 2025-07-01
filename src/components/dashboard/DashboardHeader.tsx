
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, ChartBar } from 'lucide-react';

const DashboardHeader = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('dashboard.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('dashboard.subtitle')}
          </p>
        </div>
        
        <div className="flex gap-4">
          <Select defaultValue="en" onValueChange={changeLanguage}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="sk">SK</SelectItem>
              <SelectItem value="cs">CS</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            {t('dashboard.filters.last30Days')}
          </Button>
          
          <Button>
            {t('dashboard.actions.exportReport')}
          </Button>
        </div>
      </div>
      
      <div className="flex gap-4">
        <Button variant="outline" size="sm">
          {t('dashboard.filters.allDepartments')}
        </Button>
        <Button variant="outline" size="sm">
          {t('dashboard.filters.last90Days')}
        </Button>
        <Button variant="outline" size="sm">
          {t('dashboard.filters.lastYear')}
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
