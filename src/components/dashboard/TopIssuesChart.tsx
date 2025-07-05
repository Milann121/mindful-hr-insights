
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';

const TopIssuesChart = () => {
  const { t } = useTranslation();
  const { getDateRange } = useDateFilter();
  const [data, setData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPainAreaData = async () => {
      try {
        setLoading(true);
        const { start, end } = getDateRange();
        
        // Get user_program_tracking data filtered by date and partner
        const { data: programData, error: programError } = await supabase
          .from('user_program_tracking')
          .select(`
            pain_area,
            b2b_employee_id,
            program_started_at
          `)
          .gte('program_started_at', start.toISOString())
          .lte('program_started_at', end.toISOString());

        if (programError) {
          console.error('Error fetching program tracking data:', programError);
          return;
        }

        if (!programData || programData.length === 0) {
          console.log('No program data found for selected period');
          setData([]);
          return;
        }

        // Get b2b_employees to filter by partner_id 10010
        const { data: employees, error: employeesError } = await supabase
          .from('b2b_employees')
          .select('id, employee_id')
          .eq('b2b_partner_id', 10010)
          .eq('state', 'active');

        if (employeesError) {
          console.error('Error fetching b2b_employees:', employeesError);
          return;
        }

        if (!employees || employees.length === 0) {
          console.log('No active employees found for partner_id 10010');
          setData([]);
          return;
        }

        // Filter program data by company employees
        const employeeIds = employees.map(emp => emp.id);
        const filteredProgramData = programData.filter(program => 
          program.b2b_employee_id && employeeIds.includes(program.b2b_employee_id)
        );

        console.log('Filtered program data:', filteredProgramData);

        // Count individual pain areas (split comma-separated values)
        const painAreaCounts: Record<string, number> = {};
        filteredProgramData.forEach((program: any) => {
          if (program.pain_area) {
            // Split comma-separated pain areas and count each individually
            const areas = program.pain_area.split(',').map((area: string) => area.trim().toLowerCase());
            areas.forEach((area: string) => {
              if (area) {
                painAreaCounts[area] = (painAreaCounts[area] || 0) + 1;
              }
            });
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
  }, [getDateRange]);

  const CustomLegend = () => {
    if (!data || data.length === 0) return null;

    return (
      <div className="mt-4 block sm:hidden">
        <div className="grid grid-cols-1 gap-2">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
              <span className="text-sm text-gray-500 ml-auto">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.topIssues.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        ) : data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  className="hidden sm:block"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" maxBarSize={60}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <CustomLegend />
          </>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">{t('common.noDataAvailable')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopIssuesChart;
