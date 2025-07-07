import { supabase } from '@/integrations/supabase/client';

export const getProgramCompletionData = async (
  employeeIds: string[],
  start: Date,
  end: Date
) => {
  // Get programs that ended in the given period
  const { data: endedProgramsData } = await supabase
    .from('user_program_tracking')
    .select('program_status, program_ended_at')
    .in('b2b_employee_id', employeeIds)
    .eq('program_status', 'ended')
    .gte('program_ended_at', start.toISOString())
    .lte('program_ended_at', end.toISOString());

  console.log('Programs ended in period:', endedProgramsData?.length);
  console.log('Date range for ended programs:', { start: start.toISOString(), end: end.toISOString() });

  // Get programs that were active during any part of the given period
  // This includes programs that started before the period and ended during it,
  // programs that started during the period, and programs that are still active
  const { data: activeProgramsData } = await supabase
    .from('user_program_tracking')
    .select('program_status, program_started_at, program_ended_at')
    .in('b2b_employee_id', employeeIds)
    .lte('program_started_at', end.toISOString())
    .or(`program_ended_at.gte.${start.toISOString()},program_ended_at.is.null`);

  console.log('Programs active during period:', activeProgramsData?.length);
  console.log('Active programs data:', activeProgramsData);

  const endedPrograms = endedProgramsData?.length || 0;
  const totalPrograms = activeProgramsData?.length || 0;
  const completedProgramsPercentage = totalPrograms > 0 ? 
    Math.round((endedPrograms / totalPrograms) * 100) : 0;

  return {
    completed: endedPrograms,
    total: totalPrograms,
    percentage: completedProgramsPercentage
  };
};