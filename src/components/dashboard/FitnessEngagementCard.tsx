import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useFitnessEngagementData } from '@/hooks/useFitnessEngagementData';

const FitnessEngagementCard = () => {
  const { t } = useTranslation();
  const { data, loading } = useFitnessEngagementData();

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.fitnessEngagement.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <>
            {/* Started Programs Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    {t('dashboard.fitnessEngagement.startedPrograms')}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          {t('dashboard.fitnessEngagement.startedProgramsDescription')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm text-gray-500">
                  {data.startedPrograms.started}/{data.startedPrograms.total}
                </span>
              </div>
              <Progress value={data.startedPrograms.percentage} className="h-2" />
              <div className="text-right">
                <span className="text-xs text-gray-400">{data.startedPrograms.percentage}%</span>
              </div>
            </div>

            {/* Most Popular Programs Horizontal Bar Chart */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  {t('dashboard.fitnessEngagement.mostPopularPrograms')}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        {t('dashboard.fitnessEngagement.mostPopularProgramsDescription')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="space-y-3">
                {data.popularPrograms.map((program, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">{program.name}</span>
                      <span className="text-xs text-gray-500">{program.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${program.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        <div className="pt-4 space-y-2">
          <Button variant="outline" size="sm" className="w-full">
            {t('dashboard.fitnessEngagement.sendReminder')}
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            {t('dashboard.fitnessEngagement.scheduleWellbeingCampaign')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FitnessEngagementCard;