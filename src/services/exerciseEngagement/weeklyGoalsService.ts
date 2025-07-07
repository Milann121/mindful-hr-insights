import { supabase } from '@/integrations/supabase/client';

export const getWeeklyGoalsData = async (userIds: string[], startDate: Date, endDate: Date) => {
  // First, update weekly goal completions for all weeks in the period
  await updateWeeklyGoalCompletionsForPeriod(startDate, endDate);

  console.log('Getting weekly goals for userIds:', userIds);
  console.log('Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

  // Always filter by company employee user IDs - this is an HR manager dashboard
  if (userIds.length === 0) {
    console.log('No company employees found, returning 0/0');
    return {
      met: 0,
      total: 0,
      percentage: 0
    };
  }

  // Get users with weekly goals from company employees only
  const { data: usersWithGoals, error: goalsError } = await supabase
    .from('user_goals')
    .select('user_id')
    .in('user_id', userIds)
    .eq('goal_type', 'weekly_exercise');

  console.log('Users with weekly goals found:', usersWithGoals?.length);
  console.log('Users with goals data:', usersWithGoals);
  if (goalsError) console.error('Error fetching user goals:', goalsError);

  const totalUsersWithGoals = usersWithGoals?.length || 0;

  if (totalUsersWithGoals === 0) {
    return {
      met: 0,
      total: 0,
      percentage: 0
    };
  }

  // Get user IDs from users with goals to query completions
  const usersWithGoalIds = usersWithGoals?.map(u => u.user_id) || [];
  console.log('User IDs with goals:', usersWithGoalIds);

  // Get weekly goal completions for the period - query by users who actually have goals
  let weeklyCompletionsQuery = supabase
    .from('weekly_goal_completions')
    .select('user_id, goal_met, week_start_date, goal_target, exercises_completed')
    .gte('week_start_date', startDate.toISOString().split('T')[0])
    .lte('week_start_date', endDate.toISOString().split('T')[0]);

  if (usersWithGoalIds.length > 0) {
    weeklyCompletionsQuery = weeklyCompletionsQuery.in('user_id', usersWithGoalIds);
  }

  const { data: weeklyCompletions, error: completionsError } = await weeklyCompletionsQuery;

  console.log('Weekly goal completions found:', weeklyCompletions?.length);
  console.log('Weekly completions data:', weeklyCompletions);
  if (completionsError) console.error('Error fetching weekly completions:', completionsError);

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