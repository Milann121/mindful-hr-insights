
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const PainLevelChart = () => {
  const { t } = useTranslation();

  const data = [
    { name: t('dashboard.painLevels.low'), value: 45, color: '#10B981' },
    { name: t('dashboard.painLevels.moderate'), value: 35, color: '#F59E0B' },
    { name: t('dashboard.painLevels.high'), value: 15, color: '#EF4444' },
    { name: t('dashboard.painLevels.noData'), value: 5, color: '#6B7280' },
  ];

  const COLORS = data.map(item => item.color);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.painLevels.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PainLevelChart;
