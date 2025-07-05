
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { DateFilterProvider } from '@/contexts/DateFilterContext';
import PageHeader from '@/components/layout/PageHeader';
import OverviewCards from '@/components/dashboard/OverviewCards';
import PainLevelChart from '@/components/dashboard/PainLevelChart';
import TrendsChart from '@/components/dashboard/TrendsChart';
import RiskAnalysisTable from '@/components/dashboard/RiskAnalysisTable';
import TopIssuesChart from '@/components/dashboard/TopIssuesChart';
import ExerciseEngagementCard from '@/components/dashboard/ExerciseEngagementCard';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = t('dashboard.title');
    
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      
      if (!user) {
        navigate('/auth');
      }
    };

    checkUser();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [t, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <DateFilterProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-end items-center p-4 border-b bg-white">
          <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            {t('common.signOut', 'Sign Out')}
          </Button>
        </div>
        <div className="container mx-auto px-6 py-8">
          <PageHeader 
            title={t('dashboard.title')}
            subtitle={t('dashboard.subtitle')}
            showFilters={true}
          />
          
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <OverviewCards />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <PainLevelChart />
              <TrendsChart />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <RiskAnalysisTable />
              <TopIssuesChart />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ExerciseEngagementCard />
              <div className="col-span-2">
                {/* Placeholder for additional content */}
                <div className="h-64 bg-white rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <p className="text-gray-500">{t('common.noData')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="lg:hidden space-y-6">
            <OverviewCards />
            <TrendsChart />
            <TopIssuesChart />
            <PainLevelChart />
            <RiskAnalysisTable />
            <ExerciseEngagementCard />
          </div>
        </div>
      </div>
    </DateFilterProvider>
  );
};

export default Index;
