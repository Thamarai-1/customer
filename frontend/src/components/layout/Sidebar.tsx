'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAVIGATION_ITEMS } from '../../constants/navigation';
import { cn } from '../../lib/utils';
import { Sparkles, Shield, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeModuleId?: string;
  onSelectModule?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModuleId, onSelectModule }) => {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950/60">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 mr-3">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-white tracking-tight leading-tight">
            Engagement Assistant
          </span>
          <span className="text-[11px] text-blue-400 font-medium">
            HCLTech AI Platform
          </span>
        </div>
      </div>

      {/* Navigation Group */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Enterprise Modules
        </div>

        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModuleId
            ? activeModuleId === item.id
            : item.id === 'dashboard'
            ? (pathname === '/' || !pathname)
            : (pathname?.startsWith(item.path) ?? false);

          return (
            <Link
              key={item.id}
              href={item.path}
              onClick={() => onSelectModule && onSelectModule(item.id)}
              className={cn(
                'w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all text-left group',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 mr-3 flex-shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-300'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Compliance & Phase Notice */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-2 text-slate-400 text-xs">
          <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <div className="truncate">
            <p className="text-[11px] font-medium text-slate-200">Phase 3: Active</p>
            <p className="text-[10px] text-slate-400">Segmentation Engine Ready</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
