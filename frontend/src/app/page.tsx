'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  PieChart as PieIcon,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  Send,
  Sliders,
  FileCheck,
  Tag,
  Receipt,
  FileText,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Lock,
  Compass
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { DashboardService, DashboardOverview } from '../services/dashboard.service';

const SEGMENT_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#6B7280', '#EF4444'];
const COMPLIANCE_COLORS = ['#10B981', '#06B6D4', '#F59E0B', '#9CA3AF', '#EF4444'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const overview = await DashboardService.getOverview();
      setData(overview);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch executive dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <RotateCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Aggregating cross-module intelligence...</p>
      </div>
    );
  }

  const segmentChartData = data?.customers
    ? [
        { name: 'Consistent', count: data.customers.active },
        { name: 'Loyalty Cand.', count: data.customers.loyaltyCandidates },
        { name: 'Declining', count: data.customers.declining },
        { name: 'Inactive', count: data.customers.dormant },
        { name: 'Overdue Bill', count: data.customers.overdueBilling }
      ]
    : [];

  const complianceChartData = data?.compliance
    ? [
        { name: 'Pass', value: data.compliance.passed },
        { name: 'Warnings', value: data.compliance.passedWithWarnings },
        { name: 'Revision Req.', value: data.compliance.revisionRequired },
        { name: 'Insuff. Data', value: data.compliance.insufficientData },
        { name: 'Blocked', value: data.compliance.blocked }
      ].filter((d) => d.value > 0)
    : [];

  const deliveryChartData = data?.deliveries
    ? [
        { name: 'Mock Sent', count: data.deliveries.successfulMockDeliveries },
        { name: 'Drafts', count: data.deliveries.draftOnlyRecords },
        { name: 'Blocked', count: data.deliveries.blockedAttempts },
        { name: 'Deduped', count: data.deliveries.duplicateAttemptsPrevented },
        { name: 'Failed', count: data.deliveries.failedAttempts }
      ]
    : [];

  const complianceTotal = data?.compliance.totalValidations || 1;
  const compliancePassRate = Math.round(
    (((data?.compliance.passed || 0) + (data?.compliance.passedWithWarnings || 0)) / complianceTotal) * 100
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-xs font-semibold">
              HCLTech Future Ready AI Engineer Hackathon
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-semibold">
              Production Monolith
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Customer Loyalty & Engagement Assistant
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Unified Executive Command Center: deterministic classification, multi-policy orchestration,
            grounded LangGraph GenAI, 11 independent compliance gates, human approval workflow, and controlled delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Hackathon Demo Panel
          </Link>
          <button
            onClick={fetchOverview}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh metrics"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Customers */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Customers
            </CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-gray-900">
              {data?.customers.total || 0}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {data?.customers.active || 0} active &bull; {data?.customers.overdueBilling || 0} overdue
            </p>
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Campaigns
            </CardTitle>
            <Tag className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-gray-900">
              {data?.campaigns.active || 0}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {data?.campaigns.activeOffers || 0} active offers catalog
            </p>
          </CardContent>
        </Card>

        {/* AI Messages Generated */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              AI Messages
            </CardTitle>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-gray-900">
              {data?.aiGeneration.totalGenerated || 0}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Avg latency: {data?.aiGeneration.averageLatencyMs || 0}ms
            </p>
          </CardContent>
        </Card>

        {/* Compliance Pass Rate */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Compliance
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-emerald-600">
              {compliancePassRate}%
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {data?.compliance.blocked || 0} blocked by safeguards
            </p>
          </CardContent>
        </Card>

        {/* Reviews Queue */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Human Review
            </CardTitle>
            <FileCheck className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-gray-900">
              {data?.reviews.approved || 0}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {data?.reviews.pendingReviews || 0} pending queue
            </p>
          </CardContent>
        </Card>

        {/* Controlled Deliveries */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Deliveries
            </CardTitle>
            <Send className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-gray-900">
              {data?.deliveries.successfulMockDeliveries || 0}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              100% Mock / Draft Mode
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Segmentation Distribution */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                Customer Segments
              </CardTitle>
              <p className="text-xs text-gray-500">Deterministic classifications</p>
            </div>
            <Link
              href="/segments"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center"
            >
              Details <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 11, border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Decisions Breakdown */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                Compliance Outcomes
              </CardTitle>
              <p className="text-xs text-gray-500">11-step policy validations</p>
            </div>
            <Link
              href="/compliance"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center"
            >
              Details <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full flex items-center justify-center">
              {complianceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={complianceChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {complianceChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COMPLIANCE_COLORS[index % COMPLIANCE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                    <Legend
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-gray-400">
                  No compliance evaluations recorded yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controlled Delivery Breakdown */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                Delivery Preconditions
              </CardTitle>
              <p className="text-xs text-gray-500">Controlled dispatch results</p>
            </div>
            <Link
              href="/deliveries"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center"
            >
              Details <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliveryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 11, border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Fast Navigation Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-900">
            Phase 1–8 Monolith Capability Modules
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'Customers', href: '/customers', icon: Users, desc: 'Profile assembly' },
            { name: 'Segmentation', href: '/segments', icon: PieIcon, desc: 'Rules & evidence' },
            { name: 'Campaigns', href: '/campaigns', icon: Layers, desc: 'Strategy selection' },
            { name: 'Offers', href: '/offers', icon: Tag, desc: 'Reward catalog' },
            { name: 'AI Messages', href: '/ai-messages', icon: Sparkles, desc: 'LangGraph generator' },
            { name: 'Compliance', href: '/compliance', icon: ShieldCheck, desc: '11 safety gates' },
            { name: 'Review Queue', href: '/approvals', icon: FileCheck, desc: 'Human verification' },
            { name: 'Deliveries', href: '/deliveries', icon: Send, desc: '14 preconditions' },
            { name: 'Evaluation', href: '/evaluation', icon: TrendingUp, desc: 'Matrix & latency' },
            { name: 'Demo Scenarios', href: '/demo', icon: Sparkles, desc: '5 archetypes & tests' },
            { name: 'Audit Logs', href: '/audit-logs', icon: Lock, desc: 'Append-only trail' },
            { name: 'Login & RBAC', href: '/login', icon: Sliders, desc: 'Auth & roles' }
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="p-3.5 bg-white border border-gray-200 hover:border-indigo-400 hover:shadow-sm rounded-xl transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <item.icon className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-900 block group-hover:text-indigo-600 transition">
                  {item.name}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  {item.desc}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
