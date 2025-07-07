import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import FileUpload from './FileUpload';

interface Department {
  id?: string;
  department_name: string;
  department_headcount: number;
  job_type: 'office_work' | 'manual_work';
  job_properties: string[];
}

interface JobProperty {
  id: string;
  property_name: string;
}

const CompanyProfile = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [employeeHeadcount, setEmployeeHeadcount] = useState(0);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobProperties, setJobProperties] = useState<JobProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCompanyData();
    fetchJobProperties();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's B2B partner info
      const { data: userData } = await supabase
        .from('users')
        .select('hr_manager_id')
        .eq('id', user.id)
        .single();

      if (userData?.hr_manager_id) {
        const { data: hrManager } = await supabase
          .from('hr_managers')
          .select('b2b_partner')
          .eq('id', userData.hr_manager_id)
          .single();

        if (hrManager?.b2b_partner) {
          const { data: partner } = await supabase
            .from('B2B_partners')
            .select('name')
            .eq('id', hrManager.b2b_partner)
            .single();

          if (partner) {
            setCompanyName(partner.name);
          }

          // Get employee count for Test s.r.o.
          const { count } = await supabase
            .from('b2b_employees')
            .select('*', { count: 'exact', head: true })
            .eq('b2b_partner_name', partner?.name || 'Test s.r.o.');

          setEmployeeHeadcount(count || 0);

          // Get departments
          const { data: depts } = await supabase
            .from('company_departments')
            .select(`
              *,
              department_job_properties(
                job_properties(property_name)
              )
            `)
            .eq('b2b_partner_id', hrManager.b2b_partner);

          if (depts) {
            const formattedDepts = depts.map(dept => ({
              id: dept.id,
              department_name: dept.department_name,
              department_headcount: dept.department_headcount,
              job_type: dept.job_type as 'office_work' | 'manual_work',
              job_properties: dept.department_job_properties.map((djp: any) => djp.job_properties.property_name)
            }));
            setDepartments(formattedDepts);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const fetchJobProperties = async () => {
    try {
      const { data } = await supabase
        .from('job_properties')
        .select('*')
        .order('property_name');

      if (data) {
        setJobProperties(data);
      }
    } catch (error) {
      console.error('Error fetching job properties:', error);
    }
  };

  const addDepartment = () => {
    setDepartments([...departments, {
      department_name: '',
      department_headcount: 0,
      job_type: 'office_work',
      job_properties: []
    }]);
  };

  const removeDepartment = async (index: number) => {
    const dept = departments[index];
    if (dept.id) {
      try {
        const { error } = await supabase
          .from('company_departments')
          .delete()
          .eq('id', dept.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting department:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to delete department',
          variant: 'destructive',
        });
        return;
      }
    }
    
    const newDepartments = departments.filter((_, i) => i !== index);
    setDepartments(newDepartments);
  };

  const updateDepartment = (index: number, field: keyof Department, value: any) => {
    const newDepartments = [...departments];
    (newDepartments[index] as any)[field] = value;
    setDepartments(newDepartments);
  };

  const toggleJobProperty = (deptIndex: number, propertyName: string) => {
    const newDepartments = [...departments];
    const dept = newDepartments[deptIndex];
    
    if (dept.job_properties.includes(propertyName)) {
      dept.job_properties = dept.job_properties.filter(p => p !== propertyName);
    } else {
      dept.job_properties = [...dept.job_properties, propertyName];
    }
    
    setDepartments(newDepartments);
  };

  const saveDepartments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the actual partner ID for the current HR manager
      const { data: userData } = await supabase
        .from('users')
        .select('hr_manager_id')
        .eq('id', user.id)
        .single();

      if (!userData?.hr_manager_id) {
        throw new Error('User is not associated with an HR manager');
      }

      const { data: hrManager } = await supabase
        .from('hr_managers')
        .select('b2b_partner')
        .eq('id', userData.hr_manager_id)
        .single();

      if (!hrManager?.b2b_partner) {
        throw new Error('HR manager is not associated with a B2B partner');
      }

      const partnerId = hrManager.b2b_partner;

      for (const dept of departments) {
        if (dept.department_name) {
          const { data: savedDept, error: deptError } = await supabase
            .from('company_departments')
            .upsert({
              id: dept.id,
              b2b_partner_id: partnerId,
              department_name: dept.department_name,
              department_headcount: dept.department_headcount,
              job_type: dept.job_type,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (deptError) throw deptError;

          if (savedDept && dept.job_properties.length > 0) {
            // Delete existing job properties for this department
            await supabase
              .from('department_job_properties')
              .delete()
              .eq('department_id', savedDept.id);

            // Insert new job properties
            const jobPropsToInsert = dept.job_properties.map(propName => {
              const jobProp = jobProperties.find(jp => jp.property_name === propName);
              return {
                department_id: savedDept.id,
                job_property_id: jobProp?.id
              };
            }).filter(item => item.job_property_id);

            if (jobPropsToInsert.length > 0) {
              const { error: propsError } = await supabase
                .from('department_job_properties')
                .insert(jobPropsToInsert);

              if (propsError) throw propsError;
            }
          }
        }
      }

      toast({
        title: t('common.save'),
        description: 'Company profile updated successfully',
      });
      
      setIsEditing(false);
      fetchCompanyData(); // Refresh data
    } catch (error) {
      console.error('Error saving departments:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update company profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setCompanyLogoUrl(data.publicUrl);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to upload company logo',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('profile.companyProfile.title')}</CardTitle>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="companyName">{t('profile.companyProfile.companyName')}</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled
              />
            </div>
            
            <div>
              <Label htmlFor="location">{t('profile.companyProfile.location')}</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter company location"
                disabled={!isEditing}
              />
            </div>
            
            <div>
              <Label htmlFor="headcount">{t('profile.companyProfile.employeeHeadcount')}</Label>
              <Input
                id="headcount"
                type="number"
                value={employeeHeadcount}
                disabled
              />
            </div>
          </div>
          
          <div>
            <Label>{t('profile.companyProfile.companyLogo')}</Label>
          <FileUpload
            onFileSelect={handleLogoUpload}
            currentImageUrl={companyLogoUrl}
            placeholder={t('profile.companyProfile.uploadLogo')}
            className="w-full h-32"
            disabled={!isEditing}
          />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg font-semibold">{t('profile.companyProfile.departments')}</Label>
            {isEditing && (
              <Button onClick={addDepartment} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('profile.companyProfile.addDepartment')}
              </Button>
            )}
          </div>
          
          <div className="space-y-4">
            {departments.map((dept, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>{t('profile.companyProfile.departmentName')}</Label>
                    <Input
                      value={dept.department_name}
                      onChange={(e) => updateDepartment(index, 'department_name', e.target.value)}
                      placeholder="Enter department name"
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div>
                    <Label>{t('profile.companyProfile.departmentHeadcount')}</Label>
                    <Input
                      type="number"
                      value={dept.department_headcount}
                      onChange={(e) => updateDepartment(index, 'department_headcount', parseInt(e.target.value) || 0)}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div>
                    <Label>{t('profile.companyProfile.jobType')}</Label>
                    <Select
                      value={dept.job_type}
                      onValueChange={(value) => updateDepartment(index, 'job_type', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office_work">{t('profile.companyProfile.officeWork')}</SelectItem>
                        <SelectItem value="manual_work">{t('profile.companyProfile.manualWork')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <Label className="mb-2 block">{t('profile.companyProfile.jobProperties')}</Label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {jobProperties.map((prop) => (
                        <div key={prop.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${index}-${prop.property_name}`}
                            checked={dept.job_properties.includes(prop.property_name)}
                            onCheckedChange={() => toggleJobProperty(index, prop.property_name)}
                          />
                          <Label
                            htmlFor={`${index}-${prop.property_name}`}
                            className="text-sm"
                          >
                            {t(`profile.jobProperties.${prop.property_name}`)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {dept.job_properties.map((propName, propIndex) => (
                        <span
                          key={propIndex}
                          className="inline-block px-2 py-1 bg-primary/10 text-primary text-sm rounded-md"
                        >
                          {t(`profile.jobProperties.${propName}`)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeDepartment(index)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
        
        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={saveDepartments} disabled={loading}>
              {loading ? t('common.loading') : t('common.save')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyProfile;