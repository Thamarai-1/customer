'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import {
  ComplianceService,
  IComplianceReport,
  IComplianceStatistics,
  ICompliancePolicyConfig,
  IValidationCheckResult,
  IValidationFinding,
  OverallComplianceDecision,
  SeverityLevel
} from '../../services/compliance.service';
import { CustomerApiClient, CustomerSummaryItem } from '../../services/customer.service';
import { AIMessageService, GeneratedMessageItem } from '../../services/ai-message.service';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  RefreshCw,
  Sliders,
  Eye,
  FileText,
  User,
  Clock,
  ChevronRight,
  X,
  Lock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  Save,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  PASS: '#10b981',
  PASS_WITH_WARNINGS: '#f59e0b',
  REVISION_REQUIRED: '#f97316',
  BLOCKED: '#ef4444',
  INSUFFICIENT_DATA: '#8b5cf6'
};

export default function CompliancePage() {
  // Statistics & Reports
  const [stats, setStats] = useState<IComplianceStatistics | null>(null);
  const [blockedReports, setBlockedReports] = useState<IComplianceReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'blocked' | 'inspector' | 'config'>('blocked');

  // Blocked Filters
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterReason, setFilterReason] = useState<string>('');

  // Selected Report Modal
  const [selectedReport, setSelectedReport] = useState<IComplianceReport | null>(null);

  // Inspector State
  const [customers, setCustomers] = useState<CustomerSummaryItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerDrafts, setCustomerDrafts] = useState<GeneratedMessageItem[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');
  const [inspectReport, setInspectReport] = useState<IComplianceReport | null>(null);
  const [validating, setValidating] = useState<boolean>(false);

  // Policy Config
  const [config, setConfig] = useState<ICompliancePolicyConfig | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<ICompliancePolicyConfig>>({});
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState<boolean>(false);

  // Load initial data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, blockedData, configData, customerList] = await Promise.all([
        ComplianceService.getStatistics().catch(() => null),
        ComplianceService.getBlockedMessages(1, 20, {
          customerId: filterCustomer || undefined,
          reasonCode: filterReason || undefined
        }).catch(() => ({ reports: [], meta: {} })),
        ComplianceService.getConfig().catch(() => null),
        CustomerApiClient.listCustomers({ limit: 50 }).catch(() => ({ customers: [], meta: {} }))
      ]);

      if (statsData) setStats(statsData);
      setBlockedReports(blockedData.reports || []);
      if (configData) {
        setConfig(configData);
        setEditingConfig(configData);
      }
      setCustomers(customerList.customers || []);
      if (customerList.customers?.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(customerList.customers[0].customerId);
      }
    } catch (err) {
      console.error('Failed to load compliance dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [filterCustomer, filterReason]);

  // Load drafts when customer changes in Inspector tab
  useEffect(() => {
    if (!selectedCustomerId) return;
    const fetchDrafts = async () => {
      try {
        const res = await AIMessageService.listCustomerDrafts(selectedCustomerId, 1, 10);
        setCustomerDrafts(res.messages || []);
        if (res.messages?.length > 0) {
          setSelectedDraftId(res.messages[0]._id);
          // Try fetching latest report
          const latest = await ComplianceService.getLatestReport(res.messages[0]._id);
          setInspectReport(latest);
        } else {
          setSelectedDraftId('');
          setInspectReport(null);
        }
      } catch (err) {
        console.error('Failed to fetch drafts for customer:', err);
      }
    };
    fetchDrafts();
  }, [selectedCustomerId]);

  // Run manual validation for selected draft
  const handleRunValidation = async () => {
    if (!selectedDraftId) return;
    setValidating(true);
    try {
      const report = await ComplianceService.validateMessage(selectedDraftId);
      setInspectReport(report);
      // Reload stats and blocked list in background
      ComplianceService.getStatistics().then((s) => setStats(s)).catch(() => {});
      ComplianceService.getBlockedMessages(1, 20).then((b) => setBlockedReports(b.reports)).catch(() => {});
    } catch (err: any) {
      alert(`Validation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setValidating(false);
    }
  };

  // Save config
  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    setSavingConfig(true);
    setConfigSaveSuccess(false);
    try {
      const updated = await ComplianceService.updateConfig(editingConfig);
      setConfig(updated);
      setEditingConfig(updated);
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(`Failed to save policy configuration: ${err.message || 'Unauthorized or server error'}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> PASS
          </span>
        );
      case 'PASS_WITH_WARNINGS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> WARNINGS
          </span>
        );
      case 'REVISION_REQUIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <AlertOctagon className="w-3.5 h-3.5 mr-1 text-orange-600" /> REVISION REQUIRED
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> BLOCKED
          </span>
        );
      case 'INSUFFICIENT_DATA':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <HelpCircle className="w-3.5 h-3.5 mr-1 text-purple-600" /> INSUFFICIENT DATA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const getCheckStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> PASSED
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" /> WARNING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" /> FAILED
          </span>
        );
      case 'INSUFFICIENT_DATA':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <HelpCircle className="w-3 h-3 mr-1 text-purple-600" /> INSUFFICIENT DATA
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-700 text-white">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 border border-orange-300">MEDIUM</span>;
      case 'LOW':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">LOW</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">INFO</span>;
    }
  };

  const pieData = [
    { name: 'Passed', value: stats?.passed || 0, color: STATUS_COLORS.PASS },
    { name: 'Warnings', value: stats?.passedWithWarnings || 0, color: STATUS_COLORS.PASS_WITH_WARNINGS },
    { name: 'Revision Req.', value: stats?.revisionRequired || 0, color: STATUS_COLORS.REVISION_REQUIRED },
    { name: 'Blocked', value: stats?.blocked || 0, color: STATUS_COLORS.BLOCKED },
    { name: 'Insufficient', value: stats?.insufficientData || 0, color: STATUS_COLORS.INSUFFICIENT_DATA }
  ].filter((d) => d.value > 0);

  const failureData = (stats?.mostCommonFailures || []).map((f) => ({
    reason: f.reasonCode.replace(/_/g, ' '),
    count: f.count
  }));

  return (
    <AppShell activeModuleId="compliance">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Safety, Compliance & Message Validation Engine
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-medium">
                    Phase 6 Active
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authoritative 11-step deterministic validation pipeline evaluating grounding, offer eligibility, billing integrity, consent, velocity limits, and privacy safety before review.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setRefreshing(true);
                loadDashboardData();
              }}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Policy Config
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Total Validations</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalValidations ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Platform-wide runs</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-500">
            <span className="text-xs font-medium text-emerald-700 flex items-center justify-between">
              Passed <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.passed ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Clean compliance</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-amber-500">
            <span className="text-xs font-medium text-amber-700 flex items-center justify-between">
              Warnings <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.passedWithWarnings ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Non-critical notes</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-orange-500">
            <span className="text-xs font-medium text-orange-700 flex items-center justify-between">
              Revision Req. <AlertOctagon className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.revisionRequired ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Requires edit</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-rose-500">
            <span className="text-xs font-medium text-rose-700 flex items-center justify-between">
              Blocked <XCircle className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.blocked ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Critical violations</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-purple-500">
            <span className="text-xs font-medium text-purple-700 flex items-center justify-between">
              Insufficient <HelpCircle className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.insufficientData ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Missing evidence</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-blue-600">
            <span className="text-xs font-medium text-blue-700 flex items-center justify-between">
              Success Rate <TrendingUp className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.successRate ?? 100}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${stats?.successRate ?? 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Visual Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Decision Distribution */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Compliance Decision Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">Distribution of outcomes across recent automated validations</p>
            <div className="h-56">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No compliance runs recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Top Failure Reasons */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Top Failure Reason Codes</h3>
            <p className="text-xs text-slate-500 mb-4">Most frequent rule violations preventing outreach delivery</p>
            <div className="h-56">
              {failureData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={failureData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="reason" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No compliance violations logged yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 flex space-x-6">
          <button
            onClick={() => setActiveTab('blocked')}
            className={`pb-3 text-sm font-medium transition border-b-2 ${
              activeTab === 'blocked'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Blocked Messages Queue ({blockedReports.length})
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            className={`pb-3 text-sm font-medium transition border-b-2 ${
              activeTab === 'inspector'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Live Validation Inspector & 11 Checks
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 text-sm font-medium transition border-b-2 ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Policy Engine Rules & Safety Config
          </button>
        </div>

        {/* TAB 1: BLOCKED MESSAGES QUEUE */}
        {activeTab === 'blocked' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Filter bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by Customer ID..."
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    placeholder="Filter by Reason Code..."
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Showing {blockedReports.length} blocked messages
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Message / Subject</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Primary Failure Reason</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Recommended Action</th>
                    <th className="py-3 px-4">Validated At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {blockedReports.length > 0 ? (
                    blockedReports.map((report) => {
                      const msg = report.messageId as any;
                      const cust = report.customerRef as any;
                      const primaryFinding = report.findings?.find((f) => f.severity === 'CRITICAL') || report.findings[0];

                      return (
                        <tr key={report._id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 max-w-xs truncate">
                              {msg?.subject || 'Message Draft'}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Channel: {msg?.channel || 'EMAIL'} &bull; Segment: {msg?.primarySegment || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{report.customerId}</div>
                            <div className="text-[11px] text-slate-400">
                              {cust?.firstName} {cust?.lastName}
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(report.overallStatus)}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              {primaryFinding?.reasonCode || 'COMPLIANCE_VIOLATION'}
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">
                              {primaryFinding?.message}
                            </div>
                          </td>
                          <td className="py-3 px-4">{getSeverityBadge(primaryFinding?.severity || 'HIGH')}</td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {report.decision || 'BLOCK_MESSAGE'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {new Date(report.validatedAt).toLocaleDateString()} {new Date(report.validatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-60" />
                        No blocked messages found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE VALIDATION INSPECTOR & 11 CHECKS */}
        {activeTab === 'inspector' && (
          <div className="space-y-6">
            {/* Customer & Draft Selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="w-full sm:w-64">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Select Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {customers.map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.customerId} — {c.firstName} {c.lastName} ({c.loyaltyInfo?.loyaltyTier || 'MEMBER'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-80">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Select Message Draft</label>
                  <select
                    value={selectedDraftId}
                    onChange={(e) => {
                      setSelectedDraftId(e.target.value);
                      ComplianceService.getLatestReport(e.target.value).then((r) => setInspectReport(r)).catch(() => setInspectReport(null));
                    }}
                    disabled={customerDrafts.length === 0}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  >
                    {customerDrafts.length > 0 ? (
                      customerDrafts.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.subject} ({d.channel})
                        </option>
                      ))
                    ) : (
                      <option value="">No generated drafts for this customer</option>
                    )}
                  </select>
                </div>
              </div>

              <button
                onClick={handleRunValidation}
                disabled={!selectedDraftId || validating}
                className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${validating ? 'animate-spin' : ''}`} />
                {validating ? 'Executing 11 Validators...' : 'Run Independent Validation'}
              </button>
            </div>

            {/* Validation Outcome Banner */}
            {inspectReport && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Compliance Result</span>
                    <div className="flex items-center gap-3 mt-1">
                      {getStatusBadge(inspectReport.overallStatus)}
                      <span className="text-xs text-slate-600">
                        Recommended Action: <strong className="text-slate-800">{inspectReport.decision}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div>Checks: <strong>{inspectReport.summary.passed}/{inspectReport.summary.totalChecks}</strong> passed</div>
                    <div>Critical: <strong className="text-rose-600">{inspectReport.summary.criticalFindings}</strong></div>
                    <div>High: <strong className="text-rose-500">{inspectReport.summary.highFindings}</strong></div>
                    <div>Policy: <span className="font-mono">{inspectReport.policyVersion}</span></div>
                  </div>
                </div>

                {/* 11 Validators Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
                  {inspectReport.checks.map((check) => (
                    <div
                      key={check.checkId}
                      className={`border rounded-xl p-4 transition ${
                        check.status === 'FAILED'
                          ? 'bg-rose-50/40 border-rose-200'
                          : check.status === 'WARNING'
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{check.checkName}</h4>
                          <span className="font-mono text-[10px] text-slate-400">{check.checkId}</span>
                        </div>
                        {getCheckStatusBadge(check.status)}
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                        {check.message}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>Duration: {check.durationMs}ms</span>
                        <span>Severity: {getSeverityBadge(check.severity)}</span>
                      </div>

                      {/* Check Findings if failed */}
                      {check.findings.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 space-y-1.5">
                          {check.findings.map((f, i) => (
                            <div key={i} className="text-[10px] bg-white/80 p-2 rounded border border-slate-200 text-slate-700">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono font-semibold text-rose-700">{f.reasonCode}</span>
                                {getSeverityBadge(f.severity)}
                              </div>
                              <div>{f.message}</div>
                              {f.evidenceValue && (
                                <div className="mt-1 text-slate-500">
                                  Evidence: <span className="font-mono text-slate-800">{f.evidenceValue}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POLICY RULES & CONFIG */}
        {activeTab === 'config' && config && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Compliance Policy Engine Configuration</h3>
                <p className="text-xs text-slate-500">
                  Parameters regulating frequency limits, blocked expressions, mandatory disclaimers, and duplicate detection.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {configSaveSuccess && (
                  <span className="text-xs font-medium text-emerald-600 flex items-center">
                    <Check className="w-4 h-4 mr-1" /> Config Saved
                  </span>
                )}
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {savingConfig ? 'Saving...' : 'Update Policy Config'}
                </button>
              </div>
            </div>

            {/* Frequency Limits */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Velocity & Contact Frequency Limits
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Daily Marketing Emails</label>
                  <input
                    type="number"
                    value={editingConfig.frequencyLimits?.maxDailyMarketingEmails ?? 1}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        frequencyLimits: {
                          ...config.frequencyLimits,
                          maxDailyMarketingEmails: parseInt(e.target.value, 10) || 1
                        }
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Weekly Marketing Emails</label>
                  <input
                    type="number"
                    value={editingConfig.frequencyLimits?.maxWeeklyMarketingEmails ?? 3}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        frequencyLimits: {
                          ...config.frequencyLimits,
                          maxWeeklyMarketingEmails: parseInt(e.target.value, 10) || 3
                        }
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Min Interval Hours</label>
                  <input
                    type="number"
                    value={editingConfig.frequencyLimits?.minIntervalHoursMarketing ?? 24}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        frequencyLimits: {
                          ...config.frequencyLimits,
                          minIntervalHoursMarketing: parseInt(e.target.value, 10) || 24
                        }
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Monthly Billing Reminders</label>
                  <input
                    type="number"
                    value={editingConfig.frequencyLimits?.maxBillingRemindersPerMonth ?? 4}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        frequencyLimits: {
                          ...config.frequencyLimits,
                          maxBillingRemindersPerMonth: parseInt(e.target.value, 10) || 4
                        }
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Duplicate Window */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Duplicate Outreach Detection
              </h4>
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-slate-600 mb-1">Duplicate Window (Hours)</label>
                <input
                  type="number"
                  value={editingConfig.duplicateWindowHours ?? 24}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      duplicateWindowHours: parseInt(e.target.value, 10) || 24
                    })
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Mandatory Disclaimers */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Mandatory Policy Disclaimers
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Promotional Offer Terms Notice</label>
                  <textarea
                    rows={2}
                    value={editingConfig.requiredDisclaimers?.offerTermsText || ''}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        requiredDisclaimers: {
                          ...config.requiredDisclaimers,
                          offerTermsText: e.target.value
                        }
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Billing Dispute Notice</label>
                  <textarea
                    rows={2}
                    value={editingConfig.requiredDisclaimers?.billingDisputeText || ''}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        requiredDisclaimers: {
                          ...config.requiredDisclaimers,
                          billingDisputeText: e.target.value
                        }
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Blocked Phrases List */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Blocked Phrases & Keywords ({editingConfig.blockedPhrases?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200">
                {(editingConfig.blockedPhrases || []).map((phrase, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded bg-white text-slate-700 border border-slate-200 text-[11px]"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Detailed Report Inspector */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Compliance Report Details &bull; {selectedReport.customerId}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">Report ID: {selectedReport._id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                {/* Status summary */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Outcome:</span>
                    <div className="mt-1">{getStatusBadge(selectedReport.overallStatus)}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Action:</span>
                    <div className="text-xs font-semibold text-slate-800 mt-1">{selectedReport.decision}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Checks Passed:</span>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      {selectedReport.summary.passed}/{selectedReport.summary.totalChecks}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Validated At:</span>
                    <div className="text-xs text-slate-600 mt-1">
                      {new Date(selectedReport.validatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Findings Table if any */}
                {selectedReport.findings && selectedReport.findings.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Validation Findings ({selectedReport.findings.length})
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                      {selectedReport.findings.map((f, i) => (
                        <div key={i} className="p-3 bg-white text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-rose-700">{f.reasonCode}</span>
                            {getSeverityBadge(f.severity)}
                          </div>
                          <div className="text-slate-700">{f.message}</div>
                          {f.evidenceValue && (
                            <div className="text-[11px] text-slate-500">
                              Verified Evidence: <strong className="text-slate-800 font-mono">{f.evidenceValue}</strong>
                            </div>
                          )}
                          {f.generatedValue && (
                            <div className="text-[11px] text-slate-500">
                              Generated Claim: <strong className="text-slate-800 font-mono">{f.generatedValue}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All 11 Checks List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Executed Validation Checks
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedReport.checks.map((c) => (
                      <div key={c.checkId} className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">{c.checkName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.checkId}</div>
                        </div>
                        {getCheckStatusBadge(c.status)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
