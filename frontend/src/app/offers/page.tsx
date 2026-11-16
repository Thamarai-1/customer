'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import {
  PolicyApiClient,
  OfferItem,
  OfferEligibilityEvaluationResult
} from '../../services/policy.service';
import {
  Gift,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  Send
} from 'lucide-react';

const OFFER_TYPES = [
  'ALL',
  'PERCENTAGE_DISCOUNT',
  'FIXED_DISCOUNT',
  'LOYALTY_POINTS',
  'PLAN_UPGRADE',
  'PROMOTIONAL_CREDIT',
  'CUSTOM_REWARD'
];

const SEGMENTS = [
  'CONSISTENT_CUSTOMER',
  'LOYALTY_CANDIDATE',
  'DECLINING_ACTIVITY',
  'INACTIVE',
  'OVERDUE_BILL'
];

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Eligibility Tester Drawer State
  const [selectedOfferForTest, setSelectedOfferForTest] = useState<OfferItem | null>(null);
  const [testCustomerId, setTestCustomerId] = useState<string>('CUST-001');
  const [testChannel, setTestChannel] = useState<string>('EMAIL');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<OfferEligibilityEvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Create Offer Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    offerCode: '',
    name: '',
    description: '',
    offerType: 'PERCENTAGE_DISCOUNT',
    value: 20,
    valueType: 'PERCENTAGE',
    currency: 'USD',
    targetSegments: ['CONSISTENT_CUSTOMER'],
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    maxRedemptions: 500,
    minimumLoyaltyPoints: 0,
    minimumMembershipDays: 0,
    maxOverdueBalance: 0
  });

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await PolicyApiClient.listOffers({
        offerType: typeFilter === 'ALL' ? undefined : typeFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined
      });
      setOffers(res.offers);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [typeFilter, statusFilter]);

  const handleStatusChange = async (offerId: string, newStatus: string) => {
    try {
      await PolicyApiClient.updateOfferStatus(offerId, newStatus);
      fetchOffers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleTestEligibility = async () => {
    if (!selectedOfferForTest || !testCustomerId.trim()) return;
    try {
      setEvaluating(true);
      setEvalError(null);
      const result = await PolicyApiClient.evaluateOfferEligibility(
        selectedOfferForTest._id,
        testCustomerId.trim().toUpperCase(),
        testChannel
      );
      setEvalResult(result);
    } catch (err: unknown) {
      setEvalError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      setCreateError(null);
      await PolicyApiClient.createOffer({
        offerCode: formData.offerCode,
        name: formData.name,
        description: formData.description,
        offerType: formData.offerType,
        value: Number(formData.value),
        valueType: formData.valueType,
        currency: formData.currency,
        targetSegments: formData.targetSegments,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        maxRedemptions: Number(formData.maxRedemptions),
        eligibilityRules: {
          minimumLoyaltyPoints: Number(formData.minimumLoyaltyPoints) || undefined,
          minimumMembershipDays: Number(formData.minimumMembershipDays) || undefined,
          maxOverdueBalance: Number(formData.maxOverdueBalance)
        }
      });
      setShowCreateModal(false);
      fetchOffers();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const formatOfferValue = (offer: OfferItem) => {
    if (offer.offerType === 'PERCENTAGE_DISCOUNT') return `${offer.value}% OFF`;
    if (offer.offerType === 'LOYALTY_POINTS') return `${offer.value}x Points`;
    if (offer.offerType === 'PROMOTIONAL_CREDIT') return `${offer.value} Credit`;
    return `$${offer.value.toFixed(2)}`;
  };

  return (
    <AppShell activeModuleId="offers">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Offer & Reward Catalog</h1>
                <p className="text-sm text-slate-400">
                  Manage incentive rewards, deterministic eligibility constraints, and redemption capacity
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchOffers()}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Offer
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Catalog Size</span>
              <Gift className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{offers.length}</div>
            <div className="text-xs text-slate-500 mt-1">Configured reward incentives</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Active In Market</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {offers.filter((o) => o.status === 'ACTIVE').length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Available for recommendation</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Total Redemptions</span>
              <Layers className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {offers.reduce((acc, o) => acc + (o.currentRedemptions || 0), 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Redemptions across all offers</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Deterministic Gate</span>
              <ShieldCheck className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1">Rule-Based Gating</div>
            <div className="text-xs text-amber-400 mt-1">Zero debt & points validated</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {OFFER_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  typeFilter === t
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search code or offer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOffers()}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Offer Cards */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3" />
            <p className="text-sm text-slate-400">Loading offer registry...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 flex items-center gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {offers.map((offer) => {
              const capacityPercent = Math.min(
                100,
                Math.round(((offer.currentRedemptions || 0) / (offer.maxRedemptions || 1)) * 100)
              );

              return (
                <div
                  key={offer._id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-semibold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-900/60">
                            {offer.offerCode}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              offer.status === 'ACTIVE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {offer.status}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-white mt-1.5">{offer.name}</h3>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/50 inline-block">
                          {formatOfferValue(offer)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{offer.description}</p>

                    {/* Eligibility summary */}
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-1.5 text-[11px]">
                      <div className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">
                        Eligibility Constraints
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Min Points:</span>
                        <span className="text-slate-200 font-mono">
                          {offer.eligibilityRules?.minimumLoyaltyPoints ?? 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Min Tenure:</span>
                        <span className="text-slate-200 font-mono">
                          {offer.eligibilityRules?.minimumMembershipDays
                            ? `${offer.eligibilityRules.minimumMembershipDays}d`
                            : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Debt Restriction:</span>
                        <span className="text-slate-200 font-mono">
                          {offer.eligibilityRules?.maxOverdueBalance !== undefined
                            ? `$${offer.eligibilityRules.maxOverdueBalance} max`
                            : '$0 Max'}
                        </span>
                      </div>
                    </div>

                    {/* Redemption Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Redemptions</span>
                        <span>
                          {offer.currentRedemptions || 0} / {offer.maxRedemptions || 1000} ({capacityPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full"
                          style={{ width: `${capacityPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <select
                      value={offer.status}
                      onChange={(e) => handleStatusChange(offer._id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-1 outline-none"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>

                    <button
                      onClick={() => {
                        setSelectedOfferForTest(offer);
                        setEvalResult(null);
                        setEvalError(null);
                      }}
                      className="px-3 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-950/40 hover:bg-purple-900/50 rounded-lg border border-purple-800/60 flex items-center gap-1 transition-all"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Test Eligibility
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Interactive Offer Eligibility Tester Drawer */}
        {selectedOfferForTest && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
            <div className="bg-slate-900 border-l border-slate-800 w-full max-w-lg h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Offer Eligibility Tester</h3>
                      <p className="text-xs text-slate-400">Deterministic Policy Evaluation</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOfferForTest(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Offer Summary in Drawer */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-purple-400 font-semibold">
                      {selectedOfferForTest.offerCode}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      {formatOfferValue(selectedOfferForTest)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{selectedOfferForTest.name}</h4>
                  <p className="text-xs text-slate-400">{selectedOfferForTest.description}</p>
                </div>

                {/* Tester Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Customer ID to Evaluate
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CUST-001 or MongoDB ObjectId"
                      value={testCustomerId}
                      onChange={(e) => setTestCustomerId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 outline-none uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Outreach Channel
                    </label>
                    <select
                      value={testChannel}
                      onChange={(e) => setTestChannel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 outline-none"
                    >
                      <option value="EMAIL">EMAIL</option>
                      <option value="SMS">SMS</option>
                      <option value="WHATSAPP">WHATSAPP</option>
                      <option value="IN_APP">IN_APP</option>
                    </select>
                  </div>

                  <button
                    onClick={handleTestEligibility}
                    disabled={evaluating || !testCustomerId.trim()}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {evaluating ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Evaluating Deterministic Policies...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Run Deterministic Policy Test
                      </>
                    )}
                  </button>
                </div>

                {evalError && (
                  <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{evalError}</span>
                  </div>
                )}

                {/* Evaluation Results Card */}
                {evalResult && (
                  <div className="space-y-4 pt-2">
                    {/* Status Banner */}
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        evalResult.eligible
                          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {evalResult.eligible ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-6 w-6 text-rose-400 flex-shrink-0" />
                        )}
                        <div>
                          <div className="text-sm font-bold">
                            {evalResult.eligible ? 'CUSTOMER IS ELIGIBLE' : 'CUSTOMER IS INELIGIBLE'}
                          </div>
                          <div className="text-[11px] opacity-80">
                            Status: {evalResult.status} • Validated at {evalResult.validatedAt.slice(11, 19)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Failed Conditions */}
                    {evalResult.failedConditions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                          Failed Policy Rules ({evalResult.failedConditions.length})
                        </div>
                        <div className="space-y-2">
                          {evalResult.failedConditions.map((fc, i) => (
                            <div
                              key={i}
                              className="p-3 bg-slate-950 border border-rose-900/50 rounded-lg text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-rose-300 font-mono">{fc.rule}</span>
                                <span className="text-[10px] text-slate-500">
                                  Required: {String(fc.required)} | Actual: {String(fc.actual)}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[11px]">{fc.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Passed Conditions */}
                    {evalResult.passedConditions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          Passed Conditions ({evalResult.passedConditions.length})
                        </div>
                        <div className="space-y-1.5">
                          {evalResult.passedConditions.map((pc, i) => (
                            <div
                              key={i}
                              className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs text-slate-300 flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                              <span>{pc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reason Codes */}
                    {evalResult.reasonCodes.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                          Reason Codes
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {evalResult.reasonCodes.map((code) => (
                            <span
                              key={code}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => setSelectedOfferForTest(null)}
                  className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg bg-slate-800 text-center"
                >
                  Close Tester
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
