'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCheck,
  Send,
  HelpCircle,
  Database,
  Sliders,
  UserCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  DemoService,
  ScenarioItem,
  RefusalItem,
  ScenarioRunResult,
  RefusalRunResult,
  ScenarioStep
} from '../../services/demo.service';

export default function DemoPage() {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [refusals, setRefusals] = useState<RefusalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [runningRefusalId, setRunningRefusalId] = useState<string | null>(null);
  const [activeRunResult, setActiveRunResult] = useState<ScenarioRunResult | null>(null);
  const [activeRefusalResult, setActiveRefusalResult] = useState<RefusalRunResult | null>(null);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchScenarios = async () => {
    setIsLoading(true);
    try {
      const data = await DemoService.getScenariosState();
      setScenarios(data.scenarios);
      setRefusals(data.refusals);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load demo scenarios' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleRunScenario = async (scenarioId: string) => {
    setRunningScenarioId(scenarioId);
    try {
      const result = await DemoService.runScenario(scenarioId);
      setActiveRunResult(result);
      setShowTraceModal(true);
      await fetchScenarios();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || `Failed to run scenario ${scenarioId}` });
    } finally {
      setRunningScenarioId(null);
    }
  };

  const handleResetScenario = async (scenarioId: string) => {
    try {
      await DemoService.resetScenario(scenarioId);
      setNotification({ type: 'success', message: `Scenario ${scenarioId} reset successfully.` });
      await fetchScenarios();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || `Failed to reset scenario ${scenarioId}` });
    }
  };

  const handleRunRefusal = async (refusalId: string) => {
    setRunningRefusalId(refusalId);
    try {
      const result = await DemoService.runRefusal(refusalId);
      setActiveRefusalResult(result);
      setShowRefusalModal(true);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || `Failed to run refusal demo ${refusalId}` });
    } finally {
      setRunningRefusalId(null);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Are you sure you want to re-seed and reset the entire demo dataset to pristine condition?')) {
      return;
    }
    setIsResettingAll(true);
    try {
      const message = await DemoService.resetAllDemoData();
      setNotification({ type: 'success', message: message || 'Demo dataset reset successfully!' });
      await fetchScenarios();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to reset demo dataset' });
    } finally {
      setIsResettingAll(false);
    }
  };

  const getSegmentBadgeColor = (segment: string) => {
    switch (segment) {
      case 'CONSISTENT_CUSTOMER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOYALTY_CANDIDATE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DECLINING_ACTIVITY':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'OVERDUE_BILL':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header & Global Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Interactive Hackathon Demo Console
            </h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium">
              Phase 8 Verified
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Execute end-to-end multi-agent pipelines and trigger deterministic refusal safeguards across all 5 benchmark customer archetypes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchScenarios}
            disabled={isLoading}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleResetAll}
            disabled={isResettingAll}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition shadow-sm"
          >
            <Database className={`w-4 h-4 mr-2 ${isResettingAll ? 'animate-spin' : ''}`} />
            Reset All Demo Data
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-4 font-bold text-gray-500 hover:text-gray-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* SECTION 1: 5 CORE HACKATHON DEMO SCENARIOS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Five Core Demonstration Scenarios
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            Full 7-stage autonomous journey from customer profile to controlled delivery
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((sc) => (
            <Card
              key={sc.id}
              className="border-gray-200 hover:border-indigo-300 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge className={getSegmentBadgeColor(sc.expectedSegment)}>
                    {sc.expectedSegment.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {sc.deliveryMode}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-gray-900 mt-2">
                  {sc.name}
                </CardTitle>
                <div className="text-xs text-gray-500 font-mono mt-1">
                  Customer: <span className="font-semibold text-gray-700">{sc.customerName}</span> ({sc.customerId})
                </div>
              </CardHeader>

              <CardContent className="pt-0 flex flex-col justify-between flex-grow">
                <p className="text-xs text-gray-600 line-clamp-3 mb-4">
                  {sc.description}
                </p>

                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Pipeline Stage:</span>
                    <Badge variant="outline" className="text-xs font-medium">
                      {sc.currentStage}
                    </Badge>
                  </div>
                  {sc.reviewStatus && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Review Status:</span>
                      <span className="font-semibold text-gray-800">{sc.reviewStatus}</span>
                    </div>
                  )}
                  {sc.deliveryStatus && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Delivery Status:</span>
                      <span className="font-semibold text-emerald-700">{sc.deliveryStatus}</span>
                    </div>
                  )}

                  <div className="pt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleRunScenario(sc.id)}
                      disabled={runningScenarioId === sc.id}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
                    >
                      {runningScenarioId === sc.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                          Run Pipeline
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleResetScenario(sc.id)}
                      title="Reset scenario state"
                      className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SECTION 2: 5 MANDATORY REFUSAL & SAFETY DEMONSTRATIONS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Five Mandatory Refusal & Safety Safeguards
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            Deterministic rule enforcement: zero hallucinated or non-compliant communications dispatched
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {refusals.map((ref) => (
            <Card
              key={ref.id}
              className="border-gray-200 hover:border-red-300 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-red-50 text-red-700 border-red-200 font-medium">
                    Safety Gate
                  </Badge>
                  <span className="text-xs font-mono text-gray-500">
                    {ref.expectedBlockStage}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-gray-900 mt-2">
                  {ref.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 flex flex-col justify-between flex-grow">
                <p className="text-xs text-gray-600 line-clamp-3 mb-4">
                  {ref.description}
                </p>

                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleRunRefusal(ref.id)}
                    disabled={runningRefusalId === ref.id}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-red-200 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
                  >
                    {runningRefusalId === ref.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Validating Safeguard...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                        Trigger Refusal Check
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* TRACE MODAL: 7-STEP DETAILED EXECUTION PROGRESS */}
      {showTraceModal && activeRunResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {activeRunResult.name} — Pipeline Execution
                  </h3>
                  <p className="text-xs text-gray-500">
                    Customer {activeRunResult.customerId} &bull; Latency: {activeRunResult.durationMs}ms
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTraceModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                <span>Overall Execution Status:</span>
                <Badge
                  className={
                    activeRunResult.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeRunResult.status === 'BLOCKED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }
                >
                  {activeRunResult.status}
                </Badge>
              </div>

              {/* 7-Stage Stepper View */}
              <div className="space-y-3">
                {activeRunResult.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-gray-200 bg-white shadow-sm flex items-start gap-3"
                  >
                    <div className="mt-0.5">
                      {st.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : st.status === 'BLOCKED' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Step {idx + 1}: {st.step.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(st.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{st.summary}</p>
                      {st.data && Object.keys(st.data).length > 0 && (
                        <pre className="mt-2 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] font-mono text-gray-700 overflow-x-auto max-h-32">
                          {JSON.stringify(st.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowTraceModal(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUSAL MODAL: DETAILED GATE INSPECTION */}
      {showRefusalModal && activeRefusalResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-red-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg text-red-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Refusal Safeguard Triggered
                  </h3>
                  <p className="text-xs text-red-700 font-semibold">
                    {activeRefusalResult.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRefusalModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                <span className="font-semibold text-emerald-800">
                  Safeguard Verified:
                </span>
                <Badge className="bg-emerald-600 text-white font-bold">
                  BLOCKED AS EXPECTED
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-gray-500">Blocking Stage:</span>
                  <span className="font-semibold text-gray-800">{activeRefusalResult.blockStage}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-gray-500">Error Code:</span>
                  <span className="font-mono font-bold text-red-600">{activeRefusalResult.errorCode}</span>
                </div>
                <div className="pt-2">
                  <span className="text-gray-500 block mb-1">Reason:</span>
                  <p className="p-2.5 bg-gray-50 rounded border border-gray-200 text-gray-700 font-medium">
                    {activeRefusalResult.blockReason}
                  </p>
                </div>
              </div>

              {activeRefusalResult.evidence && Object.keys(activeRefusalResult.evidence).length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 block mb-1 font-semibold">Evidence Details:</span>
                  <pre className="p-3 bg-gray-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(activeRefusalResult.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowRefusalModal(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
