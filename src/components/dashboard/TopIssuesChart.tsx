
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { getCompanyEmployees } from '@/services/exerciseEngagement/employeeService';

type ViewType = 'overall' | 'department' | 'jobProperties';

const TopIssuesChart = () => {
  const { t } = useTranslation();
  const { getDateRange } = useDateFilter();
  const [data, setData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [viewBy, setViewBy] = useState<ViewType>('overall');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedJobProperty, setSelectedJobProperty] = useState<string>('');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [jobProperties, setJobProperties] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch departments and job properties on component mount
  useEffect(() => {
    const fetchFiltersData = async () => {
      try {
        // Fetch departments
        const { data: departmentsData } = await supabase
          .from('company_departments')
          .select('id, department_name');
        
        if (departmentsData) {
          setDepartments(departmentsData.map(d => ({ id: d.id, name: d.department_name })));
        }

        // Fetch job properties
        const { data: jobPropertiesData } = await supabase
          .from('job_properties')
          .select('id, property_name');
        
        if (jobPropertiesData) {
          setJobProperties(jobPropertiesData.map(jp => ({ id: jp.id, name: jp.property_name })));
        }
      } catch (error) {
        console.error('Error fetching filters data:', error);
      }
    };

    fetchFiltersData();
  }, []);

  useEffect(() => {
    const fetchPainAreaData = async () => {
      try {
        setLoading(true);
        const { start, end } = getDateRange();
        
        // Get company employees for current user
        const { employeeIds } = await getCompanyEmployees();
        
        if (employeeIds.length === 0) {
          console.log('No company employees found');
          setData([]);
          return;
        }
        
        let programData: any[] = [];
        
        if (viewBy === 'overall') {
          // Get user_program_tracking data for programs that were active during the selected period
          const { data: fetchedData, error: programError } = await supabase
            .from('user_program_tracking')
            .select(`
              pain_area,
              b2b_employee_id,
              program_started_at,
              program_ended_at,
              program_status
            `)
            .in('b2b_employee_id', employeeIds)
            .lte('program_started_at', end.toISOString())
            .or(`program_ended_at.is.null,program_ended_at.gte.${start.toISOString()}`)
            .neq('program_status', 'deleted');

          if (programError) {
            console.error('Error fetching program tracking data:', programError);
            return;
          }
          programData = fetchedData || [];
        } else if (viewBy === 'department' && selectedDepartment) {
          // Filter by specific department
          const { data: fetchedData, error: programError } = await supabase
            .from('user_program_tracking')
            .select(`
              pain_area,
              b2b_employee_id,
              program_started_at,
              program_ended_at,
              program_status,
              user_id
            `)
            .in('b2b_employee_id', employeeIds)
            .lte('program_started_at', end.toISOString())
            .or(`program_ended_at.is.null,program_ended_at.gte.${start.toISOString()}`)
            .neq('program_status', 'deleted');

          if (programError) {
            console.error('Error fetching program tracking data:', programError);
            return;
          }

          // Filter by department through user_profiles
          if (fetchedData) {
            const userIds = fetchedData.map(p => p.user_id).filter(Boolean);
            const { data: profilesData } = await supabase
              .from('user_profiles')
              .select('user_id, department_id')
              .in('user_id', userIds)
              .eq('department_id', selectedDepartment);

            const filteredUserIds = profilesData?.map(p => p.user_id) || [];
            programData = fetchedData.filter(p => filteredUserIds.includes(p.user_id));
          }
        } else if (viewBy === 'jobProperties' && selectedJobProperty) {
          // Filter by specific job property
          const { data: fetchedData, error: programError } = await supabase
            .from('user_program_tracking')
            .select(`
              pain_area,
              b2b_employee_id,
              program_started_at,
              program_ended_at,
              program_status,
              user_id
            `)
            .in('b2b_employee_id', employeeIds)
            .lte('program_started_at', end.toISOString())
            .or(`program_ended_at.is.null,program_ended_at.gte.${start.toISOString()}`)
            .neq('program_status', 'deleted');

          if (programError) {
            console.error('Error fetching program tracking data:', programError);
            return;
          }

          // Filter by job property through user_profiles and department_job_properties
          if (fetchedData) {
            const userIds = fetchedData.map(p => p.user_id).filter(Boolean);
            const { data: profilesData } = await supabase
              .from('user_profiles')
              .select('user_id, department_id')
              .in('user_id', userIds);

            if (profilesData) {
              const departmentIds = profilesData.map(p => p.department_id).filter(Boolean);
              const { data: jobPropsData } = await supabase
                .from('department_job_properties')
                .select('department_id')
                .in('department_id', departmentIds)
                .eq('job_property_id', selectedJobProperty);

              const validDepartmentIds = jobPropsData?.map(jp => jp.department_id) || [];
              const filteredUserIds = profilesData
                .filter(p => validDepartmentIds.includes(p.department_id))
                .map(p => p.user_id);
              
              programData = fetchedData.filter(p => filteredUserIds.includes(p.user_id));
            }
          }
        }

        console.log('Program data found for pain areas:', programData?.length);
        console.log('Program data:', programData);

        if (!programData || programData.length === 0) {
          console.log('No program data found for selected period and company');
          setData([]);
          return;
        }

        // Count individual pain areas (split comma-separated values)
        const painAreaCounts: Record<string, number> = {};
        programData.forEach((program: any) => {
          if (program.pain_area) {
            // Split comma-separated pain areas and count each individually
            const areas = program.pain_area.split(',').map((area: string) => area.trim().toLowerCase());
            areas.forEach((area: string) => {
              if (area) {
                painAreaCounts[area] = (painAreaCounts[area] || 0) + 1;
              }
            });
          }
        });

        console.log('Pain area counts:', painAreaCounts);

        // Map to chart data with colors
        const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
        const chartData = Object.entries(painAreaCounts).map(([area, count], index) => ({
          name: area.charAt(0).toUpperCase() + area.slice(1),
          value: count,
          color: colors[index % colors.length]
        }));

        setData(chartData);
      } catch (error) {
        console.error('Error in fetchPainAreaData:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPainAreaData();
  }, [getDateRange, viewBy, selectedDepartment, selectedJobProperty]);

  const CustomLegend = () => {
    if (!data || data.length === 0) return null;

    return (
      <div className="mt-4 block sm:hidden">
        <div className="grid grid-cols-1 gap-2">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
              <span className="text-sm text-gray-500 ml-auto">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.topIssues.title')}</CardTitle>
        
        {/* Inline dropdown buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {/* Overall button */}
          <Button
            variant={viewBy === 'overall' ? 'default' : 'outline'}
            onClick={() => {
              setViewBy('overall');
              setSelectedDepartment('');
              setSelectedJobProperty('');
            }}
            className="h-9"
          >
            {t('dashboard.topIssues.viewOptions.overall')}
          </Button>
          
          {/* By Department dropdown */}
          <Select 
            value={viewBy === 'department' ? selectedDepartment : ''} 
            onValueChange={(value) => {
              setViewBy('department');
              setSelectedDepartment(value);
              setSelectedJobProperty('');
            }}
          >
            <SelectTrigger className={`w-auto min-w-[140px] h-9 ${viewBy === 'department' && selectedDepartment ? 'bg-primary text-primary-foreground' : ''}`}>
              <SelectValue placeholder={t('dashboard.topIssues.viewOptions.department')} />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* By Job Property dropdown */}
          <Select 
            value={viewBy === 'jobProperties' ? selectedJobProperty : ''} 
            onValueChange={(value) => {
              setViewBy('jobProperties');
              setSelectedJobProperty(value);
              setSelectedDepartment('');
            }}
          >
            <SelectTrigger className={`w-auto min-w-[140px] h-9 ${viewBy === 'jobProperties' && selectedJobProperty ? 'bg-primary text-primary-foreground' : ''}`}>
              <SelectValue placeholder={t('dashboard.topIssues.viewOptions.jobProperties')} />
            </SelectTrigger>
            <SelectContent>
              {jobProperties.map((jobProp) => (
                <SelectItem key={jobProp.id} value={jobProp.id}>
                  {t(`profile.jobProperties.${jobProp.name}`) || jobProp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        ) : data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  className="hidden sm:block"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" maxBarSize={60}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <CustomLegend />
          </>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">{t('common.noDataAvailable')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopIssuesChart;
