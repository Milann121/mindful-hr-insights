import { supabase } from '@/integrations/supabase/client';
import { DateFilterPeriod } from '@/contexts/DateFilterContext';

// Helper function to get weeks that should be counted for a specific period
const getWeeksForPeriod = (periodType: DateFilterPeriod, startDate: Date, endDate: Date): Date[] => {
  const weeks: Date[] = [];
  
  switch (periodType) {
    case 'month-to-date':
    case 'last-month': {
      // For monthly periods, only count weeks that START within the month
      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      // Find first Monday of the month or the Monday that starts the first week of the month
      let weekStart = new Date(monthStart);
      const dayOfWeek = weekStart.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysUntilMonday);
      
      // Only include weeks that start within the month
      while (weekStart <= monthEnd) {
        if (weekStart >= monthStart) {
          weeks.push(new Date(weekStart));
        }
        weekStart.setDate(weekStart.getDate() + 7);
      }
      break;
    }
    
    case 'week-to-date':
    case 'last-week': {
      // For weekly periods, just include the specific week
      let weekStart = new Date(startDate);
      const dayOfWeek = weekStart.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysUntilMonday);
      weeks.push(weekStart);
      break;
    }
    
    default: {
      // For other periods, include all weeks that start within the period
      let weekStart = new Date(startDate);
      const dayOfWeek = weekStart.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysUntilMonday);
      
      while (weekStart <= endDate) {
        if (weekStart >= startDate) {
          weeks.push(new Date(weekStart));
        }
        weekStart.setDate(weekStart.getDate() + 7);
      }
      break;
    }
  }
  
  return weeks;
};

export const getWeeklyGoalsData = async (
  userIds: string[], 
  startDate: Date, 
  endDate: Date, 
  periodType: DateFilterPeriod = 'month-to-date'
) => {
  // Convert dates to consistent format for logging and queries
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  console.log('=== WEEKLY GOALS DEBUG ===');
  console.log('Getting weekly goals for userIds:', userIds);
  console.log('Period type:', periodType);
  console.log('Date range:', startDateStr, 'to', endDateStr);

  // Always filter by company employee user IDs - this is an HR manager dashboard
  if (userIds.length === 0) {
    console.log('No company employees found, returning 0/0');
    return {
      met: 0,
      total: 0,
      percentage: 0
    };
  }

  // Get the specific weeks that should be counted for this period
  const weeksToCount = getWeeksForPeriod(periodType, startDate, endDate);
  console.log('Weeks to count for period:', weeksToCount.map(d => d.toISOString().split('T')[0]));

  if (weeksToCount.length === 0) {
    console.log('No weeks to count for this period');
    return {
      met: 0,
      total: 0,
      percentage: 0
    };
  }

  // Update weekly goal completions for the weeks we need
  await updateWeeklyGoalCompletionsForWeeks(weeksToCount);

  // Get users with weekly goals from company employees only
  const { data: usersWithGoals, error: goalsError } = await supabase
    .from('user_goals')
    .select('user_id, created_at, weekly_exercises_goal')
    .in('user_id', userIds)
    .eq('goal_type', 'weekly_exercise');

  console.log('Users with weekly goals found:', usersWithGoals?.length);
  if (goalsError) {
    console.error('Error fetching user goals:', goalsError);
    console.error('RLS may be blocking access to user_goals table');
  }

  if (!usersWithGoals || usersWithGoals.length === 0) {
    console.log('No users with weekly goals found');
    return {
      met: 0,
      total: 0,
      percentage: 0
    };
  }

  // Get user IDs from users with goals to query completions
  const usersWithGoalIds = usersWithGoals.map(u => u.user_id);
  console.log('User IDs with goals:', usersWithGoalIds);

  // Get weekly goal completions for the specific weeks we're counting
  const weekStartDates = weeksToCount.map(w => w.toISOString().split('T')[0]);
  
  const { data: weeklyCompletions, error: completionsError } = await supabase
    .from('weekly_goal_completions')
    .select('user_id, goal_met, week_start_date, week_end_date, goal_target, exercises_completed')
    .in('user_id', usersWithGoalIds)
    .in('week_start_date', weekStartDates);

  console.log('Weekly goal completions query filters:');
  console.log('- user_id in:', usersWithGoalIds);
  console.log('- week_start_date in:', weekStartDates);
  console.log('Weekly goal completions found:', weeklyCompletions?.length);
  console.log('Weekly completions data:', weeklyCompletions);
  if (completionsError) console.error('Error fetching weekly completions:', completionsError);

  // Count total weekly goals and how many were met for the specific weeks
  let totalWeeklyGoals = 0;
  let totalWeeklyGoalsMet = 0;
  
  weeklyCompletions?.forEach(completion => {
    console.log('Processing completion:', {
      user_id: completion.user_id,
      goal_met: completion.goal_met,
      week_start: completion.week_start_date,
      week_end: completion.week_end_date,
      target: completion.goal_target,
      completed: completion.exercises_completed
    });
    
    // Each completion record represents one weekly goal
    totalWeeklyGoals++;
    
    if (completion.goal_met) {
      totalWeeklyGoalsMet++;
    }
  });

  const weeklyGoalsPercentage = totalWeeklyGoals > 0 ? 
    Math.round((totalWeeklyGoalsMet / totalWeeklyGoals) * 100) : 0;

  console.log('FINAL RESULTS:');
  console.log('- Total weekly goals in period:', totalWeeklyGoals);
  console.log('- Weekly goals met:', totalWeeklyGoalsMet);
  console.log('- Percentage:', weeklyGoalsPercentage);
  console.log('=== END WEEKLY GOALS DEBUG ===');

  return {
    met: totalWeeklyGoalsMet,
    total: totalWeeklyGoals,
    percentage: weeklyGoalsPercentage
  };
};

// Helper function to update weekly goal completions for specific weeks
const updateWeeklyGoalCompletionsForWeeks = async (weeks: Date[]) => {
  console.log('=== UPDATING WEEKLY GOAL COMPLETIONS ===');
  console.log('Weeks to update:', weeks.map(d => d.toISOString().split('T')[0]));

  // Update completions for each specific week
  for (const weekStart of weeks) {
    try {
      console.log('Updating completions for week starting:', weekStart.toISOString().split('T')[0]);
      await supabase.rpc('update_all_weekly_goal_completions', {
        target_week_start: weekStart.toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error updating weekly goal completions for week:', weekStart, error);
    }
  }
  
  console.log('=== FINISHED UPDATING WEEKLY GOAL COMPLETIONS ===');
};