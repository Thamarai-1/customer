import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Sidebar } from '../src/components/layout/Sidebar';
import { NAVIGATION_ITEMS } from '../src/constants/navigation';
import Providers from '../src/app/providers';
import { TopNavbar } from '../src/components/layout/TopNavbar';
import { AppShell } from '../src/components/layout/AppShell';

describe('Frontend Navigation & Layout Shell Tests', () => {
  it('Sidebar renders brand title and subtitle', () => {
    render(
      <Providers>
        <Sidebar />
      </Providers>
    );

    expect(screen.getByText('Engagement Assistant')).toBeInTheDocument();
    expect(screen.getByText('HCLTech AI Platform')).toBeInTheDocument();
  });

  it('Sidebar renders all 10 required navigation items', () => {
    render(
      <Providers>
        <Sidebar />
      </Providers>
    );

    const requiredItems = [
      'Dashboard',
      'Customers',
      'Segments',
      'Campaigns',
      'Offers',
      'AI Message Generator',
      'Approval Queue',
      'Compliance',
      'Audit Logs',
      'Settings'
    ];

    expect(NAVIGATION_ITEMS.length).toBe(10);
    requiredItems.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('TopNavbar renders title and user profile placeholder', () => {
    render(
      <Providers>
        <TopNavbar currentTitle="Dashboard" />
      </Providers>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Hackathon Admin')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Reviewer')).toBeInTheDocument();
  });

  it('AppShell renders sidebar and main content area successfully', () => {
    render(
      <Providers>
        <AppShell>
          <div data-testid="dashboard-content">Core CRM Dashboard</div>
        </AppShell>
      </Providers>
    );

    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    expect(screen.getByText('Engagement Assistant')).toBeInTheDocument();
  });
});
