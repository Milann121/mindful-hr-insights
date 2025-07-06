
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Department {
  id: string;
  department_name: string;
  department_headcount: number;
  job_type: string;
  employee_count: number;
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
          // Get departments for this B2B partner
          const { data: depts } = await supabase
            .from('company_departments')
            .select('*')
            .eq('b2b_partner_id', hrManager.b2b_partner);

          if (depts) {
            // Count employees for each department
            const departmentsWithCounts = await Promise.all(
              depts.map(async (dept) => {
                const { count } = await supabase
                  .from('user_profiles')
                  .select('*', { count: 'exact', head: true })
                  .eq('department_id', dept.id);

                return {
                  ...dept,
                  employee_count: count || 0
                };
              })
            );

            setDepartments(departmentsWithCounts);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>{t('dashboard.riskAnalysis.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('dashboard.riskAnalysis.department')}</TableHead>
              <TableHead>{t('dashboard.riskAnalysis.employees')}</TableHead>
              <TableHead>{t('dashboard.riskAnalysis.avgPainLevel')}</TableHead>
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
                <TableCell>{t('dashboard.riskAnalysis.notAvailable')}</TableCell>
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
      </CardContent>
    </Card>
  );
};

export default RiskAnalysisTable;
