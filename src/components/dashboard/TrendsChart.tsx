
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTrendsData } from '@/hooks/useTrendsData';
import { TrendsLegend } from './TrendsLegend';

const TrendsChart = () => {
  const { t } = useTranslation();
  const { data, loading } = useTrendsData();

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>{t('dashboard.trends.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend content={<TrendsLegend />} />
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
        ) : (
          <div className="h-[350px] flex items-center justify-center">
            <p className="text-gray-500">{t('common.noDataAvailable')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendsChart;
