
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
        
        // Get current user's b2b_partner_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // First try to get partner ID from user profile
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('b2b_partner_id')
          .eq('user_id', user.id)
          .single();

        let partnerIdToUse = userProfile?.b2b_partner_id;

        // If not found in user profile, check if user is HR manager
        if (!partnerIdToUse) {
          const { data: hrManager } = await supabase
            .from('hr_managers')
            .select('b2b_partner')
            .eq('email', user.email)
            .single();
          
          partnerIdToUse = hrManager?.b2b_partner;
        }

        // Fallback to 10010 if still not found
        partnerIdToUse = partnerIdToUse || 10010;
        
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

        // Get weekly exercise goals for the date range first
        const startMonth = start.toISOString().slice(0, 7) + '-01';
        const endMonth = end.toISOString().slice(0, 7) + '-01';
        
        const { data: weeklyGoals, error: goalsError } = await supabase
          .from('user_weekly_exercise_goals')
          .select('*')
          .gte('month_year', startMonth)
          .lte('month_year', endMonth);

        if (goalsError) {
          console.error('Error fetching weekly goals:', goalsError);
          return;
        }

        console.log('All weekly goals data:', weeklyGoals);

        // Get b2b_employees for the user's partner
        const { data: employees, error: employeesError } = await supabase
          .from('b2b_employees')
          .select('id, employee_id, user_id')
          .eq('b2b_partner_id', partnerIdToUse)
          .eq('state', 'active');

        if (employeesError) {
          console.error('Error fetching employees:', employeesError);
          return;
        }

        console.log('Active employees for partner:', employees);

        // Filter program data by employees
        const employeeIds = employees?.map(emp => emp.id) || [];
        const filteredProgramData = programData?.filter(program => 
          program.b2b_employee_id && employeeIds.includes(program.b2b_employee_id)
        ) || [];

        // For Exercise Compliance, use a more inclusive approach:
        // 1. Include users who have weekly goals and are in the partner's employee list
        // 2. Also include users who have weekly goals but might not be in current active employees (historical data)
        const employeeUserIds = employees?.map(emp => emp.user_id).filter(Boolean) || [];
        
        // Get users with weekly goals data for better exercise compliance calculation
        const usersWithGoals = weeklyGoals?.map(goal => goal.user_id) || [];
        
        // For exercise compliance, be more inclusive - use all users with goals data
        // but prioritize those who are currently active employees
        const filteredGoalsData = weeklyGoals || [];
        
        console.log('Employee user IDs:', employeeUserIds);
        console.log('Users with goals:', usersWithGoals);
        console.log('All goals data being used:', filteredGoalsData);

        // Calculate monthly trends
        const monthlyData = calculateMonthlyTrends(filteredProgramData, filteredGoalsData, start, end);
        setData(monthlyData);
      } catch (error) {
        console.error('Error in fetchTrendsData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendsData();
  }, [getDateRange]);

  const calculateMonthlyTrends = (programData: any[], weeklyGoalsData: any[], start: Date, end: Date) => {
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
      const monthProgramData = programData.filter(item => {
        const itemDate = new Date(item.program_started_at);
        return itemDate.getFullYear() === current.getFullYear() && 
               itemDate.getMonth() === current.getMonth();
      });

      // Get weekly goals for this month
      const monthGoalsData = weeklyGoalsData.filter(goal => {
        const goalDate = new Date(goal.month_year);
        return goalDate.getFullYear() === current.getFullYear() && 
               goalDate.getMonth() === current.getMonth();
      });

      // Pain Reduction: average pain improvement percentage
      const painReduction = calculatePainReduction(monthProgramData);
      
      // Program Completion: % of ended programs
      const programCompletion = calculateProgramCompletion(monthProgramData);
      
      // Exercise Compliance: average from weekly goals
      const exerciseCompliance = calculateExerciseCompliance(monthGoalsData, current);

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

  const getCurrentWeekOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const currentDay = date.getDate();
    const firstWeekday = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate which week we're in (1-based)
    const weekOfMonth = Math.ceil((currentDay + firstWeekday) / 7);
    return Math.min(weekOfMonth, 5); // Cap at 5 weeks
  };

  const calculateExerciseCompliance = (monthGoalsData: any[], monthDate: Date) => {
    console.log(`=== Calculating Exercise Compliance for ${monthDate.toLocaleDateString()} ===`);
    console.log('Month goals data:', monthGoalsData);
    
    if (monthGoalsData.length === 0) {
      console.log('No monthly goals data, returning 0');
      return 0;
    }
    
    const now = new Date();
    const isCurrentMonth = monthDate.getFullYear() === now.getFullYear() && 
                          monthDate.getMonth() === now.getMonth();
    
    // Fix current week calculation for July 2025
    const currentWeek = isCurrentMonth ? getCurrentWeekOfMonth(now) : 5;
    console.log(`Current week: ${currentWeek}, Is current month: ${isCurrentMonth}`);
    
    let totalCompliance = 0;
    let usersWithValidData = 0;
    
    monthGoalsData.forEach((goal, index) => {
      console.log(`\nProcessing goal ${index + 1} for user ${goal.user_id}:`);
      
      const weeks = [
        goal.first_month_week,
        goal.second_month_week,
        goal.third_month_week,
        goal.fourth_month_week,
        goal.fifth_month_week
      ];
      
      console.log('Raw weeks data:', weeks);
      
      // For current month, only use weeks up to current week
      const weeksToUse = isCurrentMonth ? weeks.slice(0, currentWeek) : weeks;
      console.log(`Weeks to use (up to week ${currentWeek}):`, weeksToUse);
      
      // Filter out null/undefined values but keep 0.0 as valid data
      const validWeeks = weeksToUse.filter(week => week !== null && week !== undefined);
      console.log('Valid weeks (after filtering null/undefined):', validWeeks);
      
      if (validWeeks.length === 0) {
        console.log('No valid weeks data for this user, skipping');
        return; // Skip this user
      }
      
      const weekAverage = validWeeks.reduce((a, b) => a + b, 0) / validWeeks.length;
      console.log(`Week average for this user: ${weekAverage}%`);
      
      totalCompliance += weekAverage;
      usersWithValidData++;
    });
    
    const finalCompliance = usersWithValidData > 0 ? totalCompliance / usersWithValidData : 0;
    console.log(`\nFinal calculation: ${totalCompliance} / ${usersWithValidData} = ${finalCompliance}%`);
    console.log('=== End Exercise Compliance Calculation ===\n');
    
    return finalCompliance;
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
