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
import { Download, Send, Users, Calendar, ArrowUp } from 'lucide-react';
interface Department {
  id: string;
  department_name: string;
}
interface UserProfile {
  first_name: string;
  b2b_partner_name: string;
}
const ActionRoom = () => {
  const {
    t
  } = useTranslation();
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
  const [secondBubbleFocusAreas, setSecondBubbleFocusAreas] = useState<string[]>([]);
  
  // Chat bubble animation states
  const [showGreyBubble, setShowGreyBubble] = useState<boolean>(false);
  const [showTypingDots, setShowTypingDots] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showSecondBlueBubble, setShowSecondBlueBubble] = useState<boolean>(false);
  const [showSecondTypingDots, setShowSecondTypingDots] = useState<boolean>(false);
  const [showSecondGreyBubble, setShowSecondGreyBubble] = useState<boolean>(false);
  const [showThirdGreyBubble, setShowThirdGreyBubble] = useState<boolean>(false);
  const campaignTypes = ['poster', 'email', 'billboard', 'sms', 'social media'];
  const differentials = ['back pain', 'neck pain', 'shoulder pain', 'wrist pain', 'knee pain'];
  const invitationTypes = ['email', 'sms'];
  const rotationPeriods = ['3 months', '6 months', '9 months', '12 months'];
  const focusOptions = ['definition', 'symptoms', 'exercises', 'behavioural tips'];
  const secondBubbleFocusOptions = ['problem description', 'exercises', 'symptoms', 'behavioural tips'];
  useEffect(() => {
    fetchUserProfile();
    fetchDepartments();
    fetchHighRiskCount();
  }, []);

  // Refetch high risk count when department selection changes
  useEffect(() => {
    fetchHighRiskCount();
  }, [selectedDepartment]);
  const fetchUserProfile = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data
      } = await supabase.from('user_profiles').select('first_name, b2b_partner_name').eq('user_id', user.id).single();
      if (data) setUserProfile(data);
    }
  };
  const fetchDepartments = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data
      } = await supabase.from('company_departments').select('id, department_name').order('department_name');
      if (data) setDepartments(data);
    }
  };
  const fetchHighRiskCount = async () => {
    console.log('Starting fetchHighRiskCount...');
    
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    
    console.log('Current user:', user);
    
    if (!user) {
      console.log('No authenticated user found');
      setHighRiskCount(0);
      return;
    }
    
    try {
      // First, let's check if this user is an HR manager
      const { data: userRecord } = await supabase
        .from('users')
        .select('user_type, hr_manager_id')
        .eq('id', user.id)
        .single();
      
      console.log('User record:', userRecord);
      
      if (!userRecord || userRecord.user_type !== 'hr_manager') {
        console.log('User is not an HR manager');
        setHighRiskCount(0);
        return;
      }

      // Get the HR manager's b2b_partner_id
      const { data: hrManager } = await supabase
        .from('hr_managers')
        .select('b2b_partner')
        .eq('id', userRecord.hr_manager_id)
        .single();
      
      console.log('HR Manager data:', hrManager);
      
      if (!hrManager?.b2b_partner) {
        console.log('No b2b_partner found for HR manager');
        setHighRiskCount(0);
        return;
      }

      let employeesQuery = supabase
        .from('b2b_employees')
        .select('user_id, id')
        .eq('b2b_partner_id', hrManager.b2b_partner)
        .not('user_id', 'is', null);

      // If specific department is selected, filter by department
      if (selectedDepartment && selectedDepartment !== 'all') {
        console.log('Filtering by department:', selectedDepartment);
        
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('department_id', selectedDepartment);
        
        console.log('Department user profiles:', userProfiles);
        
        if (!userProfiles?.length) {
          console.log('No users found in selected department');
          setHighRiskCount(0);
          return;
        }
        
        const departmentUserIds = userProfiles.map(profile => profile.user_id);
        employeesQuery = employeesQuery.in('user_id', departmentUserIds);
      }

      const { data: employees } = await employeesQuery;
      console.log('Employees found:', employees);
      
      if (!employees?.length) {
        console.log('No employees found');
        setHighRiskCount(0);
        return;
      }

      const userIds = employees.map(emp => emp.user_id);
      console.log('Employee user IDs:', userIds);
      
      const {
        data: orebroResponses
      } = await supabase.from('orebro_responses').select('user_id, risk_level, updated_at').in('user_id', userIds).order('updated_at', {
        ascending: false
      });
      
      console.log('OREBRO responses:', orebroResponses);
      
      if (!orebroResponses?.length) {
        console.log('No OREBRO responses found');
        setHighRiskCount(0);
        return;
      }
      
      const latestResponses = new Map();
      orebroResponses.forEach(response => {
        if (!latestResponses.has(response.user_id)) {
          latestResponses.set(response.user_id, response);
        }
      });
      
      console.log('Latest responses per user:', Array.from(latestResponses.values()));
      
      const currentHighRisk = Array.from(latestResponses.values()).filter(response => response.risk_level && response.risk_level.toLowerCase().trim() === 'high').length;
      
      console.log('High risk count calculated:', currentHighRisk);
      setHighRiskCount(currentHighRisk);
    } catch (error) {
      console.error('Error fetching high risk count:', error);
      setHighRiskCount(0);
    }
  };
  const handleFocusAreaChange = (area: string, checked: boolean) => {
    if (checked) {
      setFocusAreas([...focusAreas, area]);
    } else {
      setFocusAreas(focusAreas.filter(f => f !== area));
    }
  };

  const handleSendMessage = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowTypingDots(true);
    
    setTimeout(() => {
      setShowTypingDots(false);
      setShowGreyBubble(true);
      setIsAnimating(false);
      
      // Start timer for second blue bubble
      setTimeout(() => {
        setShowSecondBlueBubble(true);
      }, 3000);
    }, 2000);
  };

  const handleSecondSendMessage = () => {
    console.log('Second blue bubble send clicked');
    
    setShowSecondTypingDots(true);
    
    setTimeout(() => {
      setShowSecondTypingDots(false);
      setShowSecondGreyBubble(true);
    }, 2000);
  };

  const handleSecondBubbleFocusAreaChange = (area: string, checked: boolean) => {
    if (checked) {
      setSecondBubbleFocusAreas([...secondBubbleFocusAreas, area]);
    } else {
      setSecondBubbleFocusAreas(secondBubbleFocusAreas.filter(f => f !== area));
    }
  };

  const handleConfirmCampaign = () => {
    setShowThirdGreyBubble(true);
  };
  return <DateFilterProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-end items-center gap-4 p-4 border-b bg-white">
          <LanguageSwitcher />
        </div>
        <div className="container mx-auto px-6 py-8">
          <PageHeader title={t('actionRoom.title')} subtitle={t('actionRoom.subtitle')} />
          
          <div className="space-y-6">
            {/* Department Filter */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <label className="text-sm font-medium">Select Departments:</label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Choose department..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {departments.map(dept => <SelectItem key={dept.id} value={dept.id}>
                    {dept.department_name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>


          {/* Container 1: Custom Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>Our {userProfile?.b2b_partner_name || 'Company'} Campaigns</CardTitle>
              
              {/* Credits Dashboard */}
              <div className="flex flex-col gap-1 md:flex-row md:gap-4 mb-4">
                <Badge variant="outline" className="px-4 py-2 mx-0 my-[25px]">
                  Credits used this month: <span className="font-bold ml-1">1,240</span>
                </Badge>
                <Badge variant="outline" className="px-4 py-2 my-[25px]">
                  Free monthly credits: <span className="font-bold ml-1">800/2,000</span> (free)
                </Badge>
              </div>
              
              <p className="text-zinc-950 text-lg font-thin">
                Create a custom campaign and increase the health awareness of your workforce.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Message - Blue bubble from right */}
              <div className="flex justify-end mb-4">
                <div className="relative bg-blue-500 text-white p-4 rounded-2xl rounded-br-md w-full sm:w-full md:w-full lg:max-w-2xl lg:w-1/2 shadow-sm">
                  <p className="mb-2">Hey Pebee,</p>
                   <div className="flex flex-wrap items-center gap-2 text-sm">
                     <span>create a new</span>
                     <Select value={campaignType} onValueChange={setCampaignType}>
                       <SelectTrigger className="w-20 h-6 text-xs bg-blue-600 border-blue-400 text-white">
                         <SelectValue placeholder="type" />
                       </SelectTrigger>
                       <SelectContent>
                         {campaignTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                       </SelectContent>
                     </Select>
                     <span>campaign for our</span>
                     <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                       <SelectTrigger className="w-20 h-6 text-xs bg-blue-600 border-blue-400 text-white">
                         <SelectValue placeholder="dept" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All</SelectItem>
                         {departments.map(dept => <SelectItem key={dept.id} value={dept.department_name}>
                             {dept.department_name}
                           </SelectItem>)}
                       </SelectContent>
                     </Select>
                     <span>colleagues about</span>
                     <Select value={campaignTopic} onValueChange={setCampaignTopic}>
                       <SelectTrigger className="w-20 h-6 text-xs bg-blue-600 border-blue-400 text-white">
                         <SelectValue placeholder="topic" />
                       </SelectTrigger>
                       <SelectContent>
                         {differentials.map(diff => <SelectItem key={diff} value={diff}>{diff}</SelectItem>)}
                       </SelectContent>
                     </Select>
                     <span>.</span>
                   </div>
                  
                  {/* Send Icon - positioned in bottom right corner */}
                  <button
                    onClick={handleSendMessage}
                    disabled={isAnimating}
                    className="absolute bottom-2 right-2 bg-white hover:bg-gray-100 rounded-full p-1.5 transition-colors disabled:opacity-50"
                  >
                    <ArrowUp size={16} className="text-blue-500" />
                  </button>
                </div>
              </div>

              {/* Typing Dots Animation */}
              {showTypingDots && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-200 text-gray-900 p-4 rounded-2xl rounded-bl-md w-fit shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bot Response - Grey bubble from left */}
              {showGreyBubble && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-200 text-gray-900 p-4 rounded-2xl rounded-bl-md w-full sm:w-full md:w-full lg:max-w-2xl lg:w-1/2 shadow-sm animate-fade-in">
                    <p className="mb-2">Hello {userProfile?.first_name || 'there'},</p>
                    <p className="mb-3">sure, I'll be happy to prepare the campaign for you!</p>
                    <p className="text-sm">What topics do you want me to focus on?</p>
                  </div>
                </div>
              )}

              {/* Second Blue Bubble - appears after 3 seconds */}
              {showSecondBlueBubble && (
                <div className="flex justify-end mb-4">
                  <div className="relative bg-blue-500 text-white p-4 rounded-2xl rounded-br-md w-full sm:w-full md:w-full lg:max-w-2xl lg:w-1/2 shadow-sm animate-fade-in">
                    <p className="mb-3">Pebee, I want you to focus on:</p>
                    <div className="space-y-2 mb-6">
                      {secondBubbleFocusOptions.map(option => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`second-${option}`}
                            checked={secondBubbleFocusAreas.includes(option)}
                            onCheckedChange={(checked) => handleSecondBubbleFocusAreaChange(option, checked as boolean)}
                            className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-500"
                          />
                          <label htmlFor={`second-${option}`} className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                    
                    {/* Send Icon - positioned in bottom right corner */}
                    <button
                      onClick={handleSecondSendMessage}
                      className="absolute bottom-2 right-2 bg-white hover:bg-gray-100 rounded-full p-1.5 transition-colors"
                    >
                      <ArrowUp size={16} className="text-blue-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Second Typing Dots Animation */}
              {showSecondTypingDots && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-200 text-gray-900 p-4 rounded-2xl rounded-bl-md w-fit shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Second Grey Bubble - appears after second typing dots */}
              {showSecondGreyBubble && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-200 text-gray-900 p-4 rounded-2xl rounded-bl-md w-full sm:w-full md:w-full lg:max-w-2xl lg:w-1/2 shadow-sm animate-fade-in">
                    <p className="mb-2">Sure, let's do this {userProfile?.first_name || ''}.</p>
                    <p className="text-sm mb-4">Give me a few seconds to prepare a nice and functional campaign for you. When created, preview the campaign and let me know if you are satisfied or ready to download and distribute.</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Please, confirm to create the campaign.</p>
                      <Button 
                        onClick={handleConfirmCampaign}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Third Grey Bubble - appears after confirm is clicked */}
              {showThirdGreyBubble && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-200 text-gray-900 p-4 rounded-2xl rounded-bl-md w-full sm:w-full md:w-full lg:max-w-2xl lg:w-1/2 shadow-sm animate-fade-in">
                    <p className="mb-4 text-sm">Creating your campaign...</p>
                    <div className="flex gap-4 justify-center">
                      {/* Poster 1 */}
                      <div className="relative w-20 h-28 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg shadow-md border-2 border-blue-300 animate-pulse">
                        <div className="absolute inset-2 space-y-1">
                          <div className="h-2 bg-blue-300 rounded animate-fade-in" style={{animationDelay: '0.5s'}}></div>
                          <div className="h-1 bg-blue-300 rounded animate-fade-in" style={{animationDelay: '1s'}}></div>
                          <div className="h-1 bg-blue-300 rounded animate-fade-in" style={{animationDelay: '1.5s'}}></div>
                          <div className="h-8 bg-blue-300 rounded animate-fade-in" style={{animationDelay: '2s'}}></div>
                        </div>
                      </div>
                      
                      {/* Poster 2 */}
                      <div className="relative w-20 h-28 bg-gradient-to-br from-green-100 to-green-200 rounded-lg shadow-md border-2 border-green-300 animate-pulse">
                        <div className="absolute inset-2 space-y-1">
                          <div className="h-2 bg-green-300 rounded animate-fade-in" style={{animationDelay: '0.7s'}}></div>
                          <div className="h-1 bg-green-300 rounded animate-fade-in" style={{animationDelay: '1.2s'}}></div>
                          <div className="h-1 bg-green-300 rounded animate-fade-in" style={{animationDelay: '1.7s'}}></div>
                          <div className="h-8 bg-green-300 rounded animate-fade-in" style={{animationDelay: '2.2s'}}></div>
                        </div>
                      </div>
                      
                      {/* Poster 3 */}
                      <div className="relative w-20 h-28 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg shadow-md border-2 border-purple-300 animate-pulse">
                        <div className="absolute inset-2 space-y-1">
                          <div className="h-2 bg-purple-300 rounded animate-fade-in" style={{animationDelay: '0.9s'}}></div>
                          <div className="h-1 bg-purple-300 rounded animate-fade-in" style={{animationDelay: '1.4s'}}></div>
                          <div className="h-1 bg-purple-300 rounded animate-fade-in" style={{animationDelay: '1.9s'}}></div>
                          <div className="h-8 bg-purple-300 rounded animate-fade-in" style={{animationDelay: '2.4s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 md:flex-row md:gap-3">
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
              <div>
                <p>
                  We have been able to identify{' '}
                  <span 
                    className={`font-bold ${
                      highRiskCount === 0 
                        ? 'text-green-600' 
                        : 'text-red-600 animate-pulse'
                    }`}
                  >
                    {highRiskCount}
                  </span>{' '}
                  high risk employees.
                </p>
                <p>
                  Let's help them, {userProfile?.first_name || 'there'}! Send{' '}
                  <Select value={invitationType} onValueChange={setInvitationType}>
                    <SelectTrigger className="w-20 inline-flex">
                      <SelectValue placeholder="type" />
                    </SelectTrigger>
                    <SelectContent>
                      {invitationTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {' '}invitation to all high risk employees and ask them what they need.
                </p>
              </div>
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
                    {rotationPeriods.map(period => <SelectItem key={period} value={period}>{period}</SelectItem>)}
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
      </div>
    </DateFilterProvider>;
};
export default ActionRoom;