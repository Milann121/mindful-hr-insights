import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseExerciseEngagementRealtimeProps {
  onDataChange: () => void;
}

export const useExerciseEngagementRealtime = ({ onDataChange }: UseExerciseEngagementRealtimeProps) => {
  useEffect(() => {
    // Set up real-time subscription for exercise engagement data changes
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
          onDataChange();
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
          onDataChange();
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
          onDataChange();
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
          onDataChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onDataChange]);
};