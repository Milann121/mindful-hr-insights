
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ChartBar, Calendar, ArrowUp, ArrowDown } from 'lucide-react';

const OverviewCards = () => {
  const { t } = useTranslation();

  const stats = [
    {
      title: t('dashboard.overview.totalEmployees'),
      value: '1,247',
      change: '+12%',
      trend: 'up',
      icon: Users,
    },
    {
      title: t('dashboard.overview.activePrograms'),
      value: '387',
      change: '+8%',
      trend: 'up',
      icon: Calendar,
    },
    {
      title: t('dashboard.overview.completionRate'),
      value: '73.2%',
      change: '+5.2%',
      trend: 'up',
      icon: ChartBar,
    },
    {
      title: t('dashboard.overview.riskLevel'),
      value: '89',
      change: '-3%',
      trend: 'down',
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className={`flex items-center text-sm ${
              stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {stat.trend === 'up' ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-1" />
              )}
              {stat.change}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OverviewCards;
