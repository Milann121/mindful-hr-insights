import { useEffect, useState, useCallback } from 'react';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { ExerciseEngagementData } from '@/types/exerciseEngagement';
import { getCompanyEmployees } from '@/services/exerciseEngagement/employeeService';
import { getExerciseCompletionData } from '@/services/exerciseEngagement/exerciseCompletionService';
import { getProgramCompletionData } from '@/services/exerciseEngagement/programTrackingService';
import { getWeeklyGoalsData } from '@/services/exerciseEngagement/weeklyGoalsService';
import { useExerciseEngagementRealtime } from '@/hooks/useExerciseEngagementRealtime';

export const useExerciseEngagementData = () => {
  const { getDateRange } = useDateFilter();
  const [data, setData] = useState<ExerciseEngagementData>({
    completedExercises: { completed: 0, total: 0, percentage: 0 },
    completedPrograms: { completed: 0, total: 0, percentage: 0 },
    weeklyGoals: { met: 0, total: 0, percentage: 0 }
  });
  const [loading, setLoading] = useState(true);

  const fetchEngagementData = useCallback(async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      
      const { employeeIds, userIds } = await getCompanyEmployees();

      if (employeeIds.length === 0) {
        console.log('No employees found for company');
        setData({
          completedExercises: { completed: 0, total: 0, percentage: 0 },
          completedPrograms: { completed: 0, total: 0, percentage: 0 },
          weeklyGoals: { met: 0, total: 0, percentage: 0 }
        });
        return;
      }

      // Fetch all engagement data in parallel
      const [completedExercises, completedPrograms, weeklyGoals] = await Promise.all([
        getExerciseCompletionData(userIds, start, end),
        getProgramCompletionData(employeeIds, start, end),
        getWeeklyGoalsData(userIds, start, end)
      ]);

      setData({
        completedExercises,
        completedPrograms,
        weeklyGoals
      });

    } catch (error) {
      console.error('Error fetching exercise engagement data:', error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchEngagementData();
  }, [fetchEngagementData]);

  // Set up real-time subscriptions
  useExerciseEngagementRealtime({ onDataChange: fetchEngagementData });

  return { data, loading };
};