'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { NAVIGATION_ITEMS, NavItemConfig } from '../../constants/navigation';

interface AppShellProps {
  children?: React.ReactNode;
  activeModuleId?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activeModuleId }) => {
  const pathname = usePathname();
  const [selectedModuleId, setSelectedModuleId] = useState<string>('dashboard');

  // Determine current active item based on prop first, then pathname, fallback to state
  const activeItem: NavItemConfig =
    (activeModuleId
      ? NAVIGATION_ITEMS.find((item) => item.id === activeModuleId)
      : null) ||
    (pathname
      ? NAVIGATION_ITEMS.find((item) =>
          item.id === 'dashboard'
            ? pathname === '/'
            : pathname.startsWith(item.path)
        )
      : null) ||
    NAVIGATION_ITEMS.find((item) => item.id === selectedModuleId) ||
    NAVIGATION_ITEMS[0];

  const currentTitle = pathname === '/login' ? 'Account Login' : activeItem.label;
  const isImplementedRoute =
    !pathname ||
    pathname === '/' ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/segments') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/offers') ||
    pathname.startsWith('/ai-messages') ||
    pathname.startsWith('/compliance') ||
    pathname.startsWith('/approvals') ||
    pathname.startsWith('/deliveries') ||
    pathname.startsWith('/evaluation') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/audit-logs') ||
    pathname === '/login';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeModuleId={activeItem.id}
        onSelectModule={(id) => setSelectedModuleId(id)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation Bar */}
        <TopNavbar currentTitle={currentTitle} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {isImplementedRoute ? (
            children
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                <div className="flex items-center space-x-3 text-blue-600 mb-3">
                  {React.createElement(activeItem.icon, { className: 'h-6 w-6' })}
                  <h2 className="text-xl font-semibold text-slate-900">
                    {activeItem.label}
                  </h2>
                </div>
                <p className="text-sm text-slate-600 max-w-2xl leading-relaxed mb-6">
                  {activeItem.description}
                </p>
                <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                  Phase 2 Active &bull; Planned for subsequent Hackathon phases
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
