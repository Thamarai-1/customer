'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  SegmentationService,
  SegmentationStatistics,
  CustomerClassificationItem,
  CustomerSegmentType,
  ClassificationStatus,
  ClassifyAllSummary
} from '../../services/segmentation.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  Clock,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Play,
  X,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Activity,
  Award,
  ChevronRight,
  TrendingDown,
  UserCheck,
  AlertOctagon,
  Moon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend
} from 'recharts';

const SEGMENT_COLORS: Record<CustomerSegmentType, string> = {
  OVERDUE_BILL: '#EF4444', // Red
  INACTIVE: '#64748B', // Slate
  DECLINING_ACTIVITY: '#F59E0B', // Amber
  LOYALTY_CANDIDATE: '#8B5CF6', // Purple
  CONSISTENT_CUSTOMER: '#10B981' // Emerald
};

const SEGMENT_LABELS: Record<CustomerSegmentType, string> = {
  OVERDUE_BILL: 'Overdue Bill',
  INACTIVE: 'Inactive / Dormant',
  DECLINING_ACTIVITY: 'Declining Activity',
  LOYALTY_CANDIDATE: 'Loyalty Candidate',
  CONSISTENT_CUSTOMER: 'Consistent Customer'
};

const SEGMENT_ICONS: Record<CustomerSegmentType, React.ElementType> = {
  OVERDUE_BILL: AlertOctagon,
  INACTIVE: Moon,
  DECLINING_ACTIVITY: TrendingDown,
  LOYALTY_CANDIDATE: Award,
  CONSISTENT_CUSTOMER: UserCheck
};

export default function SegmentationPage() {
  // State for statistics
  const [stats, setStats] = useState<SegmentationStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // State for customer list
  const [customers, setCustomers] = useState<CustomerClassificationItem[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 15,
    totalRecords: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Filters
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegmentType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ClassificationStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Batch action state
  const [isClassifyingAll, setIsClassifyingAll] = useState(false);
  const [batchSummary, setBatchSummary] = useState<ClassifyAllSummary | null>(null);

  // Modal / Detail state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerClassificationItem | null>(null);
  const [isReclassifying, setIsReclassifying] = useState(false);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await SegmentationService.getStatistics();
      setStats(data);
    } catch (err) {
      console.error('Failed to load segmentation statistics:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch customer classification table
  const fetchCustomers = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const filters: { search?: string; status?: string } = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedStatus !== 'ALL') filters.status = selectedStatus;

      const data = await SegmentationService.getSegmentCustomers(
        selectedSegment,
        page,
        15,
        filters
      );
      setCustomers(data.classifications);
      setMeta(data.meta);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, [selectedSegment, selectedStatus, searchQuery, page]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Execute bulk classification
  const handleClassifyAll = async () => {
    if (isClassifyingAll) return;
    setIsClassifyingAll(true);
    setBatchSummary(null);
    try {
      const summary = await SegmentationService.classifyAll(50);
      setBatchSummary(summary);
      await Promise.all([fetchStatistics(), fetchCustomers()]);
    } catch (err) {
      console.error('Error during batch classification:', err);
    } finally {
      setIsClassifyingAll(false);
    }
  };

  // Reclassify single customer
  const handleReclassifySingle = async (customerId: string) => {
    setIsReclassifying(true);
    try {
      const updated = await SegmentationService.classifyCustomer(customerId);
      setSelectedCustomer(updated);
      await Promise.all([fetchStatistics(), fetchCustomers()]);
    } catch (err) {
      console.error('Failed to reclassify customer:', err);
    } finally {
      setIsReclassifying(false);
    }
  };

  // Prepare chart data
  const primaryChartData = stats
    ? (Object.keys(stats.primarySegmentCounts) as CustomerSegmentType[]).map((key) => ({
        name: SEGMENT_LABELS[key],
        segmentKey: key,
        count: stats.primarySegmentCounts[key] || 0,
        fill: SEGMENT_COLORS[key]
      }))
    : [];

  const membershipChartData = stats
    ? (Object.keys(stats.segmentCounts) as CustomerSegmentType[]).map((key) => ({
        name: SEGMENT_LABELS[key],
        segmentKey: key,
        count: stats.segmentCounts[key] || 0,
        fill: SEGMENT_COLORS[key]
      }))
    : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Customer Segmentation Engine
            </h1>
            <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
              Phase 3 Active
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic behavioral classification, reason codes, confidence scoring, and multi-label analytics.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStatistics();
              fetchCustomers();
            }}
            disabled={isLoadingStats || isLoadingList}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleClassifyAll}
            disabled={isClassifyingAll}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs"
          >
            <Play className={`h-3.5 w-3.5 mr-1.5 ${isClassifyingAll ? 'animate-spin' : ''}`} />
            {isClassifyingAll ? 'Classifying All Customers...' : 'Run Classification for All'}
          </Button>
        </div>
      </div>

      {/* Bulk Processing Summary Alert */}
      {batchSummary && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-950">
                Batch Classification Completed Successfully
              </h4>
              <p className="text-xs text-blue-800 mt-0.5">
                Processed <strong>{batchSummary.processedCount}</strong> of <strong>{batchSummary.totalCustomers}</strong> customers in {batchSummary.durationMs}ms &bull; 
                {' '}Classified: <strong>{batchSummary.classifiedCount}</strong> &bull; 
                {' '}Insufficient Data: <strong>{batchSummary.insufficientDataCount}</strong> &bull; 
                {' '}Multi-Segment: <strong>{batchSummary.multiSegmentCount}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setBatchSummary(null)}
            className="text-blue-500 hover:text-blue-800 text-sm p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.totalCustomers ?? '--'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Classified</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {stats?.classifiedCustomers ?? '--'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Assigned to segments</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Insufficient</span>
              <HelpCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {stats?.insufficientDataCustomers ?? '--'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Missing history</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Multi-Segment</span>
              <Layers className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              {stats?.multiSegmentCustomers ?? '--'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Overlapping profiles</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Unclassified</span>
              <AlertTriangle className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-600 mt-1">
              {stats?.unclassifiedCustomers ?? '--'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Pending evaluation</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Last Run</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xs font-semibold text-slate-900 mt-2 truncate">
              {stats?.lastRunTimestamp ? new Date(stats.lastRunTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {stats?.lastRunTimestamp ? new Date(stats.lastRunTimestamp).toLocaleDateString() : 'Run bulk evaluation'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Primary Segment Distribution
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Primary segment selected by strict priority hierarchy (Overdue Bill &gt; Inactive &gt; Declining &gt; Loyalty &gt; Consistent).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={primaryChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`${value} customers`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {primaryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Segment Membership Distribution (Multi-Label)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total customers qualifying for each segment. Customers may qualify for multiple segments simultaneously.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={membershipChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={45} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, _name: string, props: { payload?: { segmentKey: CustomerSegmentType } }) => {
                      const segKey = props.payload?.segmentKey;
                      const pct = segKey && stats?.segmentPercentages ? stats.segmentPercentages[segKey] : 0;
                      return [`${value} customers (${pct}%)`, 'Total Members'];
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {membershipChartData.map((entry, index) => (
                      <Cell key={`cell-mem-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5 Primary Segment Cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Configured Segment Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {(Object.keys(SEGMENT_LABELS) as CustomerSegmentType[]).map((key) => {
            const Icon = SEGMENT_ICONS[key];
            const count = stats?.segmentCounts[key] ?? 0;
            const percentage = stats?.segmentPercentages[key] ?? 0;
            const isSelected = selectedSegment === key;

            return (
              <Card
                key={key}
                onClick={() => {
                  setSelectedSegment(isSelected ? 'ALL' : key);
                  setPage(1);
                }}
                className={`cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                } bg-white`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: SEGMENT_COLORS[key] }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {percentage}%
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                      {SEGMENT_LABELS[key]}
                    </h3>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {count} <span className="text-xs font-normal text-slate-500">patrons</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                    {key === 'CONSISTENT_CUSTOMER' && 'Regular usage, active plan & zero overdue balances.'}
                    {key === 'LOYALTY_CANDIDATE' && 'High points, long tenure & pristine payment record.'}
                    {key === 'DECLINING_ACTIVITY' && '50%+ drop in 30d activity vs historical baseline.'}
                    {key === 'INACTIVE' && 'No qualifying activity recorded for over 60 days.'}
                    {key === 'OVERDUE_BILL' && 'Past-due invoices requiring billing reminder follow-up.'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600">
                    <span>{isSelected ? 'Filtering Active' : 'Filter Table'}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Customer Segmentation Table & Filters */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Customer Classifications Ledger
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Auditable customer classifications with reason codes, verified evidence, and confidence ratings.
              </CardDescription>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative w-48 sm:w-56">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer ID, plan..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Segment Dropdown */}
              <select
                value={selectedSegment}
                onChange={(e) => {
                  setSelectedSegment(e.target.value as CustomerSegmentType | 'ALL');
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Segments</option>
                <option value="OVERDUE_BILL">Overdue Bill</option>
                <option value="INACTIVE">Inactive / Dormant</option>
                <option value="DECLINING_ACTIVITY">Declining Activity</option>
                <option value="LOYALTY_CANDIDATE">Loyalty Candidate</option>
                <option value="CONSISTENT_CUSTOMER">Consistent Customer</option>
              </select>

              {/* Status Dropdown */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as ClassificationStatus | 'ALL');
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="CLASSIFIED">Classified</option>
                <option value="INSUFFICIENT_DATA">Insufficient Data</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Primary Segment</th>
                  <th className="py-3 px-4">All Segments</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Classified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingList ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                      Loading customer classifications...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Filter className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                      No customer classifications matched the selected criteria.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const confidencePercent = Math.round(c.confidence * 100);
                    return (
                      <tr key={c.id || c.customerId} className="hover:bg-slate-50/80 transition-colors">
                        {/* Customer Info */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{c.customerId}</div>
                          <div className="text-[11px] text-slate-500">{c.customerName}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{c.email}</div>
                        </td>

                        {/* Primary Segment */}
                        <td className="py-3.5 px-4">
                          {c.primarySegment ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-xs"
                              style={{ backgroundColor: SEGMENT_COLORS[c.primarySegment] }}
                            >
                              {SEGMENT_LABELS[c.primarySegment]}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                          )}
                        </td>

                        {/* All Segments (Multi-label) */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {c.segments && c.segments.length > 0 ? (
                              c.segments.map((seg) => (
                                <span
                                  key={seg}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                  style={{
                                    backgroundColor: `${SEGMENT_COLORS[seg]}15`,
                                    color: SEGMENT_COLORS[seg],
                                    borderColor: `${SEGMENT_COLORS[seg]}40`
                                  }}
                                >
                                  {SEGMENT_LABELS[seg]}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">&mdash;</span>
                            )}
                          </div>
                        </td>

                        {/* Confidence */}
                        <td className="py-3.5 px-4">
                          <div className="w-24 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                              <span>{confidencePercent}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  confidencePercent >= 80
                                    ? 'bg-emerald-500'
                                    : confidencePercent >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${confidencePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Classification Status */}
                        <td className="py-3.5 px-4">
                          {c.classificationStatus === 'CLASSIFIED' ? (
                            <span className="inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                              Classified
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" />
                              Insufficient Data
                            </span>
                          )}
                        </td>

                        {/* Classification Timestamp */}
                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          {new Date(c.classifiedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric'
                          })}
                          <div className="text-[10px] text-slate-400">
                            {new Date(c.classifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCustomer(c)}
                            className="text-xs h-7 px-2.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                          >
                            View Evidence
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/60 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {meta.totalRecords === 0 ? 0 : (meta.page - 1) * meta.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(meta.page * meta.limit, meta.totalRecords)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{meta.totalRecords}</span> customer records
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrevPage || isLoadingList}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-slate-700 px-2">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage || isLoadingList}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Classification Evidence Modal / Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/80 rounded-t-2xl">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedCustomer.customerId} &bull; {selectedCustomer.customerName}
                  </h3>
                  <Badge variant="outline">{selectedCustomer.customerType}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedCustomer.email}</p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReclassifySingle(selectedCustomer.customerId)}
                  disabled={isReclassifying}
                  className="text-xs h-8"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isReclassifying ? 'animate-spin' : ''}`} />
                  Reclassify
                </Button>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Primary Segment & Confidence Banner */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Primary Classification
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    {selectedCustomer.primarySegment ? (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: SEGMENT_COLORS[selectedCustomer.primarySegment] }}
                      >
                        {SEGMENT_LABELS[selectedCustomer.primarySegment]}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-600">Unclassified</span>
                    )}

                    <span className="text-xs text-slate-500">
                      Rule Version <strong>v{selectedCustomer.ruleVersion}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Confidence Rating
                  </span>
                  <div className="text-lg font-bold text-slate-900">
                    {Math.round(selectedCustomer.confidence * 100)}%
                  </div>
                  <p className="text-[10px] text-slate-500">Evidence completeness score</p>
                </div>
              </div>

              {/* All Assigned Segments (Multi-Label) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  All Assigned Segment Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.segments && selectedCustomer.segments.length > 0 ? (
                    selectedCustomer.segments.map((seg) => (
                      <div
                        key={seg}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border"
                        style={{
                          backgroundColor: `${SEGMENT_COLORS[seg]}15`,
                          color: SEGMENT_COLORS[seg],
                          borderColor: `${SEGMENT_COLORS[seg]}50`
                        }}
                      >
                        <span>{SEGMENT_LABELS[seg]}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No segment conditions met</span>
                  )}
                </div>
              </div>

              {/* Reason Codes & Human-Readable Explanations */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Classification Explanations & Reason Codes
                </h4>
                <div className="space-y-2">
                  {selectedCustomer.explanations && selectedCustomer.explanations.length > 0 ? (
                    selectedCustomer.explanations.map((exp, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-start space-x-2.5"
                      >
                        <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-slate-800 font-medium">{exp}</p>
                          {selectedCustomer.reasonCodes && selectedCustomer.reasonCodes[idx] && (
                            <span className="text-[10px] font-mono text-slate-400 mt-0.5 inline-block">
                              Code: {selectedCustomer.reasonCodes[idx]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No explanations available.</p>
                  )}
                </div>
              </div>

              {/* Verified Supporting Evidence Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Supporting Profile Evidence
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Activity Evidence */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center space-x-2 text-slate-900 font-semibold border-b border-slate-100 pb-1.5">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span>Activity Velocity</span>
                    </div>
                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span>Last 30 Days Count:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.activityCount30d}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Previous 30 Days Count:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.activityCountPrevious30d}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Activity Reduction:</span>
                        <strong className="text-slate-900">
                          {selectedCustomer.evidence.activityReductionPercent !== null
                            ? `${selectedCustomer.evidence.activityReductionPercent}%`
                            : 'N/A'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Days Since Last Event:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.daysSinceLastActivity ?? 'None'} days</strong>
                      </div>
                    </div>
                  </div>

                  {/* Loyalty Evidence */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center space-x-2 text-slate-900 font-semibold border-b border-slate-100 pb-1.5">
                      <Award className="h-4 w-4 text-purple-600" />
                      <span>Loyalty & Tenure</span>
                    </div>
                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span>Loyalty Tier:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.loyaltyTier}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Loyalty Points:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.loyaltyPoints}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Membership Tenure:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.membershipDurationDays} days</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Plan:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.activePlan}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Billing Evidence */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center space-x-2 text-slate-900 font-semibold border-b border-slate-100 pb-1.5">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      <span>Billing & Receivables</span>
                    </div>
                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span>Total Invoiced:</span>
                        <strong className="text-slate-900">${selectedCustomer.evidence.totalInvoiced.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Outstanding:</span>
                        <strong className="text-slate-900">${selectedCustomer.evidence.totalOutstandingAmount.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Overdue Invoices:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.overdueInvoiceCount}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Oldest Overdue Days:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.oldestOverdueDays} days</strong>
                      </div>
                    </div>
                  </div>

                  {/* Disputes & Status */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center space-x-2 text-slate-900 font-semibold border-b border-slate-100 pb-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <span>Integrity & Exclusions</span>
                    </div>
                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span>Active Disputes:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.disputeCount}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Disputed Invoices Flag:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.hasDisputedInvoices ? 'YES' : 'NO'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Account Status:</span>
                        <strong className="text-slate-900">{selectedCustomer.accountStatus}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Plan Status:</span>
                        <strong className="text-slate-900">{selectedCustomer.evidence.planStatus}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                <span>Classified at: {new Date(selectedCustomer.classifiedAt).toLocaleString()}</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
