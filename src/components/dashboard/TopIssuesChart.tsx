
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const TopIssuesChart = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPainAreaData = async () => {
      try {
        setLoading(true);
        
        // Query user_profiles directly and join with b2b_employees via employee_id
        const { data: profiles, error } = await supabase
          .from('user_profiles')
          .select(`
            pain_area,
            b2b_employees!inner(id, state, b2b_partner_id)
          `)
          .eq('b2b_employees.b2b_partner_id', 10010)
          .eq('b2b_employees.state', 'active');

        if (error) {
          console.error('Error fetching employee pain area data:', error);
          return;
        }

        // Count pain areas
        const painAreaCounts: Record<string, number> = {};
        profiles?.forEach((profile: any) => {
          if (profile.pain_area) {
            const area = profile.pain_area.toLowerCase();
            painAreaCounts[area] = (painAreaCounts[area] || 0) + 1;
          }
        });

        // Map to chart data with colors
        const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
        const chartData = Object.entries(painAreaCounts).map(([area, count], index) => ({
          name: area.charAt(0).toUpperCase() + area.slice(1),
          value: count,
          color: colors[index % colors.length]
        }));

        setData(chartData);
      } catch (error) {
        console.error('Error in fetchPainAreaData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPainAreaData();
  }, []);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.topIssues.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopIssuesChart;
