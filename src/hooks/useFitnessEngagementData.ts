import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface FitnessEngagementData {
  startedPrograms: {
    count: number;
  };
  popularPrograms: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

export const useFitnessEngagementData = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<FitnessEngagementData>({
    startedPrograms: {
      count: 0
    },
    popularPrograms: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // First, get the user's B2B partner ID
        const { data: userData } = await supabase
          .from('users')
          .select('user_type, hr_manager_id, b2b_employee_id')
          .eq('id', user.id)
          .single();

        if (!userData) {
          setLoading(false);
          return;
        }

        let b2bPartnerId: number | null = null;

        if (userData.user_type === 'hr_manager' && userData.hr_manager_id) {
          // Get B2B partner ID from HR manager
          const { data: hrData } = await supabase
            .from('hr_managers')
            .select('b2b_partner')
            .eq('id', userData.hr_manager_id)
            .single();
          
          b2bPartnerId = hrData?.b2b_partner || null;
        } else if (userData.user_type === 'employee' && userData.b2b_employee_id) {
          // Get B2B partner ID from employee
          const { data: employeeData } = await supabase
            .from('b2b_employees')
            .select('b2b_partner_id')
            .eq('id', userData.b2b_employee_id)
            .single();
          
          b2bPartnerId = employeeData?.b2b_partner_id || null;
        }

        if (!b2bPartnerId) {
          setLoading(false);
          return;
        }

        // Get all employees from the same B2B partner
        const { data: companyEmployees } = await supabase
          .from('b2b_employees')
          .select('user_id')
          .eq('b2b_partner_id', b2bPartnerId)
          .not('user_id', 'is', null);

        const employeeUserIds = companyEmployees?.map(emp => emp.user_id).filter(Boolean) || [];

        if (employeeUserIds.length === 0) {
          setLoading(false);
          return;
        }

        // Count started programs for company employees
        const { count: startedProgramsCount } = await supabase
          .from('secondary_programs')
          .select('*', { count: 'exact', head: true })
          .in('user_id', employeeUserIds);

        // Get popular programs data
        const { data: programsData } = await supabase
          .from('secondary_programs')
          .select('secondary_program')
          .in('user_id', employeeUserIds);

        // Count programs by type
        const programCounts: { [key: string]: number } = {};
        programsData?.forEach(program => {
          const programType = program.secondary_program;
          programCounts[programType] = (programCounts[programType] || 0) + 1;
        });

        // Sort by count and get top 5
        const sortedPrograms = Object.entries(programCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);

        const maxCount = sortedPrograms[0]?.[1] || 1;

        const popularPrograms = sortedPrograms.map(([programType, count]) => ({
          name: t(`dashboard.fitnessEngagement.programs.${programType.toLowerCase()}`) || programType,
          value: count,
          percentage: Math.round((count / maxCount) * 100)
        }));

        setData({
          startedPrograms: {
            count: startedProgramsCount || 0
          },
          popularPrograms
        });
      } catch (error) {
        console.error('Error fetching fitness engagement data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t]);

  return { data, loading };
};