'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileEdit,
  RotateCw,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  Clock,
  Mail,
  Smartphone,
  ExternalLink,
  Layers,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { DeliveryService, IDeliveryRecord, DeliveryStats } from '../../services/delivery.service';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<IDeliveryRecord[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<IDeliveryRecord | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [delRes, statsRes] = await Promise.all([
        DeliveryService.getDeliveries({
          customerId: searchCustomer || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          deliveryMode: modeFilter !== 'ALL' ? modeFilter : undefined,
          channel: channelFilter !== 'ALL' ? channelFilter : undefined
        }),
        DeliveryService.getDashboardStats()
      ]);
      setDeliveries(delRes.data);
      setStats(statsRes);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, modeFilter, channelFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      const retried = await DeliveryService.retryDelivery(deliveryId);
      setNotification({
        type: 'success',
        message: `Delivery attempt retried successfully (New Status: ${retried.status})`
      });
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ type: 'error', message: `Retry failed: ${msg}` });
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-mono text-[11px]">
            <CheckCircle2 className="h-3 w-3" /> SENT (MOCK)
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-mono text-[11px]">
            <Clock className="h-3 w-3" /> DRAFT STAGED
          </Badge>
        );
      case 'BLOCKED':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 font-mono text-[11px]">
            <ShieldAlert className="h-3 w-3" /> BLOCKED
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1 font-mono text-[11px]">
            <XCircle className="h-3 w-3" /> FAILED
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="bg-blue-600 text-[11px] font-medium">
              Phase 8 Controlled Delivery
            </Badge>
            <span className="text-xs text-slate-500 font-medium">Zero Unrestricted Dispatch</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
            Controlled Delivery Engine & Audit Queue
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Strict human-in-the-loop dispatch gate. Enforces 14 pre-delivery verification checks, customer consent validation, frequency caps, and idempotency protection in simulated MOCK and DRAFT_ONLY modes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Attempts
            </CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats?.totalAttempts ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">Audit-recorded attempts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mock Delivered
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats?.successfulMockDeliveries ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">Simulated sends ({stats?.deliverySuccessRate ?? 100}%)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Drafts Staged
            </CardTitle>
            <FileEdit className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.draftOnlyRecords ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">DRAFT_ONLY mode records</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Blocked by Policy
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.blockedAttempts ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">Consent / Balance / Offer checks</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Duplicates Prevented
            </CardTitle>
            <Layers className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.duplicateAttemptsPrevented ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">Idempotency deduplicated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer ID (e.g. CUST-1001)..."
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center space-x-1 text-xs text-slate-500 font-medium">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">SENT (Mock)</option>
              <option value="PENDING">PENDING (Draft)</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="FAILED">FAILED</option>
            </select>

            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Modes</option>
              <option value="MOCK">MOCK Mode</option>
              <option value="DRAFT_ONLY">DRAFT_ONLY Mode</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Channels</option>
              <option value="EMAIL">EMAIL</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Channel & Recipient</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Info className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No delivery records found matching current criteria.
                  </td>
                </tr>
              ) : (
                deliveries.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{record.customerId}</div>
                      <div className="text-[11px] text-slate-500">
                        {record.customerRef ? `${record.customerRef.firstName} ${record.customerRef.lastName}` : 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-700 font-mono text-[11px]">
                        {record.channel === 'EMAIL' ? (
                          <Mail className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        <span>{record.recipientMasked}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        v{record.messageVersion}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={
                          record.deliveryMode === 'MOCK'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }
                      >
                        {record.deliveryMode}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-800 font-medium">
                      {record.subject}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      {new Date(record.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs font-medium"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
                      {record.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(record._id)}
                          disabled={retryingId === record._id}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors text-xs font-medium"
                        >
                          <RotateCw className={`h-3 w-3 ${retryingId === record._id ? 'animate-spin' : ''}`} />
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Inspector Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Send className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Delivery Record Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">Delivery ID</span>
                <span className="font-bold text-slate-800">{selectedRecord._id}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">Status</span>
                <div>{getStatusBadge(selectedRecord.status)}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">Mode</span>
                <span className="font-bold text-slate-800">{selectedRecord.deliveryMode}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">Provider Message ID</span>
                <span className="font-bold text-slate-800">{selectedRecord.providerMessageId || 'N/A (Simulated)'}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">Customer / Recipient</span>
                <span className="font-bold text-slate-800">
                  {selectedRecord.customerId} &bull; {selectedRecord.recipientMasked}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">Idempotency Key</span>
                <span className="font-bold text-slate-800 truncate block">{selectedRecord.idempotencyKey}</span>
              </div>
            </div>

            {selectedRecord.errorCode && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Error Code: {selectedRecord.errorCode}
                </span>
                <p className="text-amber-700">{selectedRecord.errorMessage}</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Message Content
              </span>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="font-bold text-slate-900">Subject: {selectedRecord.subject}</div>
                <div className="text-slate-600 whitespace-pre-wrap">{selectedRecord.bodySnippet}...</div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
