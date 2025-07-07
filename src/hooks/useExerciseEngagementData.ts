import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';

interface ExerciseEngagementData {
  completedExercises: {
    completed: number;
    total: number;
    percentage: number;
  };
  favoriteExercises: {
    count: number;
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
    favoriteExercises: { count: 0, total: 0, percentage: 0 },
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

        if (!companyId) return;

        // Get employee IDs for this company
        const { data: employees } = await supabase
          .from('b2b_employees')
          .select('id, user_id')
          .eq('b2b_partner_id', companyId)
          .eq('state', 'active');

        const employeeIds = employees?.map(emp => emp.id).filter(Boolean) || [];
        const userIds = employees?.map(emp => emp.user_id).filter(Boolean) || [];

        if (employeeIds.length === 0) {
          setData({
            completedExercises: { completed: 0, total: 0, percentage: 0 },
            favoriteExercises: { count: 0, total: 0, percentage: 0 },
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

        // For now, we'll estimate total exercises based on active programs
        // Assuming each active program has approximately 20 exercises
        const totalEstimatedExercises = (activePrograms?.length || 0) * 20;

        // Get completed exercises for these users within the date range
        const { data: completedExercises } = await supabase
          .from('completed_exercises')
          .select('id')
          .in('user_id', userIds)
          .gte('completed_at', start.toISOString())
          .lte('completed_at', end.toISOString());

        const completedCount = completedExercises?.length || 0;
        const completedPercentage = totalEstimatedExercises > 0 ? 
          Math.round((completedCount / totalEstimatedExercises) * 100) : 0;

        // Get favorite exercises count
        const { data: favoriteExercises } = await supabase
          .from('favorite_exercises')
          .select('id')
          .in('user_id', userIds);

        const favoritesCount = favoriteExercises?.length || 0;
        // Estimate total available exercises as 100 for percentage calculation
        const totalAvailableExercises = 100;
        const favoritesPercentage = Math.min(100, Math.round((favoritesCount / totalAvailableExercises) * 100));

        // Get weekly goals data
        const currentMonth = start.toISOString().slice(0, 7) + '-01';
        const { data: weeklyGoals } = await supabase
          .from('user_weekly_exercise_goals')
          .select('*')
          .in('user_id', userIds)
          .eq('month_year', currentMonth);

        // Calculate average weekly goal completion
        let totalGoalsMet = 0;
        let totalPossibleGoals = 0;

        weeklyGoals?.forEach(goal => {
          const weeks = [
            goal.first_month_week,
            goal.second_month_week,
            goal.third_month_week,
            goal.fourth_month_week,
            goal.fifth_month_week
          ].filter(week => week !== null);
          
          const metGoals = weeks.filter(week => week >= 100).length;
          totalGoalsMet += metGoals;
          totalPossibleGoals += weeks.length;
        });

        const weeklyGoalsPercentage = totalPossibleGoals > 0 ? 
          Math.round((totalGoalsMet / totalPossibleGoals) * 100) : 0;

        setData({
          completedExercises: {
            completed: completedCount,
            total: totalEstimatedExercises,
            percentage: completedPercentage
          },
          favoriteExercises: {
            count: favoritesCount,
            total: totalAvailableExercises,
            percentage: favoritesPercentage
          },
          weeklyGoals: {
            met: totalGoalsMet,
            total: totalPossibleGoals,
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

    // Set up real-time subscription
    const channel = supabase
      .channel('exercise-engagement-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'completed_exercises'
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
          table: 'favorite_exercises'
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
          table: 'user_weekly_exercise_goals'
        },
        () => {
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