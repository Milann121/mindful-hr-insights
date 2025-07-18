
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

        // Helper function to create empty department result
        const createEmptyDepartmentResult = (dept: any, trendData: any) => ({
          id: dept.department_id,
          department_name: dept.department_name,
          department_headcount: dept.employee_count || 0,
          job_type: '',
          employee_count: 0,
          avg_pain_level: dept.avg_pain_level ? Number(dept.avg_pain_level) : null,
          trend_direction: trendData?.find((t: any) => t.department_id === dept.department_id)?.trend_direction || null,
          high_risk_percentage: 0 // Return 0% for departments with no employees
        });

        // Helper function to calculate high risk percentage
        const calculateHighRiskPercentage = async (validEmployees: any[], departmentName: string) => {
          console.log(`\n=== CALCULATING HIGH RISK FOR ${departmentName} ===`);
          console.log(`Processing ${validEmployees.length} total employees`);
          console.log(`Employees data:`, validEmployees);

          if (validEmployees.length === 0) {
            console.log(`No employees in department ${departmentName}`);
            return { percentage: 0, details: '0/0' };
          }

          const riskLevels = await Promise.all(
            validEmployees.map(async (employee) => {
              console.log(`Fetching OREBRO for employee: ${employee.first_name} ${employee.last_name} (ID: ${employee.user_id})`);
              
              // Debug: Check if user exists in OREBRO table at all
              console.log(`Checking OREBRO for user_id: ${employee.user_id}`);
              
              // First, let's try a broader query to see if any records exist
              const { data: allOrebro, error: allError } = await supabase
                .from('orebro_responses')
                .select('*')
                .eq('user_id', employee.user_id);

              console.log(`ALL OREBRO records for ${employee.first_name} ${employee.last_name}:`, { data: allOrebro, error: allError });

              // Check the current user's auth context
              const { data: currentUser } = await supabase.auth.getUser();
              console.log(`Current user for OREBRO query: ${currentUser.user?.id}`);

              // Now try the specific query
              const { data: orebro, error } = await supabase
                .from('orebro_responses')
                .select('risk_level, updated_at, user_id, total_score')
                .eq('user_id', employee.user_id)
                .order('updated_at', { ascending: false })
                .limit(1);

              console.log(`OREBRO query result for ${employee.first_name} ${employee.last_name}:`, { data: orebro, error });

              if (error) {
                console.error(`Error fetching OREBRO for ${employee.user_id}:`, error);
                return 'low'; // Treat as low risk on error
              }

              if (!orebro || orebro.length === 0) {
                console.log(`No OREBRO response found for ${employee.first_name} ${employee.last_name} - treating as low risk`);
                return 'low'; // Treat employees without OREBRO as low risk
              }

              const latestOrebro = orebro[0];
              console.log(`${employee.first_name} ${employee.last_name} risk level: "${latestOrebro.risk_level}"`);
              return latestOrebro.risk_level || 'low';
            })
          );

          console.log(`All risk levels for ${departmentName}:`, riskLevels);

          // Filter out null values and ensure we have valid risk levels
          const validRiskLevels = riskLevels.filter(level => level !== null && typeof level === 'string' && level.trim() !== '');
          
          console.log(`Valid risk levels for ${departmentName}:`, validRiskLevels);

          // Count high risk cases (case-insensitive)
          const highRiskCount = validRiskLevels.filter(level => {
            const isHigh = level.toLowerCase().trim() === 'high';
            console.log(`Risk level "${level}" -> isHigh: ${isHigh}`);
            return isHigh;
          }).length;

          // Business logic: (high risk employees / ALL employees in department) * 100
          const percentage = Math.round((highRiskCount / validEmployees.length) * 100);
          
          console.log(`\n=== HIGH RISK CALCULATION RESULT FOR ${departmentName} ===`);
          console.log(`- Total employees in department: ${validEmployees.length}`);
          console.log(`- Employees with valid risk levels: ${validRiskLevels.length}`);
          console.log(`- High risk count: ${highRiskCount}`);
          console.log(`- Calculation: (${highRiskCount} / ${validEmployees.length}) * 100 = ${percentage}%`);
          console.log(`- Final result: ${percentage}% (${highRiskCount}/${validEmployees.length})`);

          return { percentage, details: `${highRiskCount}/${validEmployees.length}` };
        };

        // Get high risk percentages for each department
        const departmentsWithHighRisk = await Promise.all(
          deptData.map(async (dept: any) => {
            console.log(`\n=== PROCESSING DEPARTMENT: ${dept.department_name} (ID: ${dept.department_id}) ===`);
            console.log(`Department data from function:`, dept);
            
            // Get all employees in this department
            const { data: deptEmployees, error: deptError } = await supabase
              .from('user_profiles')
              .select('user_id, first_name, last_name, department_id, employee_id')
              .eq('department_id', dept.department_id)
              .not('user_id', 'is', null);

            console.log(`Employee query for ${dept.department_name}:`, { 
              query: `department_id = ${dept.department_id}`,
              result: deptEmployees, 
              error: deptError 
            });

            if (deptError) {
              console.error(`Error fetching employees for department ${dept.department_name}:`, deptError);
              return createEmptyDepartmentResult(dept, trendData);
            }

            if (!deptEmployees || deptEmployees.length === 0) {
              console.log(`No employees found for department ${dept.department_name}`);
              return createEmptyDepartmentResult(dept, trendData);
            }

            // Filter and validate user IDs
            const validEmployees = deptEmployees.filter(emp => emp.user_id && emp.user_id.trim() !== '');
            console.log(`Valid employees in ${dept.department_name}:`, validEmployees);

            if (validEmployees.length === 0) {
              console.log(`No valid user IDs found for department ${dept.department_name}`);
              return createEmptyDepartmentResult(dept, trendData);
            }

            // Calculate High Risk percentage - THIS IS THE IMPORTANT CALL
            console.log(`About to calculate High Risk for ${dept.department_name} with ${validEmployees.length} employees`);
            const highRiskResult = await calculateHighRiskPercentage(validEmployees, dept.department_name);
            console.log(`High Risk calculation result for ${dept.department_name}:`, highRiskResult);
            
            const trend = trendData?.find((t: any) => t.department_id === dept.department_id);
            const finalResult = {
              id: dept.department_id,
              department_name: dept.department_name,
              department_headcount: dept.employee_count || 0,
              job_type: '',
              employee_count: validEmployees.length,
              avg_pain_level: dept.avg_pain_level ? Number(dept.avg_pain_level) : null,
              trend_direction: trend?.trend_direction || null,
              high_risk_percentage: highRiskResult.percentage
            };
            
            console.log(`Final result for ${dept.department_name}:`, finalResult);
            return finalResult;
          })
        );

        console.log('=== FINAL DEPARTMENTS DATA ===', departmentsWithHighRisk);
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

  const handleTakeAction = (departmentId: string) => {
    const department = departments.find(dept => dept.id === departmentId);
    if (department) {
      const riskLevel = getRiskLevel(department.avg_pain_level);
      const highRiskPercentage = department.high_risk_percentage || 0;
      
      const queryParams = new URLSearchParams({
        department: departmentId,
        riskLevel: riskLevel,
        highRiskPercentage: highRiskPercentage.toString()
      });
      
      navigate(`/action-room?${queryParams.toString()}`);
    }
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
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => handleTakeAction(dept.id)}
                     >
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
