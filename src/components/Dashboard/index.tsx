'use client';

import React from 'react';
import { DashboardLayout, DashboardGrid, DashboardCard } from './DashboardLayout';

interface IntegratedDashboardProps {
  enableRealtime?: boolean;
  userId?: string;
}

export function IntegratedDashboard({ enableRealtime = false, userId }: IntegratedDashboardProps) {
  return (
    <DashboardLayout title='Dashboard' description='Your learning progress and statistics'>
      <DashboardGrid cols={3}>
        <DashboardCard title='Welcome' description='Dashboard is under construction'>
          <div className='flex items-center justify-center h-full'>
            <p className='text-muted-foreground'>Dashboard features coming soon...</p>
          </div>
        </DashboardCard>
      </DashboardGrid>
    </DashboardLayout>
  );
}

// Re-export dashboard components
export { DashboardLayout, DashboardGrid, DashboardCard } from './DashboardLayout';
export * from './widgets/StatsWidget';
export * from './widgets/ProgressChartWidget';
export * from './widgets/ActivityWidget';
export * from './widgets/PerformanceWidget';
