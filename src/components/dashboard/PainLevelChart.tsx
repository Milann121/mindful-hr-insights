
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';

const PainLevelChart = () => {
  const { t } = useTranslation();
  const { getDateRange } = useDateFilter();
  const [data, setData] = useState([
    { name: t('dashboard.painLevels.low'), value: 0, color: '#10B981' },
    { name: t('dashboard.painLevels.moderate'), value: 0, color: '#F59E0B' },
    { name: t('dashboard.painLevels.high'), value: 0, color: '#EF4444' },
    { name: t('dashboard.painLevels.noData'), value: 0, color: '#6B7280' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPainLevelData = async () => {
      try {
        // Get current user's company ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get HR manager's company ID
        const { data: companyId } = await supabase.rpc('get_user_b2b_partner_id', {
          user_id: user.id
        });

        if (!companyId) return;

        const { start, end } = getDateRange();

        // Get employee IDs for this company
        const { data: employees } = await supabase
          .from('b2b_employees')
          .select('id')
          .eq('b2b_partner_id', companyId)
          .eq('state', 'active');

        const employeeIds = employees?.map(emp => emp.id).filter(Boolean) || [];

        if (employeeIds.length > 0) {
          // Get pain levels from active programs within date range
          const { data: programData } = await supabase
            .from('user_program_tracking')
            .select('initial_pain_level')
            .in('b2b_employee_id', employeeIds)
            .eq('program_status', 'active')
            .gte('program_started_at', start.toISOString())
            .lte('program_started_at', end.toISOString());

          // Calculate pain level distribution
          let lowCount = 0;
          let moderateCount = 0;
          let highCount = 0;
          let noDataCount = 0;

          programData?.forEach(program => {
            const painLevel = program.initial_pain_level;
            if (painLevel === null || painLevel === undefined) {
              noDataCount++;
            } else if (painLevel >= 1 && painLevel <= 3) {
              lowCount++;
            } else if (painLevel >= 4 && painLevel <= 6) {
              moderateCount++;
            } else if (painLevel >= 7 && painLevel <= 10) {
              highCount++;
            } else {
              noDataCount++;
            }
          });

          const total = lowCount + moderateCount + highCount + noDataCount;
          
          if (total > 0) {
            setData([
              { name: t('dashboard.painLevels.low'), value: Math.round((lowCount / total) * 100), color: '#10B981' },
              { name: t('dashboard.painLevels.moderate'), value: Math.round((moderateCount / total) * 100), color: '#F59E0B' },
              { name: t('dashboard.painLevels.high'), value: Math.round((highCount / total) * 100), color: '#EF4444' },
              { name: t('dashboard.painLevels.noData'), value: Math.round((noDataCount / total) * 100), color: '#6B7280' },
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching pain level data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPainLevelData();

    // Set up real-time subscription
    const channel = supabase
      .channel('pain-level-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_program_tracking'
        },
        () => {
          fetchPainLevelData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [t, getDateRange]);

  const COLORS = data.map(item => item.color);
  
  // Filter out zero values for cleaner display
  const filteredData = data.filter(item => item.value > 0);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.painLevels.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={filteredData}
                cx="50%"
                cy="40%"
                labelLine={false}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              <Legend 
                verticalAlign="bottom" 
                height={24}
                layout="horizontal"
                align="center"
                wrapperStyle={{ paddingTop: '16px' }}
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default PainLevelChart;
