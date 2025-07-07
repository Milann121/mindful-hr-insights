import { supabase } from '@/integrations/supabase/client';

export const getWeeklyGoalsData = async (userIds: string[]) => {
  // Get weekly goals data - count users with weekly goals (regardless of when they were created)
  const { data: usersWithGoals } = await supabase
    .from('user_goals')
    .select('user_id')
    .in('user_id', userIds)
    .eq('goal_type', 'weekly_exercise');

  console.log('Users with weekly goals found:', usersWithGoals?.length);
  console.log('Users with goals data:', usersWithGoals);

  // Get weekly exercise completion data to determine met goals for the period
  const { data: weeklyCompletionData } = await supabase
    .from('user_weekly_exercise_goals')
    .select('*')
    .in('user_id', userIds)
    .eq('goal_type', 'weekly_exercise');

  console.log('Weekly completion data:', weeklyCompletionData?.length);

  // Calculate users who met their goals vs users who have goals
  let usersWithMetGoals = 0;
  const totalUsersWithGoals = usersWithGoals?.length || 0;

  // For each user with goals, check if they met their goal in any week during the period
  usersWithGoals?.forEach(userGoal => {
    const userCompletionData = weeklyCompletionData?.find(wc => wc.user_id === userGoal.user_id);
    
    if (userCompletionData) {
      // Check weeks within the period and count those that met the goal (>=100%)
      const weeks = [
        userCompletionData.first_month_week,
        userCompletionData.second_month_week,
        userCompletionData.third_month_week,
        userCompletionData.fourth_month_week,
        userCompletionData.fifth_month_week
      ].filter(week => week !== null && week >= 100);
      
      // If any week in the period had 100%+ completion, count this user as having met their goal
      if (weeks.length > 0) {
        usersWithMetGoals += 1;
      }
    }
  });

  const weeklyGoalsPercentage = totalUsersWithGoals > 0 ? 
    Math.round((usersWithMetGoals / totalUsersWithGoals) * 100) : 0;

  return {
    met: usersWithMetGoals,
    total: totalUsersWithGoals,
    percentage: weeklyGoalsPercentage
  };
};