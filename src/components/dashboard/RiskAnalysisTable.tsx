
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Department {
  id: string;
  department_name: string;
  department_headcount: number;
  job_type: string;
  employee_count: number;
  avg_pain_level: number | null;
  trend_direction: string | null;
}

const RiskAnalysisTable = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartmentsWithEmployeeCount();
  }, []);

  const fetchDepartmentsWithEmployeeCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's B2B partner info
      const { data: userData } = await supabase
        .from('users')
        .select('hr_manager_id')
        .eq('id', user.id)
        .single();

      if (userData?.hr_manager_id) {
        const { data: hrManager } = await supabase
          .from('hr_managers')
          .select('b2b_partner')
          .eq('id', userData.hr_manager_id)
          .single();

        if (hrManager?.b2b_partner) {
          // Use the new function to get department data with pain levels
          const { data: deptData, error } = await supabase
            .rpc('calculate_department_avg_pain_level', {
              target_b2b_partner_id: hrManager.b2b_partner
            });

          if (error) {
            console.error('Error fetching department pain levels:', error);
            return;
          }

          if (deptData) {
            // Get trend data for today
            const { data: trendData } = await supabase
              .from('department_pain_trends')
              .select('department_id, trend_direction')
              .eq('b2b_partner_id', hrManager.b2b_partner)
              .eq('calculated_date', new Date().toISOString().split('T')[0]);

            // Combine data with trend information
            const departmentsWithTrends = deptData.map((dept: any) => {
              const trend = trendData?.find(t => t.department_id === dept.department_id);
              return {
                id: dept.department_id,
                department_name: dept.department_name,
                department_headcount: 0, // This will be set from company_departments if needed
                job_type: '', // This will be set from company_departments if needed
                employee_count: Number(dept.employee_count),
                avg_pain_level: dept.avg_pain_level ? Number(dept.avg_pain_level) : null,
                trend_direction: trend?.trend_direction || null
              };
            });

            setDepartments(departmentsWithTrends);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'no_change':
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatPainLevel = (painLevel: number | null, trend: string | null) => {
    if (painLevel === null) {
      return t('dashboard.riskAnalysis.notAvailable');
    }
    
    const trendIcon = getTrendIcon(trend);
    return (
      <div className="flex items-center gap-2">
        <span>{painLevel.toFixed(2)}</span>
        <span>|</span>
        {trendIcon}
      </div>
    );
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>{t('dashboard.riskAnalysis.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    {t('dashboard.riskAnalysis.department')}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('dashboard.riskAnalysis.departmentTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    {t('dashboard.riskAnalysis.employees')}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('dashboard.riskAnalysis.employeesTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    {t('dashboard.riskAnalysis.avgPainLevel')}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('dashboard.riskAnalysis.avgPainLevelTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>{t('dashboard.riskAnalysis.riskLevel')}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.department_name}</TableCell>
                  <TableCell>{dept.employee_count}</TableCell>
                  <TableCell>{formatPainLevel(dept.avg_pain_level, dept.trend_direction)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t('dashboard.riskAnalysis.notAvailable')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      {t('dashboard.actions.takeAction')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default RiskAnalysisTable;
