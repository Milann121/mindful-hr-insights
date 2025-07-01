
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const RiskAnalysisTable = () => {
  const { t } = useTranslation();

  const departments = [
    { name: 'IT', employees: 156, avgPainLevel: 4.2, riskLevel: 'Medium' },
    { name: 'Manufacturing', employees: 234, avgPainLevel: 6.1, riskLevel: 'High' },
    { name: 'Administration', employees: 89, avgPainLevel: 3.8, riskLevel: 'Low' },
    { name: 'Logistics', employees: 167, avgPainLevel: 5.3, riskLevel: 'Medium' },
    { name: 'Sales', employees: 78, avgPainLevel: 3.2, riskLevel: 'Low' },
  ];

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
            {departments.map((dept) => (
              <TableRow key={dept.name}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell>{dept.employees}</TableCell>
                <TableCell>{dept.avgPainLevel}</TableCell>
                <TableCell>
                  <Badge variant={getRiskColor(dept.riskLevel)}>
                    {dept.riskLevel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    {t('dashboard.actions.viewDetails')}
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
