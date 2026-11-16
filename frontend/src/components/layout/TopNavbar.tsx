'use client';

import React from 'react';
import { Search, Bell, Activity, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useApiHealth } from '../../hooks/useHealth';
import { Badge } from '../ui/badge';

interface TopNavbarProps {
  currentTitle?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTitle = 'Dashboard'
}) => {
  const { data: health, isLoading, isError, refetch } = useApiHealth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 sticky top-0">
      {/* Title & Context */}
      <div className="flex items-center space-x-3">
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
          {currentTitle}
        </h1>
        <Badge variant="outline" className="text-[11px] text-slate-500 font-normal hidden sm:inline-flex">
          Retail & Telecom Workspace
        </Badge>
      </div>

      {/* Global Actions, Health & User Profile */}
      <div className="flex items-center space-x-4">
        {/* Search Input Placeholder */}
        <div className="relative w-64 hidden md:block">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers, campaigns..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
            readOnly
          />
        </div>

        {/* Real-time Backend Health Status Pill */}
        <div className="flex items-center">
          {isLoading ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
              <RefreshCw className="h-3 w-3 animate-spin text-slate-500" />
              <span className="text-[11px]">Syncing API...</span>
            </div>
          ) : isError || !health?.success ? (
            <div
              onClick={() => refetch()}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium cursor-pointer hover:bg-amber-100 transition-colors"
              title="Click to re-check API connection"
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[11px]">API Disconnected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[11px]">API Online</span>
            </div>
          )}
        </div>

        {/* Notifications Icon Placeholder */}
        <button
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600"></span>
        </button>

        {/* User Profile Placeholder */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-medium text-xs flex items-center justify-center shadow-sm">
            HA
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-900 leading-tight">
              Hackathon Admin
            </span>
            <span className="text-[10px] text-slate-500">
              Enterprise Reviewer
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
