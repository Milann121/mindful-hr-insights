import { supabase } from '@/integrations/supabase/client';

export const getExerciseCompletionData = async (
  userIds: string[],
  start: Date,
  end: Date
) => {
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

  return {
    completed: completedCount,
    total: totalPossibleExercises,
    percentage: completedPercentage
  };
};