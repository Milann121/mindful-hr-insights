import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useDateFilter, type DateFilterPeriod } from '@/contexts/DateFilterContext';
import Navigation from './Navigation';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  showFilters?: boolean;
}

const PageHeader = ({ title, subtitle, showFilters = false }: PageHeaderProps) => {
  const { t, i18n } = useTranslation();
  const dateFilter = showFilters ? useDateFilter() : null;

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  const changePeriod = (period: string) => {
    if (dateFilter) {
      dateFilter.setSelectedPeriod(period as DateFilterPeriod);
    }
  };

  const periodOptions: { value: DateFilterPeriod; label: string }[] = [
    { value: 'today', label: t('dashboard.filters.periods.today') },
    { value: 'yesterday', label: t('dashboard.filters.periods.yesterday') },
    { value: 'week-to-date', label: t('dashboard.filters.periods.weekToDate') },
    { value: 'last-week', label: t('dashboard.filters.periods.lastWeek') },
    { value: 'month-to-date', label: t('dashboard.filters.periods.monthToDate') },
    { value: 'last-month', label: t('dashboard.filters.periods.lastMonth') },
    { value: 'last-30-days', label: t('dashboard.filters.periods.last30Days') },
    { value: 'year-to-date', label: t('dashboard.filters.periods.yearToDate') },
    { value: 'last-year', label: t('dashboard.filters.periods.lastYear') },
  ];

  return (
    <div className="mb-8">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          {/* Mobile/Tablet Navigation Menu on the left */}
          <div className="md:hidden">
            <Navigation />
          </div>
          
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
            <p className="text-lg text-gray-600">
              {subtitle}
            </p>
          </div>
        </div>
        
        {/* Desktop Navigation on the right */}
        <div className="hidden md:block">
          <Navigation />
        </div>
      </div>
      
      {showFilters && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Button variant="outline" size="sm">
            {t('dashboard.filters.allDepartments')}
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
              <Select defaultValue="en" onValueChange={changeLanguage}>
                <SelectTrigger className="w-full sm:w-24 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="sk">SK</SelectItem>
                  <SelectItem value="cs">CS</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter?.selectedPeriod || ''} onValueChange={changePeriod}>
                <SelectTrigger className="w-full sm:w-48 h-10">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button className="h-10 w-full sm:w-auto">
              {t('dashboard.actions.exportReport')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageHeader;