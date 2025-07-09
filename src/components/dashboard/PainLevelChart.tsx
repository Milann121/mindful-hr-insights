
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { getCompanyEmployees } from '@/services/exerciseEngagement/employeeService';

type ViewType = 'overall' | 'department' | 'ageGroup' | 'jobType' | 'jobProperties';

interface PainLevelData {
  name: string;
  value: number;
  color: string;
  category?: string;
}

const PainLevelChart = () => {
  const { t } = useTranslation();
  const { getDateRange } = useDateFilter();
  const [viewType, setViewType] = useState<ViewType>('overall');
  const [data, setData] = useState<PainLevelData[]>([
    { name: t('dashboard.painLevels.low'), value: 0, color: '#10B981' },
    { name: t('dashboard.painLevels.moderate'), value: 0, color: '#F59E0B' },
    { name: t('dashboard.painLevels.high'), value: 0, color: '#EF4444' },
    { name: t('dashboard.painLevels.noData'), value: 0, color: '#6B7280' },
  ]);
  const [loading, setLoading] = useState(true);

  const getAgeGroup = (yearBirth: number | null): string => {
    if (!yearBirth) return 'unknown';
    const age = new Date().getFullYear() - yearBirth;
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    return '55+';
  };

  const categorizePainLevel = (painLevel: number | null): string => {
    if (painLevel === null || painLevel === undefined) return 'noData';
    if (painLevel >= 1 && painLevel <= 3) return 'low';
    if (painLevel >= 4 && painLevel <= 6) return 'moderate';
    if (painLevel >= 7 && painLevel <= 10) return 'high';
    return 'noData';
  };

  const fetchOverallPainData = async (): Promise<PainLevelData[]> => {
    const { start, end } = getDateRange();
    const { employeeIds } = await getCompanyEmployees();
    
    if (employeeIds.length === 0) return getEmptyData();

    const { data: programData, error } = await supabase
      .from('user_program_tracking')
      .select('initial_pain_level')
      .in('b2b_employee_id', employeeIds)
      .lte('program_started_at', end.toISOString())
      .or(`program_ended_at.is.null,program_ended_at.gte.${start.toISOString()}`)
      .neq('program_status', 'deleted');

    if (error) throw error;

    const counts = { low: 0, moderate: 0, high: 0, noData: 0 };
    programData?.forEach(program => {
      const category = categorizePainLevel(program.initial_pain_level);
      counts[category as keyof typeof counts]++;
    });

    return calculatePercentages(counts);
  };

  const fetchDepartmentPainData = async (): Promise<PainLevelData[]> => {
    const { start, end } = getDateRange();
    const { employeeIds } = await getCompanyEmployees();
    
    if (employeeIds.length === 0) return getEmptyData();

    // First get the program data
    const { data: programData, error: programError } = await supabase
      .from('user_program_tracking')
      .select('initial_pain_level, b2b_employee_id')
      .in('b2b_employee_id', employeeIds)
      .lte('program_started_at', end.toISOString())
      .or(`program_ended_at.is.null,program_ended_at.gte.${start.toISOString()}`)
      .neq('program_status', 'deleted');

    if (programError) throw programError;

    // Get employee details with departments
    const { data: employeeData, error: employeeError } = await supabase
      .from('b2b_employees')
      .select(`
        id,
        user_id,
        user_profiles!inner(
          department_id,
          company_departments!inner(department_name)
        )
      `)
      .in('id', employeeIds);

    if (employeeError) throw employeeError;

    const departmentCounts: Record<string, { low: number; moderate: number; high: number; noData: number }> = {};
    
    programData?.forEach(program => {
      const employee = employeeData?.find(emp => emp.id === program.b2b_employee_id);
      const deptName = employee?.user_profiles?.[0]?.company_departments?.[0]?.department_name || 'Unknown';
      
      if (!departmentCounts[deptName]) {
        departmentCounts[deptName] = { low: 0, moderate: 0, high: 0, noData: 0 };
      }
      const category = categorizePainLevel(program.initial_pain_level);
      departmentCounts[deptName][category as keyof typeof departmentCounts[string]]++;
    });

    return Object.entries(departmentCounts).flatMap(([dept, counts]) => 
      calculatePercentages(counts, dept)
    );
  };

  const fetchAgeGroupPainData = async (): Promise<PainLevelData[]> => {
    const { start, end } = getDateRange();
    const { employeeIds } = await getCompanyEmployees();
    
    if (employeeIds.length === 0) return getEmptyData();

    // First get the program data
    const { data: programData, error: programError } = await supabase
      .from('user_program_tracking')
      .select('initial_pain_level, b2b_employee_id')
      .in('b2b_employee_id', employeeIds)
      .lte('program_started_at', end.toISOString())
      .or(`program_ended_at.is.null,program_ended_at.gte.${start.toISOString()}`)
      .neq('program_status', 'deleted');

    if (programError) throw programError;

    // Get employee details with birth year
    const { data: employeeData, error: employeeError } = await supabase
      .from('b2b_employees')
      .select(`
        id,
        user_id,
        user_profiles!inner(year_birth)
      `)
      .in('id', employeeIds);

    if (employeeError) throw employeeError;

    const ageGroupCounts: Record<string, { low: number; moderate: number; high: number; noData: number }> = {};
    
    programData?.forEach(program => {
      const employee = employeeData?.find(emp => emp.id === program.b2b_employee_id);
      const ageGroup = getAgeGroup(employee?.user_profiles?.[0]?.year_birth);
      const ageGroupLabel = t(`dashboard.painLevels.ageGroups.${ageGroup}`);
      
      if (!ageGroupCounts[ageGroupLabel]) {
        ageGroupCounts[ageGroupLabel] = { low: 0, moderate: 0, high: 0, noData: 0 };
      }
      const category = categorizePainLevel(program.initial_pain_level);
      ageGroupCounts[ageGroupLabel][category as keyof typeof ageGroupCounts[string]]++;
    });

    return Object.entries(ageGroupCounts).flatMap(([ageGroup, counts]) => 
      calculatePercentages(counts, ageGroup)
    );
  };

  const fetchJobTypePainData = async (): Promise<PainLevelData[]> => {
    const { start, end } = getDateRange();
    const { employeeIds } = await getCompanyEmployees();
    
    if (employeeIds.length === 0) return getEmptyData();

    // First get the program data
    const { data: programData, error: programError } = await supabase
      .from('user_program_tracking')
      .select('initial_pain_level, b2b_employee_id')
      .in('b2b_employee_id', employeeIds)
      .lte('program_started_at', end.toISOString())
      .or(`program_ended_at.is.null,program_ended_at.gte.${start.toISOString()}`)
      .neq('program_status', 'deleted');

    if (programError) throw programError;

    // Get employee details with job type
    const { data: employeeData, error: employeeError } = await supabase
      .from('b2b_employees')
      .select(`
        id,
        user_id,
        user_profiles!inner(job_type)
      `)
      .in('id', employeeIds);

    if (employeeError) throw employeeError;

    const jobTypeCounts: Record<string, { low: number; moderate: number; high: number; noData: number }> = {};
    
    programData?.forEach(program => {
      const employee = employeeData?.find(emp => emp.id === program.b2b_employee_id);
      const jobType = employee?.user_profiles?.[0]?.job_type || 'Unknown';
      
      if (!jobTypeCounts[jobType]) {
        jobTypeCounts[jobType] = { low: 0, moderate: 0, high: 0, noData: 0 };
      }
      const category = categorizePainLevel(program.initial_pain_level);
      jobTypeCounts[jobType][category as keyof typeof jobTypeCounts[string]]++;
    });

    return Object.entries(jobTypeCounts).flatMap(([jobType, counts]) => 
      calculatePercentages(counts, jobType)
    );
  };

  const fetchJobPropertiesPainData = async (): Promise<PainLevelData[]> => {
    const { start, end } = getDateRange();
    const { employeeIds } = await getCompanyEmployees();
    
    if (employeeIds.length === 0) return getEmptyData();

    // First get the program data
    const { data: programData, error: programError } = await supabase
      .from('user_program_tracking')
      .select('initial_pain_level, b2b_employee_id')
      .in('b2b_employee_id', employeeIds)
      .lte('program_started_at', end.toISOString())
      .or(`program_ended_at.is.null,program_ended_at.gte.${start.toISOString()}`)
      .neq('program_status', 'deleted');

    if (programError) throw programError;

    // Get employee details with job properties
    const { data: employeeData, error: employeeError } = await supabase
      .from('b2b_employees')
      .select(`
        id,
        user_id,
        user_profiles!inner(job_properties)
      `)
      .in('id', employeeIds);

    if (employeeError) throw employeeError;

    const jobPropertiesCounts: Record<string, { low: number; moderate: number; high: number; noData: number }> = {};
    
    programData?.forEach(program => {
      const employee = employeeData?.find(emp => emp.id === program.b2b_employee_id);
      const jobProperties = employee?.user_profiles?.[0]?.job_properties || 'Unknown';
      
      if (!jobPropertiesCounts[jobProperties]) {
        jobPropertiesCounts[jobProperties] = { low: 0, moderate: 0, high: 0, noData: 0 };
      }
      const category = categorizePainLevel(program.initial_pain_level);
      jobPropertiesCounts[jobProperties][category as keyof typeof jobPropertiesCounts[string]]++;
    });

    return Object.entries(jobPropertiesCounts).flatMap(([jobProps, counts]) => 
      calculatePercentages(counts, jobProps)
    );
  };

  const getEmptyData = (): PainLevelData[] => [
    { name: t('dashboard.painLevels.low'), value: 0, color: '#10B981' },
    { name: t('dashboard.painLevels.moderate'), value: 0, color: '#F59E0B' },
    { name: t('dashboard.painLevels.high'), value: 0, color: '#EF4444' },
    { name: t('dashboard.painLevels.noData'), value: 0, color: '#6B7280' },
  ];

  const calculatePercentages = (counts: { low: number; moderate: number; high: number; noData: number }, category?: string): PainLevelData[] => {
    const total = counts.low + counts.moderate + counts.high + counts.noData;
    
    if (total === 0) return getEmptyData();

    const colors = { low: '#10B981', moderate: '#F59E0B', high: '#EF4444', noData: '#6B7280' };
    
    return [
      { 
        name: category ? `${t('dashboard.painLevels.low')} - ${category}` : t('dashboard.painLevels.low'), 
        value: Math.round((counts.low / total) * 100), 
        color: colors.low,
        category 
      },
      { 
        name: category ? `${t('dashboard.painLevels.moderate')} - ${category}` : t('dashboard.painLevels.moderate'), 
        value: Math.round((counts.moderate / total) * 100), 
        color: colors.moderate,
        category 
      },
      { 
        name: category ? `${t('dashboard.painLevels.high')} - ${category}` : t('dashboard.painLevels.high'), 
        value: Math.round((counts.high / total) * 100), 
        color: colors.high,
        category 
      },
      { 
        name: category ? `${t('dashboard.painLevels.noData')} - ${category}` : t('dashboard.painLevels.noData'), 
        value: Math.round((counts.noData / total) * 100), 
        color: colors.noData,
        category 
      },
    ];
  };

  const fetchPainLevelData = async () => {
    try {
      setLoading(true);
      let chartData: PainLevelData[] = [];

      switch (viewType) {
        case 'department':
          chartData = await fetchDepartmentPainData();
          break;
        case 'ageGroup':
          chartData = await fetchAgeGroupPainData();
          break;
        case 'jobType':
          chartData = await fetchJobTypePainData();
          break;
        case 'jobProperties':
          chartData = await fetchJobPropertiesPainData();
          break;
        default:
          chartData = await fetchOverallPainData();
      }

      setData(chartData);
    } catch (error) {
      console.error('Error in fetchPainLevelData:', error);
      setData(getEmptyData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPainLevelData();
  }, [viewType, getDateRange, t]);

  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel('pain-level-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_program_tracking'
        },
        () => {
          fetchPainLevelData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter out zero values for cleaner display
  const filteredData = data.filter(item => item.value > 0);

  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{t('dashboard.painLevels.title')}</CardTitle>
        <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">{t('dashboard.painLevels.overall')}</SelectItem>
            <SelectItem value="department">{t('dashboard.painLevels.byDepartment')}</SelectItem>
            <SelectItem value="ageGroup">{t('dashboard.painLevels.byAgeGroup')}</SelectItem>
            <SelectItem value="jobType">{t('dashboard.painLevels.byJobType')}</SelectItem>
            <SelectItem value="jobProperties">{t('dashboard.painLevels.byJobProperties')}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={filteredData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [
                  `${value}%`, 
                  viewType === 'overall' ? name : name?.toString().split(' - ')[0] || name
                ]} 
              />
              <Legend 
                verticalAlign="bottom" 
                height={viewType === 'overall' ? 24 : 60}
                layout="horizontal"
                align="center"
                wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">
                    {viewType === 'overall' ? value : value?.toString().split(' - ')[0]}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default PainLevelChart;
