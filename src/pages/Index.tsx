
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import OverviewCards from '@/components/dashboard/OverviewCards';
import PainLevelChart from '@/components/dashboard/PainLevelChart';
import TrendsChart from '@/components/dashboard/TrendsChart';
import RiskAnalysisTable from '@/components/dashboard/RiskAnalysisTable';
import TopIssuesChart from '@/components/dashboard/TopIssuesChart';
import ExerciseEngagementCard from '@/components/dashboard/ExerciseEngagementCard';

const Index = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('dashboard.title');
  }, [t]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <DashboardHeader />
        
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
    </div>
  );
};

export default Index;
