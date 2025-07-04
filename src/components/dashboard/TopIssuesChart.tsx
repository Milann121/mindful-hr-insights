
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const TopIssuesChart = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPainAreaData = async () => {
      try {
        setLoading(true);
        
        // First get all active b2b_employees for partner_id 10010
        const { data: employees, error: employeesError } = await supabase
          .from('b2b_employees')
          .select('user_id')
          .eq('b2b_partner_id', 10010)
          .eq('state', 'active')
          .not('user_id', 'is', null);

        if (employeesError) {
          console.error('Error fetching b2b_employees:', employeesError);
          return;
        }

        if (!employees || employees.length === 0) {
          console.log('No active employees found for partner_id 10010');
          setData([]);
          return;
        }

        // Get user_ids to query user_assessments
        const userIds = employees.map(emp => emp.user_id);
        console.log('Found user IDs:', userIds);

        // Query user_assessments for these employees to get all pain areas
        const { data: assessments, error: assessmentsError } = await supabase
          .from('user_assessments')
          .select('pain_area, user_id')
          .in('user_id', userIds)
          .not('pain_area', 'is', null);

        if (assessmentsError) {
          console.error('Error fetching user_assessments:', assessmentsError);
          return;
        }

        console.log('Found assessments:', assessments);

        // Count individual pain areas from all assessments
        const painAreaCounts: Record<string, number> = {};
        assessments?.forEach((assessment: any) => {
          if (assessment.pain_area) {
            const area = assessment.pain_area.trim().toLowerCase();
            if (area) {
              painAreaCounts[area] = (painAreaCounts[area] || 0) + 1;
            }
          }
        });

        console.log('Pain area counts:', painAreaCounts);

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
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
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
