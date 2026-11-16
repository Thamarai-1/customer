'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import {
  ReviewService,
  IMessageReview,
  ReviewDashboardStats,
  ReviewWorkspaceDetail,
  ReviewStatus,
  RejectionReasonCode,
  IMessageVersion,
  IReviewAction
} from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import {
  CheckSquare,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  User,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit3,
  Sparkles,
  RotateCcw,
  Send,
  Lock,
  ChevronRight,
  History,
  FileText,
  DollarSign,
  Award,
  Layers,
  ArrowRight,
  AlertOctagon,
  Check,
  X,
  MessageSquare,
  TrendingUp,
  Tag
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

const STATUS_CONFIG: Record<
  ReviewStatus,
  { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
> = {
  PENDING_REVIEW: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Clock className="w-3.5 h-3.5" />,
    label: 'Pending Review'
  },
  UNDER_REVIEW: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: <Eye className="w-3.5 h-3.5" />,
    label: 'Under Review'
  },
  REVISION_REQUESTED: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    label: 'Revision Requested'
  },
  APPROVED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: 'Approved'
  },
  REJECTED: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: 'Rejected'
  },
  CANCELLED: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: <X className="w-3.5 h-3.5" />,
    label: 'Cancelled'
  }
};

const COMPLIANCE_STATUS_COLORS: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  PASS_WITH_WARNINGS: 'bg-amber-100 text-amber-800 border-amber-300',
  REVISION_REQUIRED: 'bg-orange-100 text-orange-800 border-orange-300',
  BLOCKED: 'bg-rose-100 text-rose-800 border-rose-300',
  INSUFFICIENT_DATA: 'bg-purple-100 text-purple-800 border-purple-300'
};

export default function ApprovalsPage() {
  const [reviews, setReviews] = useState<IMessageReview[]>([]);
  const [stats, setStats] = useState<ReviewDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [segmentFilter, setSegmentFilter] = useState<string>('ALL');

  // Review Workspace Modal
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [workspaceDetail, setWorkspaceDetail] = useState<ReviewWorkspaceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'segmentation' | 'policy' | 'message' | 'compliance' | 'history'>('message');

  // Action Modals State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Approve Modal (Warning Acknowledgement)
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [warningAcks, setWarningAcks] = useState<string[]>([]);
  const [approveComments, setApproveComments] = useState<string>('');

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReasonCode, setRejectReasonCode] = useState<RejectionReasonCode>('INAPPROPRIATE_TONE');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectComments, setRejectComments] = useState<string>('');

  // Revision Modal
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [revisionComments, setRevisionComments] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(AuthService.getStoredUser());
  }, []);

  const userRole = currentUser?.role || 'COMPLIANCE_REVIEWER';
  const canApproveOrReject = userRole === 'ADMIN' || userRole === 'COMPLIANCE_REVIEWER';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        ReviewService.listReviews({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          channel: channelFilter === 'ALL' ? undefined : channelFilter,
          segment: segmentFilter === 'ALL' ? undefined : segmentFilter,
          search: search.trim() || undefined
        }),
        ReviewService.getDashboardStats().catch(() => null)
      ]);
      setReviews(reviewsRes.reviews);
      if (statsRes) setStats(statsRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, channelFilter, segmentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openWorkspace = async (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setLoadingDetail(true);
    setIsEditing(false);
    try {
      const detail = await ReviewService.getReviewDetails(reviewId);
      setWorkspaceDetail(detail);
      setEditSubject(detail.currentVersion?.subject || detail.message?.subject || '');
      setEditBody(detail.currentVersion?.body || detail.message?.body || '');
      setEditReason('');
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load workspace details'
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeWorkspace = () => {
    setSelectedReviewId(null);
    setWorkspaceDetail(null);
    setIsEditing(false);
  };

  const handleStartReview = async () => {
    if (!selectedReviewId) return;
    setSubmittingAction(true);
    try {
      await ReviewService.startReview(selectedReviewId);
      setNotification({ type: 'success', message: 'Review claimed and moved to Under Review' });
      await openWorkspace(selectedReviewId);
      loadData();
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to start review'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedReviewId || !editSubject.trim() || !editBody.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await ReviewService.editMessage(selectedReviewId, {
        subject: editSubject,
        body: editBody,
        editReason: editReason || 'Manual copy refinement in human review workspace'
      });
      setNotification({
        type: 'success',
        message: `Version ${res.newVersion.version} created and compliance validation re-run.`
      });
      setIsEditing(false);
      await openWorkspace(selectedReviewId);
      loadData();
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to edit message'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedReviewId) return;
    setSubmittingAction(true);
    try {
      const res = await ReviewService.regenerateMessage(selectedReviewId, {
        reason: 'Regeneration requested during human review'
      });
      setNotification({
        type: 'success',
        message: `Version ${res.newVersion.version} regenerated via AI provider.`
      });
      await openWorkspace(selectedReviewId);
      loadData();
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to regenerate message'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleValidateNow = async () => {
    if (!selectedReviewId) return;
    setSubmittingAction(true);
    try {
      await ReviewService.validateReviewMessage(selectedReviewId);
      setNotification({ type: 'success', message: 'Compliance re-evaluation complete' });
      await openWorkspace(selectedReviewId);
      loadData();
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to validate message'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const confirmApprove = async () => {
    if (!workspaceDetail) return;
    setSubmittingAction(true);
    try {
      await ReviewService.approveReview(workspaceDetail.review._id, {
        messageVersion: workspaceDetail.review.currentMessageVersion,
        complianceValidationId: workspaceDetail.review.currentComplianceValidationId,
        warningAcknowledgements: warningAcks,
        comments: approveComments
      });
      setNotification({
        type: 'success',
        message: 'Message draft successfully APPROVED for delivery staging. (Delivery isolation maintained).'
      });
      setShowApproveModal(false);
      await openWorkspace(workspaceDetail.review._id);
      loadData();
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Approval precondition failed'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const confirmReject = async () => {
    if (!workspaceDetail || !rejectReason.trim()) return;
    setSubmittingAction(true);
    try {
      await ReviewService.rejectReview(workspaceDetail.review._id, {
        rejectionReasonCode: rejectReasonCode,
        rejectionReason: rejectReason,
        comments: rejectComments
      });
      setNotification({ type: 'success', message: 'Message draft rejected and recorded in audit log' });
      setShowRejectModal(false);
      await openWorkspace(workspaceDetail.review._id);
      loadData();
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to reject review'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const confirmRequestRevision = async () => {
    if (!workspaceDetail || !revisionComments.trim()) return;
    setSubmittingAction(true);
    try {
      await ReviewService.requestRevision(workspaceDetail.review._id, {
        comments: revisionComments
      });
      setNotification({ type: 'success', message: 'Revision instructions recorded. Review returned to Revision Requested.' });
      setShowRevisionModal(false);
      await openWorkspace(workspaceDetail.review._id);
      loadData();
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to request revision'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Chart data
  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Pending', count: stats.totalPendingReviews, color: '#f59e0b' },
      { name: 'Under Review', count: stats.currentlyUnderReview, color: '#3b82f6' },
      { name: 'Approved', count: stats.approvedMessages, color: '#10b981' },
      { name: 'Rejected', count: stats.rejectedMessages, color: '#ef4444' },
      { name: 'Revision', count: stats.revisionRequested, color: '#f97316' }
    ].filter((item) => item.count > 0);
  }, [stats]);

  return (
    <AppShell activeModuleId="approvals">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Human Review & Approval Workflow</h1>
                <p className="text-sm text-slate-500">
                  Strict human-in-the-loop decision interface. Ensures compliance-certified, fact-checked communication before delivery staging.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Role: {userRole}
            </span>
            <button
              onClick={() => {
                setRefreshing(true);
                loadData().finally(() => setRefreshing(false));
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPI Metrics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{stats.totalPendingReviews}</div>
              <div className="text-xs text-slate-400 mt-1">Awaiting review</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Under Review</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{stats.currentlyUnderReview}</div>
              <div className="text-xs text-slate-400 mt-1">Claimed by reviewers</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.approvedMessages}</div>
              <div className="text-xs text-slate-400 mt-1">Ready for staging</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected</div>
              <div className="text-2xl font-bold text-rose-600 mt-1">{stats.rejectedMessages}</div>
              <div className="text-xs text-slate-400 mt-1">Permanent refusal</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Revision Req.</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">{stats.revisionRequested}</div>
              <div className="text-xs text-slate-400 mt-1">Sent back for copy</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Warnings</div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.messagesWithComplianceWarnings}</div>
              <div className="text-xs text-slate-400 mt-1">Req. acknowledgement</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Blocked</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{stats.messagesBlockedByCompliance}</div>
              <div className="text-xs text-slate-400 mt-1">Critical violations</div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {statusChartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Review Queue Status Distribution
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Workload Volume by Decision
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData}>
                    <XAxis dataKey="name" fontSize={12} stroke="#64748b" />
                    <YAxis fontSize={12} stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {statusChartData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Queue Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Customer ID, Subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="REVISION_REQUESTED">Revision Requested</option>
              </select>

              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Channels</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="IN_APP">In-App</option>
              </select>

              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Segments</option>
                <option value="CONSISTENT_CUSTOMER">Consistent Customer</option>
                <option value="LOYALTY_CANDIDATE">Loyalty Candidate</option>
                <option value="DECLINING_ACTIVITY">Declining Activity</option>
                <option value="INACTIVE">Inactive / Dormant</option>
                <option value="OVERDUE_BILL">Overdue Bill</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Draft Subject & Version</th>
                  <th className="py-3 px-4">Segment / Channel</th>
                  <th className="py-3 px-4">Compliance Decision</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading human review queue...
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No communications in the review queue matching the active filters.
                    </td>
                  </tr>
                ) : (
                  reviews.map((rev) => {
                    const statusCfg = STATUS_CONFIG[rev.status] || STATUS_CONFIG.PENDING_REVIEW;
                    const complianceBadge =
                      COMPLIANCE_STATUS_COLORS[rev.complianceReport?.overallStatus || 'PASS'] ||
                      'bg-slate-100 text-slate-700';

                    return (
                      <tr key={rev._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {rev.customer?.firstName
                              ? `${rev.customer.firstName} ${rev.customer.lastName}`
                              : rev.customerId}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-indigo-600">{rev.customerId}</span>
                            {rev.customer?.loyaltyTier && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-medium text-[10px]">
                                {rev.customer.loyaltyTier}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-slate-800 truncate" title={rev.messageDraft?.subject}>
                            {rev.messageDraft?.subject || 'Communication Draft'}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold font-mono text-[10px]">
                              v{rev.currentMessageVersion}
                            </span>
                            {rev.staleDataDetected && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-semibold text-[10px] flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Stale Data
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs font-semibold text-slate-700">
                            {rev.messageDraft?.primarySegment?.replace('_', ' ') || 'GENERAL'}
                          </div>
                          <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
                            {rev.messageDraft?.channel || 'EMAIL'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${complianceBadge}`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {rev.complianceReport?.overallStatus || 'EVALUATED'}
                          </span>
                          {rev.complianceReport?.summary?.warnings ? (
                            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                              {rev.complianceReport.summary.warnings} warning(s)
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {rev.assignedReviewerName || rev.reviewedByName ? (
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium text-slate-700">
                                {rev.assignedReviewerName || rev.reviewedByName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openWorkspace(rev._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6-Section Review Workspace Modal */}
        {selectedReviewId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
              {/* Workspace Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        Human Review Workspace — {workspaceDetail?.customer ? `${workspaceDetail.customer.firstName} ${workspaceDetail.customer.lastName}` : 'Review Item'}
                      </h2>
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        v{workspaceDetail?.review.currentMessageVersion}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Customer: <b>{workspaceDetail?.review.customerId}</b></span>
                      <span>•</span>
                      <span>Review ID: <span className="font-mono">{selectedReviewId}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={closeWorkspace}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Workspace Tabs */}
              <div className="flex items-center border-b border-slate-200 bg-white px-5 gap-1 overflow-x-auto text-xs font-medium text-slate-600">
                <button
                  onClick={() => setActiveTab('message')}
                  className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'message'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message & Versions
                </button>
                <button
                  onClick={() => setActiveTab('compliance')}
                  className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'compliance'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Compliance Report (11 Checks)
                </button>
                <button
                  onClick={() => setActiveTab('customer')}
                  className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'customer'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Customer Profile
                </button>
                <button
                  onClick={() => setActiveTab('segmentation')}
                  className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'segmentation'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  Segmentation Evidence
                </button>
                <button
                  onClick={() => setActiveTab('policy')}
                  className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'policy'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  Campaign & Offer Rules
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'history'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Audit Trail
                </button>
              </div>

              {/* Workspace Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {loadingDetail || !workspaceDetail ? (
                  <div className="py-20 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
                    Loading complete review evidence and artifacts...
                  </div>
                ) : (
                  <>
                    {/* Tab 1: Message & Versions */}
                    {activeTab === 'message' && (
                      <div className="space-y-6">
                        {/* Stale Data Alert if detected */}
                        {workspaceDetail.review.staleDataDetected && (
                          <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-sm flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold">Stale Customer Fact Detected!</div>
                              <div>{workspaceDetail.review.staleDataReason || 'Customer profile fact changed since draft generation.'}</div>
                            </div>
                          </div>
                        )}

                        {/* Current Draft Display / Editor */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Working Copy Draft
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                v{workspaceDetail.review.currentMessageVersion} ({workspaceDetail.currentVersion?.source || 'AI_GENERATED'})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {workspaceDetail.review.status !== 'APPROVED' &&
                                workspaceDetail.review.status !== 'REJECTED' &&
                                workspaceDetail.review.status !== 'CANCELLED' && (
                                  <>
                                    <button
                                      onClick={() => setIsEditing(!isEditing)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                                      {isEditing ? 'Cancel Edit' : 'Edit Copy'}
                                    </button>
                                    <button
                                      onClick={handleRegenerate}
                                      disabled={submittingAction}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 shadow-sm transition-colors disabled:opacity-50"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      Regenerate
                                    </button>
                                  </>
                                )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Email Subject Line
                                </label>
                                <input
                                  type="text"
                                  value={editSubject}
                                  onChange={(e) => setEditSubject(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Message Body
                                </label>
                                <textarea
                                  rows={6}
                                  value={editBody}
                                  onChange={(e) => setEditBody(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Reason for Edit (Audit Log)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Adjusted tone for brand consistency, added expiry date..."
                                  value={editReason}
                                  onChange={(e) => setEditReason(e.target.value)}
                                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                  onClick={() => setIsEditing(false)}
                                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={submittingAction}
                                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                                >
                                  Save New Version & Revalidate
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="text-xs font-semibold text-slate-500 uppercase">Subject:</div>
                                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                                  {workspaceDetail.currentVersion?.subject || workspaceDetail.message?.subject}
                                </div>
                              </div>
                              <div className="p-4 bg-white rounded-lg border border-slate-200 text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                                {workspaceDetail.currentVersion?.body || workspaceDetail.message?.body}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Version History Table */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            Immutable Version History ({workspaceDetail.versions?.length || 1})
                          </h4>
                          <div className="space-y-2">
                            {workspaceDetail.versions?.map((ver) => (
                              <div
                                key={ver._id}
                                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                                  ver.version === workspaceDetail.review.currentMessageVersion
                                    ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900 font-medium'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-white border border-slate-200 shadow-sm">
                                    v{ver.version}
                                  </span>
                                  <div>
                                    <div className="font-semibold text-slate-900">{ver.subject}</div>
                                    <div className="text-slate-500 text-[11px]">
                                      Source: <span className="font-medium text-slate-700">{ver.source}</span>
                                      {ver.editedByName && ` by ${ver.editedByName}`}
                                      {ver.editReason && ` • "${ver.editReason}"`}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  {new Date(ver.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Compliance Report (11 Checks) */}
                    {activeTab === 'compliance' && (
                      <div className="space-y-5">
                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                COMPLIANCE_STATUS_COLORS[workspaceDetail.complianceReport?.overallStatus || 'PASS']
                              }`}
                            >
                              {workspaceDetail.complianceReport?.overallStatus || 'PASS'}
                            </span>
                            <span className="text-xs text-slate-600 font-medium">
                              Passed {workspaceDetail.complianceReport?.summary?.passed}/11 Checks
                            </span>
                            {workspaceDetail.complianceReport?.summary?.warnings ? (
                              <span className="text-xs font-bold text-amber-600">
                                ({workspaceDetail.complianceReport.summary.warnings} Warning Flag)
                              </span>
                            ) : null}
                          </div>
                          <button
                            onClick={handleValidateNow}
                            disabled={submittingAction}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Re-Run All 11 Checks
                          </button>
                        </div>

                        {/* All 11 Checks list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {workspaceDetail.complianceReport?.checks?.map((check) => {
                            const isPass = check.status === 'PASSED';
                            const isWarn = check.status === 'WARNING';

                            return (
                              <div
                                key={check.checkId}
                                className={`p-4 rounded-xl border ${
                                  isPass
                                    ? 'bg-white border-slate-200'
                                    : isWarn
                                    ? 'bg-amber-50/60 border-amber-200'
                                    : 'bg-rose-50/60 border-rose-200'
                                } shadow-sm`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    {isPass ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    ) : isWarn ? (
                                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                    )}
                                    {check.checkName}
                                  </div>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      isPass
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isWarn
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {check.status}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600">{check.message}</p>
                                {check.findings?.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                                    {check.findings.map((f, idx) => (
                                      <div key={idx} className="text-[11px] text-slate-700 bg-white/70 p-1.5 rounded">
                                        <div className="font-semibold text-rose-700">{f.reasonCode}: {f.message}</div>
                                        {f.recommendedAction && (
                                          <div className="text-slate-500 text-[10px]">Action: {f.recommendedAction}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Customer Profile */}
                    {activeTab === 'customer' && (
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Customer Name</div>
                            <div className="text-base font-bold text-slate-900 mt-0.5">
                              {workspaceDetail.customer.firstName} {workspaceDetail.customer.lastName}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Customer ID</div>
                            <div className="text-base font-mono font-bold text-indigo-600 mt-0.5">
                              {workspaceDetail.customer.customerId}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Email</div>
                            <div className="text-sm font-medium text-slate-800 mt-0.5">
                              {workspaceDetail.customer.email}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Phone</div>
                            <div className="text-sm font-medium text-slate-800 mt-0.5">
                              {workspaceDetail.customer.phone}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Loyalty Tier</div>
                            <div className="text-sm font-bold text-amber-600 mt-0.5">
                              {workspaceDetail.customer.loyaltyTier}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Account Status</div>
                            <div className="text-sm font-semibold text-emerald-600 mt-0.5">
                              {workspaceDetail.customer.accountStatus}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Monthly Spend</div>
                            <div className="text-sm font-bold text-slate-900 mt-0.5">
                              ${workspaceDetail.customer.monthlySpend?.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Total Spend</div>
                            <div className="text-sm font-bold text-slate-900 mt-0.5">
                              ${workspaceDetail.customer.totalSpend?.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Communication Preferences */}
                        {workspaceDetail.preferences && (
                          <div className="pt-4 border-t border-slate-200">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                              Outreach Preferences & Consent
                            </h4>
                            <div className="flex flex-wrap gap-3">
                              <span
                                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                  workspaceDetail.preferences.emailConsent
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                Email: {workspaceDetail.preferences.emailConsent ? 'Opted In' : 'Denied'}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                  workspaceDetail.preferences.smsConsent
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                SMS: {workspaceDetail.preferences.smsConsent ? 'Opted In' : 'Denied'}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                  !workspaceDetail.preferences.optedOut
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                Global Opt-Out: {workspaceDetail.preferences.optedOut ? 'OPTED OUT' : 'Active'}
                              </span>
                              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                                Preferred Channel: {workspaceDetail.preferences.preferredChannel}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 4: Segmentation Evidence */}
                    {activeTab === 'segmentation' && (
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                            {workspaceDetail.message?.primarySegment?.replace('_', ' ') || 'CONSISTENT CUSTOMER'}
                          </span>
                          <span className="text-xs text-slate-500">
                            Objective: <b>{workspaceDetail.message?.objective || 'ENGAGEMENT'}</b>
                          </span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-xs font-bold text-slate-600 uppercase mb-2">Grounding Evidence Snapshot</div>
                          <pre className="text-xs text-slate-700 bg-white p-3 rounded border border-slate-200 overflow-x-auto font-mono">
                            {JSON.stringify(workspaceDetail.message?.evidenceSnapshot || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Tab 5: Campaign & Offer Rules */}
                    {activeTab === 'policy' && (
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        {workspaceDetail.policyReport ? (
                          <div className="space-y-4">
                            <div>
                              <div className="text-xs text-slate-500 uppercase">Applied Engagement Strategy</div>
                              <div className="text-base font-bold text-slate-900 mt-0.5">
                                {workspaceDetail.policyReport.strategy?.strategyName || 'Standard Engagement'}
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                {workspaceDetail.policyReport.strategy?.toneGuidelines}
                              </p>
                            </div>
                            {workspaceDetail.policyReport.offers?.length > 0 && (
                              <div className="pt-3 border-t border-slate-200">
                                <div className="text-xs text-slate-500 uppercase mb-2">Approved Offers</div>
                                {workspaceDetail.policyReport.offers.map((off) => (
                                  <div key={off.offerCode} className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs">
                                    <div className="font-bold text-amber-900">{off.name} ({off.offerCode})</div>
                                    <div className="text-amber-800 mt-0.5">{off.description}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic">No specific campaign policy attached to message.</div>
                        )}
                      </div>
                    )}

                    {/* Tab 6: Audit Trail */}
                    {activeTab === 'history' && (
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Action Audit Trail ({workspaceDetail.actions?.length || 0})
                        </h4>
                        <div className="space-y-2">
                          {workspaceDetail.actions?.map((act) => (
                            <div key={act._id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-indigo-700">{act.action}</span>
                                <span className="text-slate-400 text-[11px]">
                                  {new Date(act.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-slate-700 mt-1">
                                By: <b>{act.reviewerName}</b>
                                {act.comments && ` • "${act.comments}"`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Workspace Sticky Footer / Actions */}
              {workspaceDetail && (
                <div className="p-4 border-t border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Current Status: <b className="text-slate-800">{workspaceDetail.review.status}</b>
                    {workspaceDetail.review.status === 'APPROVED' && (
                      <span className="ml-2 text-emerald-600 font-semibold">• Staged for Delivery Engine (Phase 8)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {workspaceDetail.review.status === 'PENDING_REVIEW' && (
                      <button
                        onClick={handleStartReview}
                        disabled={submittingAction}
                        className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-sm disabled:opacity-50"
                      >
                        Claim & Start Review
                      </button>
                    )}

                    {workspaceDetail.review.status !== 'APPROVED' &&
                      workspaceDetail.review.status !== 'REJECTED' &&
                      workspaceDetail.review.status !== 'CANCELLED' && (
                        <>
                          <button
                            onClick={() => setShowRevisionModal(true)}
                            disabled={submittingAction}
                            className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg shadow-sm disabled:opacity-50"
                          >
                            Request Revision
                          </button>

                          {canApproveOrReject && (
                            <>
                              <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={submittingAction}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-sm disabled:opacity-50"
                              >
                                Reject
                              </button>

                              <button
                                onClick={() => {
                                  // Pre-fill warnings if PASS_WITH_WARNINGS
                                  if (workspaceDetail.complianceReport?.overallStatus === 'PASS_WITH_WARNINGS') {
                                    setWarningAcks(
                                      workspaceDetail.complianceReport.findings?.map((f) => f.message) || []
                                    );
                                  } else {
                                    setWarningAcks([]);
                                  }
                                  setShowApproveModal(true);
                                }}
                                disabled={submittingAction}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <Check className="w-4 h-4" />
                                Approve Communication
                              </button>
                            </>
                          )}
                        </>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Approve Review with Warning Acknowledgement */}
        {showApproveModal && workspaceDetail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Approve Customer Communication</h3>
                  <p className="text-xs text-slate-500">Confirm human sign-off for message draft v{workspaceDetail.review.currentMessageVersion}</p>
                </div>
              </div>

              {/* Warning acknowledgement requirement */}
              {workspaceDetail.complianceReport?.overallStatus === 'PASS_WITH_WARNINGS' && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Mandatory Warning Acknowledgement
                  </div>
                  <p className="text-xs text-amber-700">
                    This communication draft has compliance advisory warnings. Human reviewer must explicitly acknowledge these warnings to proceed with approval.
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {workspaceDetail.complianceReport.findings?.map((f, i) => (
                      <label key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={warningAcks.includes(f.message)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWarningAcks([...warningAcks, f.message]);
                            } else {
                              setWarningAcks(warningAcks.filter((w) => w !== f.message));
                            }
                          }}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{f.message}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Boundary Disclaimer */}
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <b>Delivery Isolation Boundary:</b> Approving this message marks it ready for delivery staging. It will <b>NOT</b> be sent or dispatched until Phase 8 controlled delivery workflows execute.
                </span>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approval Notes / Comments (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Review verified and approved for customer..."
                  value={approveComments}
                  onChange={(e) => setApproveComments(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={
                    submittingAction ||
                    (workspaceDetail.complianceReport?.overallStatus === 'PASS_WITH_WARNINGS' &&
                      warningAcks.length === 0)
                  }
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Confirm Sign-Off & Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Reject Review */}
        {showRejectModal && workspaceDetail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Reject Communication Draft</h3>
                  <p className="text-xs text-slate-500">Record formal refusal for this AI draft</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rejection Reason Code <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={rejectReasonCode}
                    onChange={(e) => setRejectReasonCode(e.target.value as RejectionReasonCode)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="INAPPROPRIATE_TONE">Inappropriate Tone or Language</option>
                    <option value="INCORRECT_FACTS">Incorrect Customer or Billing Facts</option>
                    <option value="UNAPPROVED_OFFER">Unapproved or Expired Promotional Offer</option>
                    <option value="POLICY_VIOLATION">Corporate Outreach Policy Violation</option>
                    <option value="COMPLIANCE_NON_COMPLIANT">Safety or Compliance Non-Compliant</option>
                    <option value="CUSTOMER_OPTED_OUT">Customer Opted Out or Over Frequency Limit</option>
                    <option value="DUPLICATE_COMMUNICATION">Duplicate Communication Detected</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rejection Justification <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of why communication is rejected..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional context for marketing and audit logs..."
                    value={rejectComments}
                    onChange={(e) => setRejectComments(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  disabled={submittingAction || !rejectReason.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Request Revision */}
        {showRevisionModal && workspaceDetail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Request Revision</h3>
                  <p className="text-xs text-slate-500">Provide actionable instructions for draft revision</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Revision Feedback / Actionable Instructions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Please clarify reward redemption expiration date and soften the introductory greeting..."
                  value={revisionComments}
                  onChange={(e) => setRevisionComments(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowRevisionModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRequestRevision}
                  disabled={submittingAction || !revisionComments.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Send for Revision
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
