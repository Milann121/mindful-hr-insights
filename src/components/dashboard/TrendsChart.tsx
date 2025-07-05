
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';

const TrendsChart = () => {
  const { t } = useTranslation();
  const { getDateRange } = useDateFilter();
  const [data, setData] = useState<Array<{ 
    month: string; 
    painReduction: number; 
    programCompletion: number; 
    exerciseCompliance: number; 
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendsData = async () => {
      try {
        setLoading(true);
        const { start, end } = getDateRange();
        
        // Get all program tracking data for the selected period
        const { data: programData, error: programError } = await supabase
          .from('user_program_tracking')
          .select(`
            *,
            b2b_employee_id
          `)
          .gte('program_started_at', start.toISOString())
          .lte('program_started_at', end.toISOString());

        if (programError) {
          console.error('Error fetching program data:', programError);
          return;
        }

        // Get b2b_employees to filter by partner_id 10010
        const { data: employees, error: employeesError } = await supabase
          .from('b2b_employees')
          .select('id, employee_id')
          .eq('b2b_partner_id', 10010)
          .eq('state', 'active');

        if (employeesError) {
          console.error('Error fetching employees:', employeesError);
          return;
        }

        if (!employees || employees.length === 0 || !programData || programData.length === 0) {
          setData([]);
          return;
        }

        const employeeIds = employees.map(emp => emp.id);
        const filteredData = programData.filter(program => 
          program.b2b_employee_id && employeeIds.includes(program.b2b_employee_id)
        );

        // Calculate monthly trends
        const monthlyData = calculateMonthlyTrends(filteredData, start, end);
        setData(monthlyData);
      } catch (error) {
        console.error('Error in fetchTrendsData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendsData();
  }, [getDateRange]);

  const calculateMonthlyTrends = (data: any[], start: Date, end: Date) => {
    const months: Array<{ 
      month: string; 
      painReduction: number; 
      programCompletion: number; 
      exerciseCompliance: number; 
    }> = [];

    // Generate months within the date range
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endDate = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endDate) {
      const monthKey = current.toISOString().slice(0, 7); // YYYY-MM format
      const monthName = current.toLocaleDateString('en', { month: 'short' });
      
      // Calculate metrics for this month
      const monthData = data.filter(item => {
        const itemDate = new Date(item.program_started_at);
        return itemDate.getFullYear() === current.getFullYear() && 
               itemDate.getMonth() === current.getMonth();
      });

      // Pain Reduction: average pain improvement percentage
      const painReduction = calculatePainReduction(monthData);
      
      // Program Completion: % of ended programs
      const programCompletion = calculateProgramCompletion(monthData);
      
      // Exercise Compliance: average of exercise_goal_completion arrays
      const exerciseCompliance = calculateExerciseCompliance(monthData);

      months.push({
        month: monthName,
        painReduction: Math.round(painReduction * 100) / 100,
        programCompletion: Math.round(programCompletion * 100) / 100,
        exerciseCompliance: Math.round(exerciseCompliance * 100) / 100
      });

      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  const calculatePainReduction = (monthData: any[]) => {
    if (monthData.length === 0) return 0;
    
    const validPainData = monthData.filter(item => 
      item.initial_pain_level && (item.pain_level_followup || item.pain_level_ended)
    );
    
    if (validPainData.length === 0) return 0;
    
    const totalReduction = validPainData.reduce((sum, item) => {
      const initial = item.initial_pain_level;
      const current = item.pain_level_followup || item.pain_level_ended;
      const reduction = ((initial - current) / initial) * 100;
      return sum + reduction;
    }, 0);
    
    return totalReduction / validPainData.length;
  };

  const calculateProgramCompletion = (monthData: any[]) => {
    if (monthData.length === 0) return 0;
    
    const endedPrograms = monthData.filter(item => item.program_status === 'ended').length;
    const totalPrograms = monthData.length;
    
    return (endedPrograms / totalPrograms) * 100;
  };

  const calculateExerciseCompliance = (monthData: any[]) => {
    if (monthData.length === 0) return 0;
    
    const validComplianceData = monthData.filter(item => 
      item.exercise_goal_completion && Array.isArray(item.exercise_goal_completion)
    );
    
    if (validComplianceData.length === 0) return 0;
    
    const totalCompliance = validComplianceData.reduce((sum, item) => {
      const userAvg = item.exercise_goal_completion.reduce((a: number, b: number) => a + b, 0) / item.exercise_goal_completion.length;
      return sum + userAvg;
    }, 0);
    
    return totalCompliance / validComplianceData.length;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;

    return (
      <TooltipProvider>
        <div className="flex flex-col sm:flex-row justify-center items-start sm:items-center gap-2 sm:gap-6 mt-4">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-0.5" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.value}</span>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    {entry.dataKey === 'painReduction' && t('dashboard.trends.painReductionDesc')}
                    {entry.dataKey === 'programCompletion' && t('dashboard.trends.programCompletionDesc')}
                    {entry.dataKey === 'exerciseCompliance' && t('dashboard.trends.exerciseComplianceDesc')}
                  </p>
                </TooltipContent>
              </UITooltip>
            </div>
          ))}
        </div>
      </TooltipProvider>
    );
  };

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
              <Legend content={<CustomLegend />} />
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
