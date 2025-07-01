
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TopIssuesChart = () => {
  const { t } = useTranslation();

  const data = [
    { name: t('dashboard.topIssues.backPain'), value: 234, color: '#EF4444' },
    { name: t('dashboard.topIssues.neckPain'), value: 189, color: '#F59E0B' },
    { name: t('dashboard.topIssues.shoulderPain'), value: 156, color: '#10B981' },
    { name: t('dashboard.topIssues.wristPain'), value: 123, color: '#3B82F6' },
    { name: t('dashboard.topIssues.other'), value: 89, color: '#8B5CF6' },
  ];

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.topIssues.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="value" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TopIssuesChart;
