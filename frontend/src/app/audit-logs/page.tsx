'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Filter,
  RotateCw,
  Clock,
  User,
  Cpu,
  Bot,
  Activity,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { AuditService, IAuditLogItem } from '../../services/audit.service';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<IAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actorTypeFilter, setActorTypeFilter] = useState('ALL');
  const [searchEntity, setSearchEntity] = useState('');
  const [selectedLog, setSelectedLog] = useState<IAuditLogItem | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await AuditService.getLogs({
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        entityId: searchEntity || undefined,
        limit: 50
      });
      let filtered = res.data;
      if (actorTypeFilter !== 'ALL') {
        filtered = filtered.filter((l) => l.actorType === actorTypeFilter);
      }
      setLogs(filtered);
      setTotal(res.meta.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, actorTypeFilter]);

  const getActorIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'ai_agent':
        return <Bot className="w-4 h-4 text-purple-600" />;
      case 'system':
      default:
        return <Cpu className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('BLOCKED') || action.includes('VIOLATION')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (action.includes('DISPATCHED') || action.includes('APPROVAL')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('EVALUATED') || action.includes('COMPLIANCE')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (action.includes('DRAFTED')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Immutable Enterprise Audit Logs
            </h1>
            <Badge className="bg-slate-100 text-slate-800 border-slate-200">
              {total} Logged Events
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Append-only traceability log recording every critical agent classification, compliance verdict, human approval, and controlled dispatch.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="inline-flex items-center px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          <RotateCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* Filter Controls */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Filter by Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full text-xs rounded-lg border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="ALL">All Actions</option>
                <option value="MESSAGE_DISPATCHED">MESSAGE_DISPATCHED</option>
                <option value="POLICY_VIOLATION_BLOCKED">POLICY_VIOLATION_BLOCKED</option>
                <option value="HUMAN_APPROVAL_SUBMITTED">HUMAN_APPROVAL_SUBMITTED</option>
                <option value="COMPLIANCE_EVALUATED">COMPLIANCE_EVALUATED</option>
                <option value="MESSAGE_DRAFTED">MESSAGE_DRAFTED</option>
                <option value="SEGMENT_CLASSIFIED">SEGMENT_CLASSIFIED</option>
                <option value="CUSTOMER_PROFILE_ASSEMBLED">CUSTOMER_PROFILE_ASSEMBLED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Filter by Actor Type
              </label>
              <select
                value={actorTypeFilter}
                onChange={(e) => setActorTypeFilter(e.target.value)}
                className="w-full text-xs rounded-lg border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="ALL">All Actors</option>
                <option value="user">Human User</option>
                <option value="ai_agent">AI Agent</option>
                <option value="system">System Engine</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Search Entity ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. CUST-E2E-001 or ID"
                  value={searchEntity}
                  onChange={(e) => setSearchEntity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                  className="w-full text-xs rounded-lg border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={fetchLogs}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-500">
            <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getActorIcon(log.actorType)}
                        <span className="capitalize font-medium text-gray-800">
                          {log.actorType.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          ({log.actorId.slice(-6)})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      {log.entityId}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-[11px] font-medium text-gray-700 transition"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* INSPECTION MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Audit Entry Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Record ID:</span>
                  <span className="font-mono text-gray-800">{selectedLog._id}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Recorded At:</span>
                  <span className="text-gray-800">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Actor:</span>
                  <span className="font-medium text-gray-800 capitalize">
                    {selectedLog.actorType} ({selectedLog.actorId})
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Action:</span>
                  <Badge className={getActionBadgeColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500 block">Entity Target:</span>
                  <span className="font-medium text-gray-800">
                    {selectedLog.entityType}: {selectedLog.entityId}
                  </span>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-gray-500 block">Origin IP:</span>
                    <span className="font-mono text-gray-800">{selectedLog.ipAddress}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-700 block mb-1">
                  Metadata Payload:
                </span>
                <pre className="p-3 bg-gray-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
