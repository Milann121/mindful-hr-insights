import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';

const HighRiskEmployeesCard = () => {
  const { t } = useTranslation();
  const { getDateRange } = useDateFilter();
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchHighRiskEmployees = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      
      // Get current user's company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get HR manager's company ID
      const { data: companyId } = await supabase.rpc('get_user_b2b_partner_id', {
        user_id: user.id
      });

      if (!companyId) return;

      // Get all company employees
      const { data: employees } = await supabase
        .from('b2b_employees')
        .select('user_id')
        .eq('b2b_partner_id', companyId)
        .eq('state', 'active')
        .not('user_id', 'is', null);

      if (!employees || employees.length === 0) {
        setHighRiskCount(0);
        setPreviousCount(0);
        return;
      }

      const employeeUserIds = employees.map(emp => emp.user_id).filter(Boolean);

      // Get latest OREBRO responses for each employee within the selected period
      const { data: orebro_responses } = await supabase
        .from('orebro_responses')
        .select('user_id, risk_level, updated_at')
        .in('user_id', employeeUserIds)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString())
        .order('updated_at', { ascending: false });

      // Get the latest response for each employee within the period
      const latestResponses = new Map();
      orebro_responses?.forEach(response => {
        if (!latestResponses.has(response.user_id) || 
            new Date(response.updated_at) > new Date(latestResponses.get(response.user_id).updated_at)) {
          latestResponses.set(response.user_id, response);
        }
      });

      // Count high risk employees
      const currentHighRisk = Array.from(latestResponses.values())
        .filter(response => response.risk_level && response.risk_level.toLowerCase().trim() === 'high').length;

      setHighRiskCount(currentHighRisk);

      // Calculate previous period for comparison
      const periodDuration = end.getTime() - start.getTime();
      const previousStart = new Date(start.getTime() - periodDuration);
      const previousEnd = new Date(start.getTime());

      // Get previous period data
      const { data: previousResponses } = await supabase
        .from('orebro_responses')
        .select('user_id, risk_level, updated_at')
        .in('user_id', employeeUserIds)
        .gte('updated_at', previousStart.toISOString())
        .lte('updated_at', previousEnd.toISOString())
        .order('updated_at', { ascending: false });

      const previousLatestResponses = new Map();
      previousResponses?.forEach(response => {
        if (!previousLatestResponses.has(response.user_id) || 
            new Date(response.updated_at) > new Date(previousLatestResponses.get(response.user_id).updated_at)) {
          previousLatestResponses.set(response.user_id, response);
        }
      });

      const previousHighRisk = Array.from(previousLatestResponses.values())
        .filter(response => response.risk_level && response.risk_level.toLowerCase().trim() === 'high').length;

      setPreviousCount(previousHighRisk);

    } catch (error) {
      console.error('Error fetching high risk employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHighRiskEmployees();
  }, [getDateRange]);

  useEffect(() => {
    // Set up real-time subscription for OREBRO responses
    const channel = supabase
      .channel('high-risk-employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orebro_responses'
        },
        () => {
          console.log('OREBRO response change detected, refreshing high risk count');
          fetchHighRiskEmployees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const changeValue = highRiskCount - previousCount;
  const changePercentage = previousCount > 0 ? Math.round((changeValue / previousCount) * 100) : 0;
  const isPositiveChange = changeValue > 0;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {t('dashboard.highRiskEmployees', 'Zamestnanci s vysokým rizikom')}
        </CardTitle>
        <Users className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {loading ? '-' : highRiskCount}
        </div>
        <div className={`flex items-center text-sm ${
          isPositiveChange ? 'text-red-600' : 'text-green-600'
        }`}>
          <TrendingDown className="h-3 w-3 mr-1" />
          {changePercentage > 0 ? '+' : ''}{changePercentage}%
        </div>
      </CardContent>
    </Card>
  );
};

export default HighRiskEmployeesCard;