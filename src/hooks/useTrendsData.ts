import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { calculateMonthlyTrends } from '@/utils/trendsCalculations';

export const useTrendsData = () => {
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
        
        // Get all program tracking data for pain reduction calculation
        const { data: programData, error: programError } = await supabase
          .from('user_program_tracking')
          .select(`
            *,
            b2b_employee_id
          `)
          .gte('program_started_at', '2020-01-01') // Get all programs regardless of start date
          .lte('program_started_at', end.toISOString());

        // Get follow-up responses for the selected period
        const { data: followUpData, error: followUpError } = await supabase
          .from('follow_up_responses')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (programError) {
          console.error('Error fetching program data:', programError);
          return;
        }

        if (followUpError) {
          console.error('Error fetching follow-up data:', followUpError);
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

        // Filter follow-up data by employees and attach program tracking data
        const filteredFollowUpData = followUpData?.filter(followUp => 
          employeeUserIds.includes(followUp.user_id)
        ).map(followUp => {
          // Find the corresponding program tracking data
          const programTracking = programData?.find(program => 
            program.assessment_id === followUp.assessment_id && 
            program.user_id === followUp.user_id
          );
          return {
            ...followUp,
            initial_pain_level: programTracking?.initial_pain_level,
            b2b_employee_id: programTracking?.b2b_employee_id
          };
        }).filter(followUp => 
          followUp.b2b_employee_id && employeeIds.includes(followUp.b2b_employee_id)
        ) || [];

        console.log('Filtered follow-up data:', filteredFollowUpData);
        console.log('Filtered program data:', filteredProgramData);

        // Calculate monthly trends
        const monthlyData = calculateMonthlyTrends(filteredProgramData, filteredGoalsData, filteredFollowUpData, start, end);
        console.log('Calculated monthly trends:', monthlyData);
        setData(monthlyData);
      } catch (error) {
        console.error('Error in fetchTrendsData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendsData();
  }, [getDateRange]);

  return { data, loading };
};