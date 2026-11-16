'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import {
  AIMessageService,
  GeneratedMessageItem,
  AIProviderInfo,
  MessageGenerationConfig,
  GenerationContextPreview
} from '../../services/ai-message.service';
import { CustomerApiClient, CustomerSummaryItem } from '../../services/customer.service';
import { PolicyApiClient, PolicyEvaluationReport } from '../../services/policy.service';
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  RefreshCw,
  Sliders,
  Eye,
  History,
  ShieldAlert,
  Send,
  User,
  Mail,
  Gift,
  Clock,
  Layers,
  Search,
  Check,
  ChevronRight,
  Info,
  X
} from 'lucide-react';

export default function AIMessagesPage() {
  // Customer selection
  const [customers, setCustomers] = useState<CustomerSummaryItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryItem | null>(null);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(true);

  // Policy decision & Preview evidence
  const [policyReport, setPolicyReport] = useState<PolicyEvaluationReport | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState<boolean>(false);
  const [previewContext, setPreviewContext] = useState<GenerationContextPreview | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // AI Provider & Generation
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'OPENAI' | 'GEMINI' | 'ANTHROPIC'>('OPENAI');
  const [generating, setGenerating] = useState<boolean>(false);
  const [currentDraft, setCurrentDraft] = useState<GeneratedMessageItem | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Drafts History
  const [draftHistory, setDraftHistory] = useState<GeneratedMessageItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Regeneration Modal
  const [showRegenModal, setShowRegenModal] = useState<boolean>(false);
  const [regenReason, setRegenReason] = useState<string>('');
  const [regenerating, setRegenerating] = useState<boolean>(false);

  // Config settings modal
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [config, setConfig] = useState<MessageGenerationConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Copy feedback state
  const [copiedSubject, setCopiedSubject] = useState<boolean>(false);
  const [copiedBody, setCopiedBody] = useState<boolean>(false);

  // 1. Load initial customer list and configured AI providers
  useEffect(() => {
    async function initData() {
      try {
        setLoadingCustomers(true);
        const [custRes, provRes] = await Promise.all([
          CustomerApiClient.listCustomers({ page: 1, limit: 30 }),
          AIMessageService.getProviders().catch(() => [])
        ]);
        setCustomers(custRes.customers || []);
        if (custRes.customers && custRes.customers.length > 0) {
          setSelectedCustomerId(custRes.customers[0].customerId);
          setSelectedCustomer(custRes.customers[0]);
        }
        setProviders(provRes);
      } catch (err: unknown) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoadingCustomers(false);
      }
    }
    initData();
  }, []);

  // 2. Load policy decision and message history whenever selected customer changes
  useEffect(() => {
    if (!selectedCustomerId) return;

    async function loadCustomerContext() {
      try {
        setLoadingPolicy(true);
        setLoadingHistory(true);
        setGenerationError(null);

        const [report, historyRes] = await Promise.all([
          PolicyApiClient.evaluateCustomerPolicy(selectedCustomerId).catch(() => null),
          AIMessageService.listCustomerDrafts(selectedCustomerId, 1, 10).catch(() => ({
            messages: [],
            meta: { totalRecords: 0, totalPages: 1 }
          }))
        ]);

        setPolicyReport(report);
        setDraftHistory(historyRes.messages || []);
        if (historyRes.messages && historyRes.messages.length > 0) {
          setCurrentDraft(historyRes.messages[0]);
        } else {
          setCurrentDraft(null);
        }
      } catch (err: unknown) {
        console.error('Error loading customer policy or history:', err);
      } finally {
        setLoadingPolicy(false);
        setLoadingHistory(false);
      }
    }

    loadCustomerContext();
  }, [selectedCustomerId]);

  // Handle Customer Selection
  const handleSelectCustomer = (cust: CustomerSummaryItem) => {
    setSelectedCustomerId(cust.customerId);
    setSelectedCustomer(cust);
  };

  // Trigger LangGraph Message Generation
  const handleGenerate = async () => {
    if (!selectedCustomerId) return;
    try {
      setGenerating(true);
      setGenerationError(null);
      const draft = await AIMessageService.generateDraft(selectedCustomerId, {
        provider: selectedProvider,
        channel: 'EMAIL'
      });
      setCurrentDraft(draft);
      setDraftHistory((prev) => [draft, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Message generation failed';
      setGenerationError(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Trigger Regeneration
  const handleRegenerate = async () => {
    if (!currentDraft) return;
    try {
      setRegenerating(true);
      const newDraft = await AIMessageService.regenerateDraft(currentDraft._id, {
        reason: regenReason.trim() || undefined,
        provider: selectedProvider
      });
      setCurrentDraft(newDraft);
      setDraftHistory((prev) => [newDraft, ...prev]);
      setShowRegenModal(false);
      setRegenReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to regenerate draft');
    } finally {
      setRegenerating(false);
    }
  };

  // Fetch Evidence Preview Modal
  const handleOpenPreview = async () => {
    if (!selectedCustomerId) return;
    try {
      setLoadingPreview(true);
      const preview = await AIMessageService.previewContext(selectedCustomerId);
      setPreviewContext(preview);
      setShowPreviewModal(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to load preview context');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Open Config Modal
  const handleOpenConfig = async () => {
    try {
      const cfg = await AIMessageService.getConfig();
      setConfig(cfg);
      setShowConfigModal(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to load configuration');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      setSavingConfig(true);
      const updated = await AIMessageService.updateConfig(config);
      setConfig(updated);
      setShowConfigModal(false);
      alert('AI Configuration updated successfully');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const copyToClipboard = (text: string, type: 'subject' | 'body') => {
    navigator.clipboard.writeText(text);
    if (type === 'subject') {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.firstName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.lastName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.customerId.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <AppShell activeModuleId="ai-messages">
      <div className="space-y-6">
        {/* Phase 5 Scope Boundary Banner */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Phase 5: GenAI Message Generation Workspace
                </h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                  LangGraph Orchestrated
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Emails are bounded by deterministic policy decisions &amp; verified data.
                Autonomous dispatch (Phase 8) &amp; Human approvals (Phase 7) are disabled.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Provider Settings
            </button>
          </div>
        </div>

        {/* Main Grid: Left Column (Customer Selector & Policy Decision), Right Column (Generation & Draft) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Customer Selection & Grounding Evidence Summary */}
          <div className="lg:col-span-4 space-y-6">
            {/* Customer Picker */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Target Customer
                </label>
                <span className="text-xs text-slate-500">{customers.length} available</span>
              </div>

              {/* Search Customer */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, ID or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              {/* Customer List Dropdown / Scroll */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {loadingCustomers ? (
                  <div className="text-center py-4 text-xs text-slate-400">Loading customers...</div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">No customers found</div>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isSelected = cust.customerId === selectedCustomerId;
                    return (
                      <button
                        key={cust._id}
                        onClick={() => handleSelectCustomer(cust)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {cust.firstName} {cust.lastName}
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {cust.customerId} • {cust.subscription?.activePlan || 'No Plan'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              cust.loyaltyInfo?.loyaltyTier === 'PLATINUM'
                                ? 'bg-purple-100 text-purple-700'
                                : cust.loyaltyInfo?.loyaltyTier === 'GOLD'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cust.loyaltyInfo?.loyaltyTier || 'BRONZE'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Policy Decision Summary Card */}
            {selectedCustomer && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Verified Evidence &amp; Policy
                  </h4>
                  <button
                    onClick={handleOpenPreview}
                    disabled={loadingPreview}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Evidence
                  </button>
                </div>

                {loadingPolicy ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    Evaluating customer policy...
                  </div>
                ) : policyReport ? (
                  <div className="space-y-3.5 text-xs">
                    {/* Primary Segment */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Primary Segment:</span>
                      <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                        {policyReport.strategy?.primarySegment || 'CONSISTENT_CUSTOMER'}
                      </span>
                    </div>

                    {/* Objective & Tone */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Objective:</span>
                      <span className="text-slate-800 font-semibold">
                        {policyReport.strategy?.primaryObjective}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Recommended Tone:</span>
                      <span className="text-slate-800 font-semibold">
                        {policyReport.strategy?.recommendedTone}
                      </span>
                    </div>

                    {/* Communication Consent */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Outreach Eligibility:</span>
                      {policyReport.channelConsent?.isEligibleForOutreach ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Eligible (Email Consented)
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Opted Out
                        </span>
                      )}
                    </div>

                    {/* Eligible Offers */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-medium block mb-1">
                        Eligible Offers ({policyReport.offers?.eligibleOffers?.length || 0}):
                      </span>
                      {policyReport.offers?.eligibleOffers && policyReport.offers.eligibleOffers.length > 0 ? (
                        <div className="space-y-1">
                          {policyReport.offers.eligibleOffers.map((o) => (
                            <div
                              key={o.offerCode}
                              className="flex items-center justify-between bg-amber-50/70 text-amber-800 px-2 py-1 rounded border border-amber-200/50"
                            >
                              <span className="font-semibold flex items-center gap-1">
                                <Gift className="w-3 h-3 text-amber-600" />
                                {o.offerCode}
                              </span>
                              <span className="text-[11px] font-medium">Eligible</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None available or promotions suppressed</span>
                      )}
                    </div>

                    {/* Billing Overdue Alert */}
                    {Object.keys(policyReport.billing?.totalOverdueByCurrency || {}).length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-2 text-amber-900 space-y-1">
                        <div className="font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Overdue Balance Detected
                        </div>
                        <div className="text-[11px]">
                          Stage: {policyReport.billing.highestStage} • Total Overdue: $
                          {Object.values(policyReport.billing.totalOverdueByCurrency || {})[0] || '0.00'}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400">
                    Could not retrieve policy evaluation.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Generation Console & Live Draft View */}
          <div className="lg:col-span-8 space-y-6">
            {/* Generation Console Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-600" />
                    AI Draft Generation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a multi-model provider to orchestrate grounded generation via LangGraph.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Provider Selector */}
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value as any)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="OPENAI">OpenAI (GPT-4o)</option>
                    <option value="GEMINI">Google Gemini (Gemini 1.5 Pro)</option>
                    <option value="ANTHROPIC">Anthropic Claude (Claude 3.5 Sonnet)</option>
                  </select>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !selectedCustomerId}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Draft...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Email Draft
                      </>
                    )}
                  </button>
                </div>
              </div>

              {generationError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}
            </div>

            {/* Generated Email Draft Card */}
            {currentDraft ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Email Viewer Header */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Status:</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        currentDraft.generationStatus === 'GENERATED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentDraft.generationStatus === 'REFUSED'
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {currentDraft.generationStatus}
                    </span>

                    {/* Grounding Badge */}
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                        currentDraft.groundingStatus === 'PASSED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : currentDraft.groundingStatus === 'FLAGGED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {currentDraft.groundingStatus === 'PASSED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      Grounding: {currentDraft.groundingStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRegenModal(true)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      Regenerate
                    </button>
                    <button
                      onClick={() => copyToClipboard(currentDraft.subject, 'subject')}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition"
                    >
                      {copiedSubject ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      Copy Subject
                    </button>
                    <button
                      onClick={() => copyToClipboard(currentDraft.body, 'body')}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition"
                    >
                      {copiedBody ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      Copy Body
                    </button>
                  </div>
                </div>

                {/* Refusal Notice if applicable */}
                {currentDraft.generationStatus === 'REFUSED' && (
                  <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Generation Refused by Policy Engine</div>
                      <div>{currentDraft.refusalReason || 'Customer preconditions were not met.'}</div>
                    </div>
                  </div>
                )}

                {/* Validation Findings Banner if failed */}
                {currentDraft.validationFindings && currentDraft.validationFindings.length > 0 && (
                  <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs space-y-2">
                    <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Grounding Findings ({currentDraft.validationFindings.length}):
                    </div>
                    <ul className="space-y-1 pl-4 list-disc text-rose-800">
                      {currentDraft.validationFindings.map((f, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">[{f.rule}]</span> {f.message}{' '}
                          {f.generatedValue && (
                            <span className="text-slate-600">
                              (Claimed: &quot;{f.generatedValue}&quot;, Expected: &quot;{f.evidenceValue}&quot;)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Email Content Body */}
                <div className="p-6 space-y-4">
                  {/* Subject Line */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Subject
                    </span>
                    <h2 className="text-base font-bold text-slate-900">{currentDraft.subject}</h2>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1 pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-medium text-slate-700">From: </span>
                      Customer Engagement Team &lt;engagement@telecom.example.com&gt;
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">To: </span>
                      {selectedCustomer?.email || 'customer@example.com'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Date: </span>
                      {new Date(currentDraft.generatedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Formatted Body */}
                  <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-line leading-relaxed font-sans bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                    {currentDraft.body}
                  </div>

                  {/* Grounded Offer Badges in Draft */}
                  {currentDraft.referencedOffers && currentDraft.referencedOffers.length > 0 && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Approved Offers Referenced:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentDraft.referencedOffers.map((code) => (
                          <span
                            key={code}
                            className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2 py-0.5 rounded font-mono font-bold"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Metadata & Telemetry */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span>
                      <strong className="text-slate-700">Provider:</strong> {currentDraft.provider} (
                      {currentDraft.model})
                    </span>
                    <span>
                      <strong className="text-slate-700">Prompt:</strong> {currentDraft.promptVersion}
                    </span>
                    <span>
                      <strong className="text-slate-700">Latency:</strong> {currentDraft.latencyMs}ms
                    </span>
                    {currentDraft.tokenUsage && (
                      <span>
                        <strong className="text-slate-700">Tokens:</strong>{' '}
                        {currentDraft.tokenUsage.totalTokens} total ({currentDraft.tokenUsage.promptTokens} in /{' '}
                        {currentDraft.tokenUsage.completionTokens} out)
                      </span>
                    )}
                    {currentDraft.retryCount > 0 && (
                      <span className="text-amber-700 font-medium">
                        Retries: {currentDraft.retryCount} (Self-Correction)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <Bot className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-800 text-sm">No Draft Generated Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select an AI provider above and click &quot;Generate Email Draft&quot; to execute the LangGraph
                  workflow for customer {selectedCustomer?.firstName || selectedCustomerId}.
                </p>
              </div>
            )}

            {/* Historical Drafts for this customer */}
            {draftHistory.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    Draft History for {selectedCustomer?.firstName} ({draftHistory.length})
                  </h4>
                  <span className="text-xs text-slate-500">Most recent first</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {draftHistory.map((d, index) => {
                    const isSelected = currentDraft?._id === d._id;
                    return (
                      <div
                        key={d._id}
                        className={`py-3 flex items-center justify-between cursor-pointer rounded-lg px-2 transition ${
                          isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setCurrentDraft(d)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{d.subject}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                d.groundingStatus === 'PASSED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {d.groundingStatus}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                              {d.provider}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span>{new Date(d.generatedAt).toLocaleString()}</span>
                            <span>•</span>
                            <span>Latency: {d.latencyMs}ms</span>
                            <span>•</span>
                            <span>Prompt: {d.promptVersion}</span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Evidence Context Preview */}
      {showPreviewModal && previewContext && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                Evidence Context &amp; Prompt Preview
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
              <div>
                <span className="font-bold text-slate-700 block mb-1">
                  1. Evidence Context Snapshot (Zero-Hallucination Boundary):
                </span>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px] max-h-60">
                  {JSON.stringify(previewContext.evidenceContext, null, 2)}
                </pre>
              </div>

              {previewContext.selectedPrompt && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    2. Selected Prompt Template ({previewContext.selectedPrompt.templateName}):
                  </span>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                    <div>
                      <strong className="text-slate-700">Version:</strong>{' '}
                      {previewContext.selectedPrompt.promptVersion}
                    </div>
                    <div>
                      <strong className="text-slate-700">User Prompt:</strong>
                      <p className="whitespace-pre-line mt-1 text-slate-800">
                        {previewContext.selectedPrompt.userPrompt}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Draft Regeneration Feedback */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                Regenerate Email Draft
              </h3>
              <button onClick={() => setShowRegenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-medium text-slate-700">
                Custom Regeneration Instructions (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Make the opening more concise, or emphasize the spring renewal discount."
                value={regenReason}
                onChange={(e) => setRegenReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                The new generation will preserve grounding boundaries and link to the previous version in history.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRegenModal(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5"
              >
                {regenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Regenerate Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI Provider Configuration Settings */}
      {showConfigModal && config && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveConfig}
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Message Generation Runtime Config
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Temperature (Creativity):</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                />
                <span className="text-[10px] text-slate-500">Lower (e.g. 0.3) is more strictly grounded.</span>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Max Tokens:</label>
                <input
                  type="number"
                  step="50"
                  min="200"
                  max="4000"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value, 10) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Timeout (ms):</label>
                <input
                  type="number"
                  step="1000"
                  value={config.timeoutMs}
                  onChange={(e) => setConfig({ ...config, timeoutMs: parseInt(e.target.value, 10) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Grounding Retry Limit:</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={config.retryLimit}
                  onChange={(e) => setConfig({ ...config, retryLimit: parseInt(e.target.value, 10) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition"
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
