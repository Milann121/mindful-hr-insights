import { supabase } from '@/integrations/supabase/client';

export const getWeeklyGoalsData = async (userIds: string[], startDate: Date, endDate: Date) => {
  // Convert dates to consistent format for logging and queries
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  console.log('=== WEEKLY GOALS DEBUG ===');
  console.log('Getting weekly goals for userIds:', userIds);
  console.log('Date range:', startDateStr, 'to', endDateStr);
  console.log('Start date object:', startDate);
  console.log('End date object:', endDate);

  // Always filter by company employee user IDs - this is an HR manager dashboard
  if (userIds.length === 0) {
    console.log('No company employees found, returning 0/0');
    return {
      met: 0,
      total: 0,
      percentage: 0
    };
  }

  // First, update weekly goal completions for all weeks that overlap with the period
  await updateWeeklyGoalCompletionsForPeriod(startDate, endDate);

  // Get users with weekly goals from company employees only
  const { data: usersWithGoals, error: goalsError } = await supabase
    .from('user_goals')
    .select('user_id, created_at, weekly_exercises_goal')
    .in('user_id', userIds)
    .eq('goal_type', 'weekly_exercise');

  console.log('Users with weekly goals found:', usersWithGoals?.length);
  console.log('Users with goals data:', usersWithGoals);
  if (goalsError) {
    console.error('Error fetching user goals:', goalsError);
    console.error('RLS may be blocking access to user_goals table');
  }

  const totalUsersWithGoals = usersWithGoals?.length || 0;

  if (totalUsersWithGoals === 0) {
    console.log('No users with weekly goals found');
    return {
      met: 0,
      total: 0,
      percentage: 0
    };
  }

  // Get user IDs from users with goals to query completions
  const usersWithGoalIds = usersWithGoals?.map(u => u.user_id) || [];
  console.log('User IDs with goals:', usersWithGoalIds);

  // Get weekly goal completions for weeks that overlap with the period
  // Changed logic: instead of filtering by week_start_date within range,
  // filter by weeks that overlap with the range (week_start_date <= endDate AND week_end_date >= startDate)
  let weeklyCompletionsQuery = supabase
    .from('weekly_goal_completions')
    .select('user_id, goal_met, week_start_date, week_end_date, goal_target, exercises_completed')
    .lte('week_start_date', endDateStr)
    .gte('week_end_date', startDateStr);

  if (usersWithGoalIds.length > 0) {
    weeklyCompletionsQuery = weeklyCompletionsQuery.in('user_id', usersWithGoalIds);
  }

  const { data: weeklyCompletions, error: completionsError } = await weeklyCompletionsQuery;

  console.log('Weekly goal completions query filters:');
  console.log('- week_start_date <=', endDateStr);
  console.log('- week_end_date >=', startDateStr);
  console.log('- user_id in:', usersWithGoalIds);
  console.log('Weekly goal completions found:', weeklyCompletions?.length);
  console.log('Weekly completions data:', weeklyCompletions);
  if (completionsError) console.error('Error fetching weekly completions:', completionsError);

  // Count total weekly goals and how many were met across all weeks in the period
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

// Helper function to update weekly goal completions for a date range
const updateWeeklyGoalCompletionsForPeriod = async (startDate: Date, endDate: Date) => {
  console.log('=== UPDATING WEEKLY GOAL COMPLETIONS ===');
  console.log('Period:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
  
  // Calculate all week starts that could overlap with the period
  const weekStarts: Date[] = [];
  let currentWeekStart = new Date(startDate);
  
  // Find the Monday of the week containing startDate - go back further to ensure coverage
  const dayOfWeek = currentWeekStart.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentWeekStart.setDate(currentWeekStart.getDate() - daysUntilMonday);
  
  // Go back one more week to ensure we capture any overlapping weeks
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  
  // Extend the end date to ensure we capture all overlapping weeks
  const extendedEndDate = new Date(endDate);
  extendedEndDate.setDate(extendedEndDate.getDate() + 7);
  
  while (currentWeekStart <= extendedEndDate) {
    weekStarts.push(new Date(currentWeekStart));
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  console.log('Week starts to update:', weekStarts.map(d => d.toISOString().split('T')[0]));

  // Update completions for each week
  for (const weekStart of weekStarts) {
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