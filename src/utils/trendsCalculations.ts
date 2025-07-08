/**
 * Utility functions for trends chart calculations
 */

export const getCurrentWeekOfMonth = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const currentDay = date.getDate();
  const firstWeekday = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate which week we're in (1-based)
  const weekOfMonth = Math.ceil((currentDay + firstWeekday) / 7);
  return Math.min(weekOfMonth, 5); // Cap at 5 weeks
};

export const calculatePainReduction = (monthFollowUpData: any[], monthEndedPrograms: any[]) => {
  const validPainReductions = [];
  
  // Process follow-up responses for this month
  monthFollowUpData.forEach(followUp => {
    // Use the initial pain level from the joined program tracking data
    const initialPainLevel = followUp.user_program_tracking?.[0]?.initial_pain_level;
    if (initialPainLevel && followUp.pain_level) {
      const initial = initialPainLevel;
      const current = followUp.pain_level;
      const reduction = ((initial - current) / initial) * 100;
      validPainReductions.push(reduction);
    }
  });
  
  // Process programs that ended this month
  monthEndedPrograms.forEach(program => {
    if (program.initial_pain_level && program.pain_level_ended) {
      const initial = program.initial_pain_level;
      const current = program.pain_level_ended;
      const reduction = ((initial - current) / initial) * 100;
      validPainReductions.push(reduction);
    }
  });
  
  if (validPainReductions.length === 0) return 0;
  
  return validPainReductions.reduce((sum, reduction) => sum + reduction, 0) / validPainReductions.length;
};

export const calculateProgramCompletion = (monthData: any[]) => {
  if (monthData.length === 0) return 0;
  
  const endedPrograms = monthData.filter(item => item.program_status === 'ended').length;
  const totalPrograms = monthData.length;
  
  return (endedPrograms / totalPrograms) * 100;
};

export const calculateExerciseCompliance = (monthGoalsData: any[], monthDate: Date) => {
  console.log(`=== Calculating Exercise Compliance for ${monthDate.toLocaleDateString()} ===`);
  console.log('Month goals data:', monthGoalsData);
  
  if (monthGoalsData.length === 0) {
    console.log('No monthly goals data, returning 0');
    return 0;
  }
  
  const now = new Date();
  const isCurrentMonth = monthDate.getFullYear() === now.getFullYear() && 
                        monthDate.getMonth() === now.getMonth();
  
  // Fix current week calculation for July 2025
  const currentWeek = isCurrentMonth ? getCurrentWeekOfMonth(now) : 5;
  console.log(`Current week: ${currentWeek}, Is current month: ${isCurrentMonth}`);
  
  let totalCompliance = 0;
  let usersWithValidData = 0;
  
  monthGoalsData.forEach((goal, index) => {
    console.log(`\nProcessing goal ${index + 1} for user ${goal.user_id}:`);
    
    const weeks = [
      goal.first_month_week,
      goal.second_month_week,
      goal.third_month_week,
      goal.fourth_month_week,
      goal.fifth_month_week
    ];
    
    console.log('Raw weeks data:', weeks);
    
    // For current month, only use weeks up to current week
    const weeksToUse = isCurrentMonth ? weeks.slice(0, currentWeek) : weeks;
    console.log(`Weeks to use (up to week ${currentWeek}):`, weeksToUse);
    
    // Filter out null/undefined values but keep 0.0 as valid data
    const validWeeks = weeksToUse.filter(week => week !== null && week !== undefined);
    console.log('Valid weeks (after filtering null/undefined):', validWeeks);
    
    if (validWeeks.length === 0) {
      console.log('No valid weeks data for this user, skipping');
      return; // Skip this user
    }
    
    const weekAverage = validWeeks.reduce((a, b) => a + b, 0) / validWeeks.length;
    console.log(`Week average for this user: ${weekAverage}%`);
    
    totalCompliance += weekAverage;
    usersWithValidData++;
  });
  
  const finalCompliance = usersWithValidData > 0 ? totalCompliance / usersWithValidData : 0;
  console.log(`\nFinal calculation: ${totalCompliance} / ${usersWithValidData} = ${finalCompliance}%`);
  console.log('=== End Exercise Compliance Calculation ===\n');
  
  return finalCompliance;
};

export const calculateMonthlyTrends = (
  programData: any[], 
  weeklyGoalsData: any[], 
  followUpData: any[],
  start: Date, 
  end: Date
) => {
  const months: Array<{ 
    month: string; 
    painReduction: number; 
    programCompletion: number; 
    exerciseCompliance: number; 
  }> = [];

  // Generate months within the date range
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endDate) {
    const monthKey = current.toISOString().slice(0, 7); // YYYY-MM format
    const monthName = current.toLocaleDateString('en', { month: 'short' });
    
    // Get follow-up responses for this month (grouped by when improvements were reported)
    const monthFollowUpData = followUpData.filter(followUp => {
      const followUpDate = new Date(followUp.created_at);
      return followUpDate.getFullYear() === current.getFullYear() && 
             followUpDate.getMonth() === current.getMonth();
    });

    // Get programs that ended this month (also grouped by when improvements were reported)
    const monthEndedPrograms = programData.filter(item => {
      if (!item.program_ended_at) return false;
      const endDate = new Date(item.program_ended_at);
      return endDate.getFullYear() === current.getFullYear() && 
             endDate.getMonth() === current.getMonth();
    });

    // Calculate metrics for this month
    const monthProgramData = programData.filter(item => {
      const itemDate = new Date(item.program_started_at);
      return itemDate.getFullYear() === current.getFullYear() && 
             itemDate.getMonth() === current.getMonth();
    });

    // Get weekly goals for this month
    const monthGoalsData = weeklyGoalsData.filter(goal => {
      const goalDate = new Date(goal.month_year);
      return goalDate.getFullYear() === current.getFullYear() && 
             goalDate.getMonth() === current.getMonth();
    });

    // Pain Reduction: average pain improvement percentage based on when improvements were reported
    const painReduction = calculatePainReduction(monthFollowUpData, monthEndedPrograms);
    
    // Program Completion: % of ended programs
    const programCompletion = calculateProgramCompletion(monthProgramData);
    
    // Exercise Compliance: average from weekly goals
    const exerciseCompliance = calculateExerciseCompliance(monthGoalsData, current);

    months.push({
      month: monthName,
      painReduction: Math.round(painReduction * 100) / 100,
      programCompletion: Math.round(programCompletion * 100) / 100,
      exerciseCompliance: Math.round(exerciseCompliance * 100) / 100
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
};
