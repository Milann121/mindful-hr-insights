import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';

interface ExerciseEngagementData {
  completedExercises: {
    completed: number;
    total: number;
    percentage: number;
  };
  completedPrograms: {
    completed: number;
    total: number;
    percentage: number;
  };
  weeklyGoals: {
    met: number;
    total: number;
    percentage: number;
  };
}

export const useExerciseEngagementData = () => {
  const { getDateRange } = useDateFilter();
  const [data, setData] = useState<ExerciseEngagementData>({
    completedExercises: { completed: 0, total: 0, percentage: 0 },
    completedPrograms: { completed: 0, total: 0, percentage: 0 },
    weeklyGoals: { met: 0, total: 0, percentage: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEngagementData = async () => {
      try {
        setLoading(true);
        const { start, end } = getDateRange();
        
        // Get current user's company ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get HR manager's company ID
        const { data: companyId } = await supabase.rpc('get_user_b2b_partner_id', {
          user_id: user.id
        });

        console.log('Current user:', user.id);
        console.log('Company ID from RPC:', companyId);

        if (!companyId) {
          console.log('No company ID found - checking if user is HR manager directly');
          return;
        }

        // Get employee IDs for this company
        const { data: employees } = await supabase
          .from('b2b_employees')
          .select('id, user_id, employee_id')
          .eq('b2b_partner_id', companyId)
          .eq('state', 'active');

        console.log('Employees found for company:', employees?.length);
        console.log('Employee details:', employees);

        const employeeIds = employees?.map(emp => emp.id).filter(Boolean) || [];
        const userIds = employees?.map(emp => emp.user_id).filter(Boolean) || [];

        console.log('Employee IDs:', employeeIds);
        console.log('User IDs:', userIds);

        if (employeeIds.length === 0) {
          console.log('No employees found for company', companyId);
          setData({
            completedExercises: { completed: 0, total: 0, percentage: 0 },
            completedPrograms: { completed: 0, total: 0, percentage: 0 },
            weeklyGoals: { met: 0, total: 0, percentage: 0 }
          });
          return;
        }

        // Get active programs for these employees
        const { data: activePrograms } = await supabase
          .from('user_program_tracking')
          .select('*')
          .in('b2b_employee_id', employeeIds)
          .eq('program_status', 'active')
          .gte('program_started_at', start.toISOString())
          .lte('program_started_at', end.toISOString());

        // Get exercise completion clicks from the selected date range
        const { data: exerciseClicks } = await supabase
          .from('exercise_completion_clicks')
          .select('id, user_id, clicked_at')
          .in('user_id', userIds)
          .eq('is_active', true)
          .gte('clicked_at', start.toISOString())
          .lte('clicked_at', end.toISOString());

        console.log('Exercise clicks found:', exerciseClicks?.length);
        console.log('User IDs being queried:', userIds);
        console.log('Date range:', { start: start.toISOString(), end: end.toISOString() });

        const completedCount = exerciseClicks?.length || 0;
        
        // Get all exercise clicks for these users to calculate a more realistic total
        const { data: allExerciseClicks } = await supabase
          .from('exercise_completion_clicks')
          .select('id, user_id, clicked_at')
          .in('user_id', userIds)
          .eq('is_active', true);

        console.log('All exercise clicks (any date):', allExerciseClicks?.length);
        
        // Use actual total clicks as the baseline, with a minimum to avoid 100% on small datasets
        const totalPossibleExercises = Math.max(allExerciseClicks?.length || 0, completedCount * 2, 50);
        
        const completedPercentage = totalPossibleExercises > 0 ? 
          Math.round((completedCount / totalPossibleExercises) * 100) : 0;

        // Get programs that ended in the given period
        const { data: endedProgramsData } = await supabase
          .from('user_program_tracking')
          .select('program_status, program_ended_at')
          .in('b2b_employee_id', employeeIds)
          .eq('program_status', 'ended')
          .gte('program_ended_at', start.toISOString())
          .lte('program_ended_at', end.toISOString());

        console.log('Programs ended in period:', endedProgramsData?.length);
        console.log('Date range for ended programs:', { start: start.toISOString(), end: end.toISOString() });

        // Get programs that were active during any part of the given period
        // This includes programs that started before the period and ended during it,
        // programs that started during the period, and programs that are still active
        const { data: activeProgramsData } = await supabase
          .from('user_program_tracking')
          .select('program_status, program_started_at, program_ended_at')
          .in('b2b_employee_id', employeeIds)
          .lte('program_started_at', end.toISOString())
          .or(`program_ended_at.gte.${start.toISOString()},program_ended_at.is.null`);

        console.log('Programs active during period:', activeProgramsData?.length);
        console.log('Active programs data:', activeProgramsData);

        const endedPrograms = endedProgramsData?.length || 0;
        const totalPrograms = activeProgramsData?.length || 0;
        const completedProgramsPercentage = totalPrograms > 0 ? 
          Math.round((endedPrograms / totalPrograms) * 100) : 0;

        // Get weekly goals data - query user_goals for active goals in the period
        const { data: activeGoals } = await supabase
          .from('user_goals')
          .select('*')
          .in('user_id', userIds)
          .eq('goal_type', 'weekly_exercise')
          .lte('created_at', end.toISOString());

        console.log('Active weekly goals found:', activeGoals?.length);
        console.log('Active goals data:', activeGoals);

        // Get weekly exercise completion data to determine met goals
        const { data: weeklyCompletionData } = await supabase
          .from('user_weekly_exercise_goals')
          .select('*')
          .in('user_id', userIds)
          .eq('goal_type', 'weekly_exercise');

        console.log('Weekly completion data:', weeklyCompletionData?.length);

        // Calculate goals met vs active for the period
        let totalGoalsMet = 0;
        let totalActiveGoals = activeGoals?.length || 0;

        // For each active goal, check if it was met during the period
        activeGoals?.forEach(goal => {
          const userCompletionData = weeklyCompletionData?.find(wc => wc.user_id === goal.user_id);
          
          if (userCompletionData) {
            // Check weeks within the period and count those that met the goal (>=100%)
            const weeks = [
              userCompletionData.first_month_week,
              userCompletionData.second_month_week,
              userCompletionData.third_month_week,
              userCompletionData.fourth_month_week,
              userCompletionData.fifth_month_week
            ].filter(week => week !== null && week >= 100);
            
            // If any week in the period had 100%+ completion, count as met
            if (weeks.length > 0) {
              totalGoalsMet += 1;
            }
          }
        });

        const weeklyGoalsPercentage = totalActiveGoals > 0 ? 
          Math.round((totalGoalsMet / totalActiveGoals) * 100) : 0;

        setData({
          completedExercises: {
            completed: completedCount,
            total: totalPossibleExercises,
            percentage: completedPercentage
          },
          completedPrograms: {
            completed: endedPrograms,
            total: totalPrograms,
            percentage: completedProgramsPercentage
          },
          weeklyGoals: {
            met: totalGoalsMet,
            total: totalActiveGoals,
            percentage: weeklyGoalsPercentage
          }
        });

      } catch (error) {
        console.error('Error fetching exercise engagement data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagementData();

    // Set up real-time subscription for exercise clicks
    const channel = supabase
      .channel('exercise-engagement-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exercise_completion_clicks'
        },
        (payload) => {
          console.log('Exercise completion click change detected:', payload);
          fetchEngagementData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_program_tracking'
        },
        () => {
          console.log('Program tracking change detected');
          fetchEngagementData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_weekly_exercise_goals'
        },
        () => {
          fetchEngagementData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_goals'
        },
        () => {
          console.log('User goals change detected');
          fetchEngagementData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getDateRange]);

  return { data, loading };
};