export interface ExerciseEngagementData {
  completedExercises: {
    completed: number;
    total: number;
    percentage: number;
  };
  completedPrograms: {
    completed: number;
    total: number;
    percentage: number;
  };
  weeklyGoals: {
    met: number;
    total: number;
    percentage: number;
  };
}

export interface EmployeeData {
  employeeIds: string[];
  userIds: string[];
}