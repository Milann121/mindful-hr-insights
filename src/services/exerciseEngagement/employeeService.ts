import { supabase } from '@/integrations/supabase/client';
import { EmployeeData } from '@/types/exerciseEngagement';

export const getCompanyEmployees = async (): Promise<EmployeeData> => {
  // Get current user's company ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }

  // Get HR manager's company ID
  const { data: companyId } = await supabase.rpc('get_user_b2b_partner_id', {
    user_id: user.id
  });

  console.log('Current user:', user.id);
  console.log('Company ID from RPC:', companyId);

  if (!companyId) {
    console.log('No company ID found - checking if user is HR manager directly');
    throw new Error('No company ID found');
  }

  // Get employee IDs for this company
  const { data: employees } = await supabase
    .from('b2b_employees')
    .select('id, user_id, employee_id')
    .eq('b2b_partner_id', companyId)
    .eq('state', 'active');

  console.log('Employees found for company:', employees?.length);
  console.log('Employee details:', employees);

  const employeeIds = employees?.map(emp => emp.id).filter(Boolean) || [];
  const userIds = employees?.map(emp => emp.user_id).filter(Boolean) || [];

  console.log('Employee IDs:', employeeIds);
  console.log('User IDs:', userIds);

  return { employeeIds, userIds };
};