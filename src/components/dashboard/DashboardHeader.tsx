
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Home, Users, Settings } from 'lucide-react';
import { useDateFilter, type DateFilterPeriod } from '@/contexts/DateFilterContext';
import { Link, useLocation } from 'react-router-dom';

const DashboardHeader = () => {
  const { t, i18n } = useTranslation();
  const { selectedPeriod, setSelectedPeriod } = useDateFilter();
  const location = useLocation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  const changePeriod = (period: string) => {
    setSelectedPeriod(period as DateFilterPeriod);
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

  const navigationItems = [
    { path: '/', label: t('navigation.dashboard'), icon: Home },
    { path: '/action-room', label: t('navigation.actionRoom'), icon: Settings },
    { path: '/profile', label: t('navigation.profile'), icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

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
        
        <nav className="flex items-center gap-8">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 text-lg font-medium transition-colors hover:text-primary ${
                  isActive(item.path) 
                    ? 'text-primary border-b-2 border-primary pb-1' 
                    : 'text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm">
          {t('dashboard.filters.allDepartments')}
        </Button>
        
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
          
          <Select value={selectedPeriod} onValueChange={changePeriod}>
            <SelectTrigger className="w-48">
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
          
          <Button>
            {t('dashboard.actions.exportReport')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
