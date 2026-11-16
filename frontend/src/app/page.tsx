'use client';

import React from 'react';
import {
  Users,
  PieChart,
  Sparkles,
  ShieldCheck,
  Server,
  Database,
  Layers,
  ArrowRight,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useApiHealth } from '../hooks/useHealth';

export default function DashboardPage() {
  const { data: health, isLoading, isError, error } = useApiHealth();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="bg-blue-600 text-[11px] font-medium">
              Phase 1 Initialized
            </Badge>
            <span className="text-xs text-slate-500 font-medium">
              HCLTech Future Ready AI Hackathon
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
            Customer Loyalty & Engagement Assistant
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Enterprise foundation for deterministic customer classification, policy-based strategy selection,
            and grounded GenAI communications for retail and telecom organizations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Platform Mode</span>
            <span className="text-xs font-semibold text-slate-800">Modular Monolith</span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Metric Cards (CRM Overview Aesthetic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Target Audience
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Retail & Telecom</div>
            <p className="text-[11px] text-slate-500 mt-1">Multi-channel profile assembly</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Classification
            </CardTitle>
            <PieChart className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Deterministic</div>
            <p className="text-[11px] text-slate-500 mt-1">Transparent reason codes & confidence</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Communication
            </CardTitle>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Grounded GenAI</div>
            <p className="text-[11px] text-slate-500 mt-1">Bounded by verified facts & policies</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Review & Control
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Human Approval</div>
            <p className="text-[11px] text-slate-500 mt-1">Safety checks & controlled delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* System Infrastructure & Backend Connectivity Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-900 font-semibold">
                  API & Infrastructure Connectivity
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Active status of backend Express server, MongoDB schemas, and Redis cache layer
                </CardDescription>
              </div>
              <Badge
                variant={isLoading ? 'secondary' : isError ? 'destructive' : 'success'}
                className="text-xs font-medium"
              >
                {isLoading ? 'Checking...' : isError ? 'Offline' : 'Connected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                <span className="text-slate-500">API Endpoint:</span>
                <span className="text-slate-800 font-semibold">GET /api/v1/health</span>
              </div>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                <span className="text-slate-500">Backend Response:</span>
                <span className={isError ? 'text-red-600' : 'text-emerald-700'}>
                  {isLoading
                    ? 'Awaiting response...'
                    : isError
                    ? `Error: ${error?.message || 'Connection failed'}`
                    : JSON.stringify(health?.message)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Response Timestamp:</span>
                <span className="text-slate-600">
                  {health?.timestamp || 'N/A'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 border border-slate-200 rounded-lg bg-white flex items-center space-x-3">
                <Server className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-500">Node / Express</p>
                  <p className="text-xs font-semibold text-slate-800">Port 5000</p>
                </div>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg bg-white flex items-center space-x-3">
                <Database className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-500">MongoDB</p>
                  <p className="text-xs font-semibold text-slate-800">13 Models</p>
                </div>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg bg-white flex items-center space-x-3">
                <Layers className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-500">Redis Cache</p>
                  <p className="text-xs font-semibold text-slate-800">Port 6379</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase 1 Deliverables Summary */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900 font-semibold">
              Phase 1 Deliverables
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Foundational architecture checklist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Modular monolithic architecture initialized</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Next.js App Router with TypeScript & Tailwind CSS</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Express backend with Zod environment validation</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>13 MongoDB schemas & data contracts designed</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Docker Compose & Nginx reverse proxy configured</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>10 CRM placeholder modules in navigation shell</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
