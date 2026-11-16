'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { NAVIGATION_ITEMS, NavItemConfig } from '../../constants/navigation';

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>('dashboard');

  const activeItem: NavItemConfig =
    NAVIGATION_ITEMS.find((item) => item.id === selectedModuleId) ||
    NAVIGATION_ITEMS[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation Placeholder with 10 Items */}
      <Sidebar
        activeModuleId={selectedModuleId}
        onSelectModule={(id) => setSelectedModuleId(id)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation Bar */}
        <TopNavbar currentTitle={activeItem.label} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {selectedModuleId === 'dashboard' ? (
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
                  Phase 1 Placeholder &bull; Architecture and Data Contract Defined
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
