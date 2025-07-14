import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateFilterProvider } from '@/contexts/DateFilterContext';
import PageHeader from '@/components/layout/PageHeader';
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, Send, Users, Calendar } from 'lucide-react';

interface Department {
  id: string;
  department_name: string;
}

interface UserProfile {
  first_name: string;
  b2b_partner_name: string;
}

const ActionRoom = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [highRiskCount, setHighRiskCount] = useState<number>(0);
  
  // Campaign form states
  const [campaignType, setCampaignType] = useState<string>('');
  const [targetDepartment, setTargetDepartment] = useState<string>('');
  const [campaignTopic, setCampaignTopic] = useState<string>('');
  const [invitationType, setInvitationType] = useState<string>('');
  const [rotationPeriod, setRotationPeriod] = useState<string>('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  const campaignTypes = ['poster', 'email', 'billboard', 'sms', 'social media'];
  const differentials = ['back pain', 'neck pain', 'shoulder pain', 'wrist pain', 'knee pain'];
  const invitationTypes = ['email', 'sms'];
  const rotationPeriods = ['3 months', '6 months', '9 months', '12 months'];
  const focusOptions = ['definition', 'symptoms', 'exercises', 'behavioural tips'];

  useEffect(() => {
    fetchUserProfile();
    fetchDepartments();
    fetchHighRiskCount();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_profiles')
        .select('first_name, b2b_partner_name')
        .eq('user_id', user.id)
        .single();
      
      if (data) setUserProfile(data);
    }
  };

  const fetchDepartments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('company_departments')
        .select('id, department_name')
        .order('department_name');
      
      if (data) setDepartments(data);
    }
  };

  const fetchHighRiskCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('b2b_partner_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile?.b2b_partner_id) return;

      const { data: employees } = await supabase
        .from('b2b_employees')
        .select('user_id')
        .eq('b2b_partner_id', userProfile.b2b_partner_id)
        .not('user_id', 'is', null);

      if (!employees?.length) return;

      const userIds = employees.map(emp => emp.user_id);
      
      const { data: orebroResponses } = await supabase
        .from('orebro_responses')
        .select('user_id, risk_level, updated_at')
        .in('user_id', userIds)
        .order('updated_at', { ascending: false });

      if (!orebroResponses) return;

      const latestResponses = new Map();
      orebroResponses.forEach(response => {
        if (!latestResponses.has(response.user_id)) {
          latestResponses.set(response.user_id, response);
        }
      });

      const currentHighRisk = Array.from(latestResponses.values())
        .filter(response => response.risk_level && response.risk_level.toLowerCase().trim() === 'high').length;

      setHighRiskCount(currentHighRisk);
    } catch (error) {
      console.error('Error fetching high risk count:', error);
    }
  };

  const handleFocusAreaChange = (area: string, checked: boolean) => {
    if (checked) {
      setFocusAreas([...focusAreas, area]);
    } else {
      setFocusAreas(focusAreas.filter(f => f !== area));
    }
  };

  return (
    <DateFilterProvider>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <PageHeader 
              title={t('actionRoom.title')}
              subtitle={t('actionRoom.subtitle')}
            />
            <LanguageSwitcher />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select Departments:</label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose department..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.department_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* Container 1: Custom Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>Our {userProfile?.b2b_partner_name || 'Company'} Campaigns</CardTitle>
              
              {/* Credits Dashboard */}
              <div className="flex gap-4 mb-4">
                <Badge variant="outline" className="px-4 py-2">
                  Credits used this month: <span className="font-bold ml-1">1,240</span>
                </Badge>
                <Badge variant="outline" className="px-4 py-2">
                  Free monthly credits: <span className="font-bold ml-1">800/2,000</span> (free)
                </Badge>
              </div>
              
              <p className="text-muted-foreground">
                Create a custom campaign and increase the health awareness of your workforce.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <p>Hey Pebee,</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span>create a new</span>
                  <Select value={campaignType} onValueChange={setCampaignType}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="type" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>campaign for our</span>
                  <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.department_name}>
                          {dept.department_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>colleagues about</span>
                  <Select value={campaignTopic} onValueChange={setCampaignTopic}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {differentials.map((diff) => (
                        <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-lg space-y-4">
                <p>Hello {userProfile?.first_name || 'there'},</p>
                <p>sure, I'll be happy to prepare the campaign for you!</p>
                <div>
                  <p className="mb-3">What do you want me to focus on (multi-choice):</p>
                  <div className="grid grid-cols-2 gap-3">
                    {focusOptions.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={option}
                          checked={focusAreas.includes(option)}
                          onCheckedChange={(checked) => handleFocusAreaChange(option, checked as boolean)}
                        />
                        <label htmlFor={option} className="text-sm">{option}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex items-center gap-2">
                  <Download size={16} />
                  Download Campaign
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Send size={16} />
                  Export Campaign
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Container 2: Help High Risk Employees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                Help High Risk Employees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We have been able to identify <span className="font-bold text-destructive">{highRiskCount}</span> high risk employees.
                Let's help them, {userProfile?.first_name || 'there'}! Send{' '}
                <Select value={invitationType} onValueChange={setInvitationType}>
                  <SelectTrigger className="w-20 inline-flex">
                    <SelectValue placeholder="type" />
                  </SelectTrigger>
                  <SelectContent>
                    {invitationTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {' '}invitation to all high risk employees and ask them what they need.
              </p>
              <Button className="flex items-center gap-2">
                <Send size={16} />
                Send Invitation
              </Button>
            </CardContent>
          </Card>

          {/* Container 3: Rotation Reminder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} />
                Rotation Reminder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Utilize the power of one of the most effective prevention pain and disability actions: workspace rotation.
                Set a regular workplace circulation reminder, so you can consult the possible rotation with your HSE and Manufacturing managers.
              </p>
              
              <div className="flex items-center gap-2">
                <span>Reminder in</span>
                <Select value={rotationPeriod} onValueChange={setRotationPeriod}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="period" />
                  </SelectTrigger>
                  <SelectContent>
                    {rotationPeriods.map((period) => (
                      <SelectItem key={period} value={period}>{period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium mb-2">Reminder window:</p>
                <div className="space-y-2 text-sm">
                  <p>Hello {userProfile?.first_name || 'there'},</p>
                  <p>this is a rotation reminder. The rotation date is upcoming in [days_to_rotation] days.</p>
                  <p>Let's implement the plan:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Review current workstation assignments</li>
                    <li>Identify employees for rotation</li>
                    <li>Coordinate with HSE and Manufacturing managers</li>
                    <li>Schedule and implement the rotation plan</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DateFilterProvider>
  );
};

export default ActionRoom;