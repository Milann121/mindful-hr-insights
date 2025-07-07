
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useExerciseEngagementData } from '@/hooks/useExerciseEngagementData';

const ExerciseEngagementCard = () => {
  const { t } = useTranslation();
  const { data, loading } = useExerciseEngagementData();

  const engagementData = [
    { 
      label: t('dashboard.exerciseEngagement.completedExercises'), 
      value: data.completedExercises.completed, 
      total: data.completedExercises.total, 
      percentage: data.completedExercises.percentage 
    },
    { 
      label: t('dashboard.exerciseEngagement.completedPrograms'), 
      value: data.completedPrograms.completed, 
      total: data.completedPrograms.total, 
      percentage: data.completedPrograms.percentage,
      showTooltip: true
    },
    { 
      label: t('dashboard.exerciseEngagement.weeklyGoals'), 
      value: data.weeklyGoals.met, 
      total: data.weeklyGoals.total, 
      percentage: data.weeklyGoals.percentage 
    },
  ];

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.exerciseEngagement.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          engagementData.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">{item.label}</span>
                  {(index === 0 || item.showTooltip) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {index === 0 
                              ? t('dashboard.exerciseEngagement.completedExercisesDescription')
                              : t('dashboard.exerciseEngagement.completedProgramsDescription')
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <span className="text-sm text-gray-500">{item.value}/{item.total}</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
              <div className="text-right">
                <span className="text-xs text-gray-400">{item.percentage}%</span>
              </div>
            </div>
          ))
        )}
        
        <div className="pt-4 space-y-2">
          <Button variant="outline" size="sm" className="w-full">
            {t('dashboard.actions.sendReminder')}
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            {t('dashboard.actions.scheduleCheck')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseEngagementCard;
