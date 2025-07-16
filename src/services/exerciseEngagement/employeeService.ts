import { supabase } from '@/integrations/supabase/client';
import { EmployeeData } from '@/types/exerciseEngagement';

export const getCompanyEmployees = async (): Promise<EmployeeData> => {
  // Get current user's company ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }

  console.log('=== EMPLOYEE SERVICE DEBUG ===');
  console.log('Current user:', user.id);

  // Check if user is HR manager
  const { data: isHRManager } = await supabase.rpc('is_hr_manager', {
    user_id: user.id
  });
  console.log('Is HR manager:', isHRManager);

  // Get HR manager's company ID
  const { data: companyId } = await supabase.rpc('get_user_b2b_partner_id', {
    user_id: user.id
  });

  console.log('Company ID from RPC:', companyId);

  if (!companyId) {
    console.log('No company ID found - user may not be properly set up as HR manager');
    throw new Error('No company ID found. Please ensure you are properly set up as an HR manager.');
  }

  // Get employee IDs for this company
  const { data: employees, error: employeesError } = await supabase
    .from('b2b_employees')
    .select('id, user_id, employee_id')
    .eq('b2b_partner_id', companyId)
    .eq('state', 'active');

  if (employeesError) {
    console.error('Error fetching employees:', employeesError);
    throw new Error(`Failed to fetch employees: ${employeesError.message}`);
  }

  console.log('Employees found for company:', employees?.length);
  console.log('Employee details:', employees);

  const employeeIds = employees?.map(emp => emp.id).filter(Boolean) || [];
  const userIds = employees?.map(emp => emp.user_id).filter(Boolean) || [];

  console.log('Employee IDs:', employeeIds);
  console.log('User IDs:', userIds);
  console.log('=== END EMPLOYEE SERVICE DEBUG ===');

  return { employeeIds, userIds };
};