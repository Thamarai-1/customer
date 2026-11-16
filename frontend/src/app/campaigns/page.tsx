'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { PolicyApiClient, CampaignItem } from '../../services/policy.service';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  Tag
} from 'lucide-react';

const SEGMENTS = [
  'CONSISTENT_CUSTOMER',
  'LOYALTY_CANDIDATE',
  'DECLINING_ACTIVITY',
  'INACTIVE',
  'OVERDUE_BILL'
];

const OBJECTIVES = [
  'CUSTOMER_APPRECIATION',
  'LOYALTY_REWARD',
  'CUSTOMER_ENGAGEMENT',
  'RE_ENGAGEMENT',
  'CUSTOMER_RETENTION',
  'SUBSCRIPTION_RENEWAL',
  'PAYMENT_FOLLOW_UP'
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [segmentFilter, setSegmentFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    campaignCode: '',
    name: '',
    description: '',
    objective: 'CUSTOMER_ENGAGEMENT',
    targetSegments: ['CONSISTENT_CUSTOMER'],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    priority: 1,
    toneGuideline: 'WARM_APPRECIATIVE',
    allowedChannels: ['EMAIL', 'SMS']
  });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await PolicyApiClient.listCampaigns({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        targetSegment: segmentFilter === 'ALL' ? undefined : segmentFilter,
        search: search.trim() || undefined
      });
      setCampaigns(res.campaigns);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, segmentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCampaigns();
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      await PolicyApiClient.updateCampaignStatus(campaignId, newStatus);
      fetchCampaigns();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      setCreateError(null);
      await PolicyApiClient.createCampaign({
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      });
      setShowCreateModal(false);
      fetchCampaigns();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const activeCount = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const draftCount = campaigns.filter((c) => c.status === 'DRAFT').length;

  return (
    <AppShell activeModuleId="campaigns">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl border border-blue-500/20">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Strategy Management</h1>
                <p className="text-sm text-slate-400">
                  Define policy-aligned customer engagement campaigns, target segments, and attached rewards
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCampaigns()}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Total Campaigns</span>
              <Layers className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{campaigns.length}</div>
            <div className="text-xs text-slate-500 mt-1">Configured in registry</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Active In Market</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
            <div className="text-xs text-slate-500 mt-1">Available for recommendation</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Drafting Phase</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{draftCount}</div>
            <div className="text-xs text-slate-500 mt-1">Pending review & activation</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Policy Enforcement</span>
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1">Deterministic Rules</div>
            <div className="text-xs text-purple-400 mt-1">Validated before generation</div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'EXPIRED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search and Segment Dropdown */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Target Segments</option>
              {SEGMENTS.map((seg) => (
                <option key={seg} value={seg}>
                  {seg.replace('_', ' ')}
                </option>
              ))}
            </select>

            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search campaign code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </form>
          </div>
        </div>

        {/* Campaign List */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
            <p className="text-sm text-slate-400">Loading campaign configurations...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 flex items-center gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
            <Megaphone className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">No campaigns found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no campaigns matching your selected filter criteria. Try adjusting your filters or create a new campaign.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp._id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/60">
                          {camp.campaignCode}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            camp.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : camp.status === 'EXPIRED'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : camp.status === 'PAUSED'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              : 'bg-blue-950 text-blue-400 border border-blue-800/60'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white mt-1.5">{camp.name}</h3>
                    </div>

                    {/* Quick status dropdown */}
                    <select
                      value={camp.status}
                      onChange={(e) => handleStatusChange(camp._id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-1 outline-none"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{camp.description}</p>

                  {/* Objective & Target Segments */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Objective</span>
                      <span className="text-slate-300 font-medium">{camp.objective.replace(/_/g, ' ')}</span>
                    </div>

                    <div className="flex items-start justify-between text-xs">
                      <span className="text-slate-500">Target Segments</span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                        {camp.targetSegments.map((seg) => (
                          <span
                            key={seg}
                            className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                          >
                            {seg.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Validity Period</span>
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>{camp.startDate ? camp.startDate.slice(0, 10) : 'N/A'}</span>
                        <ArrowRight className="h-3 w-3 text-slate-600" />
                        <span>{camp.endDate ? camp.endDate.slice(0, 10) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Badges */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-blue-400" />
                    <span>{camp.offerIds?.length || 0} Attached Offers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Priority:</span>
                    <span className="font-semibold text-slate-300">{camp.priority}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Megaphone className="h-5 w-5 text-blue-500" />
                  <h3 className="text-base font-semibold text-white">Create New Campaign</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {createError && (
                  <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Campaign Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAMP-RENEWAL-2026"
                    value={formData.campaignCode}
                    onChange={(e) => setFormData({ ...formData, campaignCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Campaign Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual VIP Renewal Incentive"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the campaign objective and terms..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Objective</label>
                    <select
                      value={formData.objective}
                      onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {OBJECTIVES.map((obj) => (
                        <option key={obj} value={obj}>
                          {obj.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Target Segment</label>
                    <select
                      value={formData.targetSegments[0]}
                      onChange={(e) => setFormData({ ...formData, targetSegments: [e.target.value] })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {SEGMENTS.map((seg) => (
                        <option key={seg} value={seg}>
                          {seg.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50"
                  >
                    {createSubmitting ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
