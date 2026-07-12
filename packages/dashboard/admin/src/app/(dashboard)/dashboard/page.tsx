import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentConversations } from '@/components/dashboard/RecentConversations';
import { LeadsOverview } from '@/components/dashboard/LeadsOverview';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { BotSelector } from '@/components/dashboard/BotSelector';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
            <p className="text-gray-500 mt-1">نظرة عامة على أداء مساعديك</p>
          </div>
          <BotSelector />
        </div>

        <StatsCards />

        <div className="grid gap-6 lg:grid-cols-2">
          <RecentConversations />
          <LeadsOverview />
        </div>

        <QuickActions />
      </div>
    </DashboardLayout>
  );
}