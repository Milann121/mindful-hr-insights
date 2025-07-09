import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { useTrendsData } from '@/hooks/useTrendsData';
import { TrendsLegend } from './TrendsLegend';
const TrendsChart = () => {
  const {
    t
  } = useTranslation();
  const {
    data,
    loading,
    lastUpdated,
    refreshData
  } = useTrendsData();
  return <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="px-0 py-0 mx-0">{t('dashboard.trends.title')}</CardTitle>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-sm text-muted-foreground py-0 my-0">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>}
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading} className="h-8 w-8 p-0">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="my-[7px] py-[15px]">
        {loading ? <div className="h-[350px] flex items-center justify-center">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div> : data.length > 0 ? <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend content={<TrendsLegend />} />
              <Line type="monotone" dataKey="painReduction" stroke="#10B981" strokeWidth={2} name={t('dashboard.trends.painReduction')} />
              <Line type="monotone" dataKey="programCompletion" stroke="#3B82F6" strokeWidth={2} name={t('dashboard.trends.programCompletion')} />
              <Line type="monotone" dataKey="exerciseCompliance" stroke="#8B5CF6" strokeWidth={2} name={t('dashboard.trends.exerciseCompliance')} />
            </LineChart>
          </ResponsiveContainer> : <div className="h-[350px] flex items-center justify-center">
            <p className="text-gray-500">{t('common.noDataAvailable')}</p>
          </div>}
      </CardContent>
    </Card>;
};
export default TrendsChart;