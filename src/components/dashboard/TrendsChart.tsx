
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TrendsChart = () => {
  const { t } = useTranslation();

  const data = [
    { month: 'Jan', painReduction: 65, programCompletion: 78, exerciseCompliance: 82 },
    { month: 'Feb', painReduction: 68, programCompletion: 80, exerciseCompliance: 85 },
    { month: 'Mar', painReduction: 72, programCompletion: 75, exerciseCompliance: 88 },
    { month: 'Apr', painReduction: 75, programCompletion: 82, exerciseCompliance: 90 },
    { month: 'May', painReduction: 73, programCompletion: 85, exerciseCompliance: 87 },
    { month: 'Jun', painReduction: 78, programCompletion: 88, exerciseCompliance: 92 },
  ];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>{t('dashboard.trends.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="painReduction" 
              stroke="#10B981" 
              strokeWidth={2}
              name={t('dashboard.trends.painReduction')}
            />
            <Line 
              type="monotone" 
              dataKey="programCompletion" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name={t('dashboard.trends.programCompletion')}
            />
            <Line 
              type="monotone" 
              dataKey="exerciseCompliance" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              name={t('dashboard.trends.exerciseCompliance')}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TrendsChart;
