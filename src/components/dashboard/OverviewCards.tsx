
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ChartBar, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const OverviewCards = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activePrograms: 0,
    completionRate: 0,
    riskLevel: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        // Get current user's company ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get HR manager's company ID
        const { data: companyId } = await supabase.rpc('get_user_b2b_partner_id', {
          user_id: user.id
        });

        if (!companyId) return;

        // Get total employees count
        const { count: totalEmployees } = await supabase
          .from('b2b_employees')
          .select('*', { count: 'exact', head: true })
          .eq('b2b_partner_id', companyId)
          .eq('state', 'active');

        // Get employee IDs for this company
        const { data: employees } = await supabase
          .from('b2b_employees')
          .select('id, user_id')
          .eq('b2b_partner_id', companyId)
          .eq('state', 'active');

        const employeeIds = employees?.map(emp => emp.id).filter(Boolean) || [];
        const employeeUserIds = employees?.map(emp => emp.user_id).filter(Boolean) || [];

        if (employeeIds.length > 0) {
          // Get active programs count from user_program_tracking
          const { count: activePrograms } = await supabase
            .from('user_program_tracking')
            .select('*', { count: 'exact', head: true })
            .in('b2b_employee_id', employeeIds)
            .eq('program_status', 'active');

          // Get completed programs count from user_program_tracking
          const { count: completedPrograms } = await supabase
            .from('user_program_tracking')
            .select('*', { count: 'exact', head: true })
            .in('b2b_employee_id', employeeIds)
            .eq('program_status', 'ended');

          // Calculate completion rate
          const totalPrograms = (activePrograms || 0) + (completedPrograms || 0);
          const completionRate = totalPrograms > 0 ? Math.round((completedPrograms || 0) / totalPrograms * 100) : 0;

          // Get high risk employees (those with pain level > 6)
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('pain_level_initial, pain_level_followup')
            .in('user_id', employeeUserIds);

          const highRiskCount = profiles?.filter(profile => {
            const currentPainLevel = profile.pain_level_followup || profile.pain_level_initial || 0;
            return currentPainLevel > 6;
          }).length || 0;

          setStats({
            totalEmployees: totalEmployees || 0,
            activePrograms: activePrograms || 0,
            completionRate,
            riskLevel: highRiskCount,
          });
        } else {
          setStats({
            totalEmployees: totalEmployees || 0,
            activePrograms: 0,
            completionRate: 0,
            riskLevel: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const statsConfig = [
    {
      title: t('dashboard.overview.totalEmployees'),
      value: loading ? '-' : stats.totalEmployees.toString(),
      change: '+12%',
      trend: 'up' as const,
      icon: Users,
    },
    {
      title: t('dashboard.overview.activePrograms'),
      value: loading ? '-' : stats.activePrograms.toString(),
      change: '+8%',
      trend: 'up' as const,
      icon: Calendar,
    },
    {
      title: t('dashboard.overview.completionRate'),
      value: loading ? '-' : `${stats.completionRate}%`,
      change: '+5.2%',
      trend: 'up' as const,
      icon: ChartBar,
    },
    {
      title: t('dashboard.overview.riskLevel'),
      value: loading ? '-' : stats.riskLevel.toString(),
      change: '-3%',
      trend: 'down' as const,
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsConfig.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className={`flex items-center text-sm ${
              stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {stat.trend === 'up' ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-1" />
              )}
              {stat.change}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OverviewCards;
