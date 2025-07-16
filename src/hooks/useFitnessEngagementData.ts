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
          console.log('No user found');
          setLoading(false);
          return;
        }

        console.log('Current user:', user.id);

        // First, get the user's B2B partner ID
        const { data: userData } = await supabase
          .from('users')
          .select('user_type, hr_manager_id, b2b_employee_id')
          .eq('id', user.id)
          .single();

        console.log('User data:', userData);

        if (!userData) {
          console.log('No user data found');
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
          console.log('HR manager B2B partner ID:', b2bPartnerId);
        } else if (userData.user_type === 'employee' && userData.b2b_employee_id) {
          // Get B2B partner ID from employee
          const { data: employeeData } = await supabase
            .from('b2b_employees')
            .select('b2b_partner_id')
            .eq('id', userData.b2b_employee_id)
            .single();
          
          b2bPartnerId = employeeData?.b2b_partner_id || null;
          console.log('Employee B2B partner ID:', b2bPartnerId);
        }

        if (!b2bPartnerId) {
          console.log('No B2B partner ID found');
          setLoading(false);
          return;
        }

        // Get all employees from the same B2B partner
        const { data: companyEmployees } = await supabase
          .from('b2b_employees')
          .select('user_id')
          .eq('b2b_partner_id', b2bPartnerId)
          .not('user_id', 'is', null);

        console.log('Company employees:', companyEmployees);

        const employeeUserIds = companyEmployees?.map(emp => emp.user_id).filter(Boolean) || [];
        console.log('Employee user IDs:', employeeUserIds);

        if (employeeUserIds.length === 0) {
          console.log('No employee user IDs found');
          setData({
            startedPrograms: {
              count: 0
            },
            popularPrograms: []
          });
          setLoading(false);
          return;
        }

        // Count started programs for company employees
        const { data: startedProgramsData, error: countError } = await supabase
          .from('secondary_programs')
          .select('*')
          .in('user_id', employeeUserIds);

        console.log('Started programs data:', startedProgramsData);
        console.log('Started programs count:', startedProgramsData?.length || 0);
        console.log('Count error:', countError);

        // Get popular programs data
        const { data: programsData, error: programsError } = await supabase
          .from('secondary_programs')
          .select('secondary_program, user_id')
          .in('user_id', employeeUserIds);

        console.log('Programs data:', programsData);
        console.log('Programs error:', programsError);

        // Also query all secondary_programs to see what user_ids exist
        const { data: allPrograms } = await supabase
          .from('secondary_programs')
          .select('user_id')
          .limit(10);

        console.log('Sample of all program user_ids:', allPrograms?.map(p => p.user_id));

        // Let's also check what happens if we query without filtering by user_id
        const { count: totalProgramsCount } = await supabase
          .from('secondary_programs')
          .select('*', { count: 'exact', head: true });

        console.log('Total programs in database:', totalProgramsCount);

        // Count programs by type
        const programCounts: { [key: string]: number } = {};
        programsData?.forEach(program => {
          const programType = program.secondary_program;
          programCounts[programType] = (programCounts[programType] || 0) + 1;
        });

        console.log('Program counts:', programCounts);

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

        console.log('Popular programs:', popularPrograms);

        setData({
          startedPrograms: {
            count: startedProgramsData?.length || 0
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