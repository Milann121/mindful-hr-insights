import { supabase } from '@/integrations/supabase/client';

export const getWeeklyGoalsData = async (userIds: string[], startDate: Date, endDate: Date) => {
  // First, update weekly goal completions for all weeks in the period
  await updateWeeklyGoalCompletionsForPeriod(startDate, endDate);

  // Get users with weekly goals (from the company employees)
  const { data: usersWithGoals } = await supabase
    .from('user_goals')
    .select('user_id')
    .in('user_id', userIds)
    .eq('goal_type', 'weekly_exercise');

  console.log('Users with weekly goals found:', usersWithGoals?.length);
  console.log('Users with goals data:', usersWithGoals);

  const totalUsersWithGoals = usersWithGoals?.length || 0;

  if (totalUsersWithGoals === 0) {
    return {
      met: 0,
      total: 0,
      percentage: 0
    };
  }

  // Get weekly goal completions for the period
  const { data: weeklyCompletions } = await supabase
    .from('weekly_goal_completions')
    .select('user_id, goal_met, week_start_date')
    .in('user_id', userIds)
    .gte('week_start_date', startDate.toISOString().split('T')[0])
    .lte('week_start_date', endDate.toISOString().split('T')[0]);

  console.log('Weekly goal completions found:', weeklyCompletions?.length);

  // Count users who met their goals in any week during the period
  const usersWhoMetGoals = new Set();
  weeklyCompletions?.forEach(completion => {
    if (completion.goal_met) {
      usersWhoMetGoals.add(completion.user_id);
    }
  });

  const usersWithMetGoals = usersWhoMetGoals.size;
  const weeklyGoalsPercentage = totalUsersWithGoals > 0 ? 
    Math.round((usersWithMetGoals / totalUsersWithGoals) * 100) : 0;

  return {
    met: usersWithMetGoals,
    total: totalUsersWithGoals,
    percentage: weeklyGoalsPercentage
  };
};

// Helper function to update weekly goal completions for a date range
const updateWeeklyGoalCompletionsForPeriod = async (startDate: Date, endDate: Date) => {
  // Calculate all week starts in the period
  const weekStarts: Date[] = [];
  let currentWeekStart = new Date(startDate);
  
  // Find the Monday of the week containing startDate
  const dayOfWeek = currentWeekStart.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentWeekStart.setDate(currentWeekStart.getDate() - daysUntilMonday);
  
  while (currentWeekStart <= endDate) {
    weekStarts.push(new Date(currentWeekStart));
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  // Update completions for each week
  for (const weekStart of weekStarts) {
    try {
      await supabase.rpc('update_all_weekly_goal_completions', {
        target_week_start: weekStart.toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error updating weekly goal completions for week:', weekStart, error);
    }
  }
};