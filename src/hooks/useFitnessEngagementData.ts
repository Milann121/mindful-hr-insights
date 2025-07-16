import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface FitnessEngagementData {
  startedPrograms: {
    started: number;
    total: number;
    percentage: number;
  };
  popularPrograms: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

export const useFitnessEngagementData = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<FitnessEngagementData>({
    startedPrograms: {
      started: 0,
      total: 0,
      percentage: 0
    },
    popularPrograms: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: FitnessEngagementData = {
        startedPrograms: {
          started: 87,
          total: 120,
          percentage: 73
        },
        popularPrograms: [
          {
            name: t('dashboard.fitnessEngagement.programs.yoga'),
            value: 45,
            percentage: 100
          },
          {
            name: t('dashboard.fitnessEngagement.programs.stretching'),
            value: 38,
            percentage: 84
          },
          {
            name: t('dashboard.fitnessEngagement.programs.strength'),
            value: 32,
            percentage: 71
          },
          {
            name: t('dashboard.fitnessEngagement.programs.cardio'),
            value: 28,
            percentage: 62
          },
          {
            name: t('dashboard.fitnessEngagement.programs.pilates'),
            value: 22,
            percentage: 49
          }
        ]
      };

      setData(mockData);
      setLoading(false);
    };

    fetchData();
  }, [t]);

  return { data, loading };
};