import { useTranslation } from 'react-i18next';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface TrendsLegendProps {
  payload?: any;
}

export const TrendsLegend = ({ payload }: TrendsLegendProps) => {
  const { t } = useTranslation();

  if (!payload) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-col sm:flex-row justify-center items-start sm:items-center gap-2 sm:gap-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-0.5" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  {entry.dataKey === 'painReduction' && t('dashboard.trends.painReductionDesc')}
                  {entry.dataKey === 'programCompletion' && t('dashboard.trends.programCompletionDesc')}
                  {entry.dataKey === 'exerciseCompliance' && t('dashboard.trends.exerciseComplianceDesc')}
                </p>
              </TooltipContent>
            </UITooltip>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
};