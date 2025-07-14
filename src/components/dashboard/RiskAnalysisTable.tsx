
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
  high_risk_percentage: number | null;
}

const RiskAnalysisTable = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartmentsWithEmployeeCount();

    // Set up real-time subscription for OREBRO responses changes
    const channel = supabase
      .channel('orebro-responses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orebro_responses'
        },
        (payload) => {
          console.log('OREBRO response change detected:', payload);
          // Refresh department data when OREBRO responses change
          fetchDepartmentsWithEmployeeCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDepartmentsWithEmployeeCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Get user's B2B partner info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('hr_manager_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return;
      }

      if (!userData?.hr_manager_id) {
        console.error('User is not associated with an HR manager');
        return;
      }

      const { data: hrManager, error: hrError } = await supabase
        .from('hr_managers')
        .select('b2b_partner')
        .eq('id', userData.hr_manager_id)
        .single();

      if (hrError) {
        console.error('Error fetching HR manager data:', hrError);
        return;
      }

      if (!hrManager?.b2b_partner) {
        console.error('HR manager is not associated with a B2B partner');
        return;
      }

      console.log('Fetching department data for partner:', hrManager.b2b_partner);

      // Use the fixed function to get department data with pain levels
      const { data: deptData, error } = await supabase
        .rpc('calculate_department_avg_pain_level', {
          target_b2b_partner_id: hrManager.b2b_partner
        });

      if (error) {
        console.error('Error fetching department pain levels:', error);
        return;
      }

      console.log('Department data received:', deptData);

      if (deptData && deptData.length > 0) {
        // Get trend data for today
        const { data: trendData, error: trendError } = await supabase
          .from('department_pain_trends')
          .select('department_id, trend_direction')
          .eq('b2b_partner_id', hrManager.b2b_partner)
          .eq('calculated_date', new Date().toISOString().split('T')[0]);

        if (trendError) {
          console.error('Error fetching trend data:', trendError);
        }

        console.log('Trend data received:', trendData);

        // Get high risk percentages for each department
        const departmentsWithHighRisk = await Promise.all(
          deptData.map(async (dept: any) => {
            console.log(`\n=== Processing department: ${dept.department_name} ===`);
            
            // Get all employees in this department
            const { data: deptEmployees, error: deptError } = await supabase
              .from('user_profiles')
              .select('user_id, first_name, last_name')
              .eq('department_id', dept.department_id);

            if (deptError) {
              console.error('Error fetching department employees:', dept.department_id, deptError);
              return {
                id: dept.department_id,
                department_name: dept.department_name,
                department_headcount: 0,
                job_type: '',
                employee_count: 0,
                avg_pain_level: dept.avg_pain_level ? Number(dept.avg_pain_level) : null,
                trend_direction: trendData?.find(t => t.department_id === dept.department_id)?.trend_direction || null,
                high_risk_percentage: 0
              };
            }

            const employeeUserIds = deptEmployees?.map(emp => emp.user_id) || [];
            console.log(`Found ${employeeUserIds.length} employees in ${dept.department_name}:`, employeeUserIds);
            
            if (employeeUserIds.length === 0) {
              return {
                id: dept.department_id,
                department_name: dept.department_name,
                department_headcount: 0,
                job_type: '',
                employee_count: 0,
                avg_pain_level: dept.avg_pain_level ? Number(dept.avg_pain_level) : null,
                trend_direction: trendData?.find(t => t.department_id === dept.department_id)?.trend_direction || null,
                high_risk_percentage: 0
              };
            }

            // Get the latest OREBRO response for each employee
            const latestRiskLevels = await Promise.all(
              employeeUserIds.map(async (userId) => {
                const { data: latestResponse, error } = await supabase
                  .from('orebro_responses')
                  .select('risk_level, updated_at')
                  .eq('user_id', userId)
                  .order('updated_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (error || !latestResponse) {
                  console.log(`No OREBRO response found for user ${userId}`, error);
                  return null;
                }

                console.log(`User ${userId} latest risk level:`, latestResponse.risk_level);
                return latestResponse.risk_level;
              })
            );

            // Filter out null responses and count high risk
            const validRiskLevels = latestRiskLevels.filter(level => level !== null);
            const highRiskCount = validRiskLevels.filter(level => 
              level && String(level).toLowerCase().trim() === 'high'
            ).length;

            console.log(`Department ${dept.department_name}: ${highRiskCount} high risk out of ${validRiskLevels.length} with responses`);
            
            // Calculate percentage based on employees with OREBRO responses
            const highRiskPercentage = validRiskLevels.length > 0 
              ? Math.round((highRiskCount / validRiskLevels.length) * 100) 
              : 0;

            console.log(`Final high risk percentage for ${dept.department_name}: ${highRiskPercentage}%`);

            const trend = trendData?.find(t => t.department_id === dept.department_id);
            return {
              id: dept.department_id,
              department_name: dept.department_name,
              department_headcount: 0,
              job_type: '',
              employee_count: employeeUserIds.length,
              avg_pain_level: dept.avg_pain_level ? Number(dept.avg_pain_level) : null,
              trend_direction: trend?.trend_direction || null,
              high_risk_percentage: highRiskPercentage
            };
          })
        );

        console.log('Final departments data:', departmentsWithHighRisk);
        setDepartments(departmentsWithHighRisk);
      } else {
        console.log('No department data found');
        setDepartments([]);
      }
    } catch (error) {
      console.error('Unexpected error in fetchDepartmentsWithEmployeeCount:', error);
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

  const getRiskLevel = (painLevel: number | null) => {
    if (painLevel === null) {
      return 'notAvailable';
    }
    if (painLevel >= 0 && painLevel < 4.50) {
      return 'low';
    }
    if (painLevel >= 4.5 && painLevel < 7) {
      return 'medium';
    }
    if (painLevel >= 7 && painLevel <= 10) {
      return 'high';
    }
    return 'notAvailable';
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'default'; // Will be styled green
      case 'medium':
        return 'secondary'; // Will be styled yellow
      case 'high':
        return 'destructive'; // Will be styled red
      default:
        return 'outline';
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
        <p className="text-sm text-muted-foreground">({t('dashboard.riskAnalysis.overallViewOnly')})</p>
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
                <TableHead>
                  <div className="flex items-center gap-2">
                    {t('dashboard.riskAnalysis.highRisk')}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('dashboard.riskAnalysis.highRiskTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.department_name}</TableCell>
                  <TableCell>{dept.employee_count}</TableCell>
                  <TableCell>{formatPainLevel(dept.avg_pain_level, dept.trend_direction)}</TableCell>
                   <TableCell>
                     {(() => {
                       const riskLevel = getRiskLevel(dept.avg_pain_level);
                       const variant = getRiskBadgeVariant(riskLevel);
                       const isHighRisk = riskLevel === 'high';
                       
                       return (
                         <Badge 
                           variant={variant as any}
                           className={`${isHighRisk ? 'animate-pulse bg-red-500 text-white border-red-500' : ''} ${
                             riskLevel === 'low' ? 'bg-green-500 text-white border-green-500' : ''
                           } ${
                             riskLevel === 'medium' ? 'bg-yellow-500 text-white border-yellow-500' : ''
                           }`}
                         >
                           {riskLevel === 'notAvailable' 
                             ? t('dashboard.riskAnalysis.notAvailable')
                             : t(`dashboard.riskAnalysis.riskLevels.${riskLevel}`)
                           }
                         </Badge>
                       );
                     })()}
                    </TableCell>
                   <TableCell>
                     <span className="font-bold text-red-500">
                       {dept.high_risk_percentage !== null ? `${dept.high_risk_percentage}%` : t('dashboard.riskAnalysis.notAvailable')}
                     </span>
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
