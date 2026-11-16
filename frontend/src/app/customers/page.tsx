'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerApiClient, CustomerSummaryItem } from '../../services/customer.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Users,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination state
  const [search, setSearch] = useState<string>('');
  const [loyaltyTier, setLoyaltyTier] = useState<string>('');
  const [accountStatus, setAccountStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await CustomerApiClient.listCustomers({
        page,
        limit: 15,
        search: search.trim() || undefined,
        loyaltyTier: loyaltyTier || undefined,
        accountStatus: accountStatus || undefined
      });
      setCustomers(data.customers);
      setTotalPages(data.meta.totalPages);
      setTotalRecords(data.meta.totalRecords);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, loyaltyTier, accountStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'PLATINUM':
        return 'default';
      case 'GOLD':
        return 'warning';
      case 'SILVER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
        return 'destructive';
      case 'INACTIVE':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Assembly and profile explorer across retail and telecom accounts &bull; {totalRecords} total records
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by customer ID, name, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={loyaltyTier}
                onChange={(e) => {
                  setLoyaltyTier(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-white border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Loyalty Tiers</option>
                <option value="PLATINUM">Platinum</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="BRONZE">Bronze</option>
              </select>

              <select
                value={accountStatus}
                onChange={(e) => {
                  setAccountStatus(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-white border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Account Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>

              <Button type="submit" variant="secondary" size="sm">
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Customers Table Card */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Customer ID</th>
                <th className="px-6 py-3">Customer Name</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Loyalty Tier</th>
                <th className="px-6 py-3">Active Plan</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                    <p className="text-xs text-slate-500 mt-2">Loading customer records...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No customers found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filter parameters</p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                      {c.customerId}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      <div>{c.email}</div>
                      {c.phone && <div className="text-[11px] text-slate-400">{c.phone}</div>}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={getTierBadgeVariant(c.loyaltyInfo?.loyaltyTier)}>
                        {c.loyaltyInfo?.loyaltyTier || 'BRONZE'} &bull; {c.loyaltyInfo?.loyaltyPoints || 0} pts
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800">{c.subscription?.activePlan || 'Standard'}</div>
                      <div className="text-[11px] text-slate-400">{c.customerType}</div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={getStatusBadgeVariant(c.accountStatus)}>
                        {c.accountStatus || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/customers/${c.customerId}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Profile
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing Page <span className="font-semibold text-slate-800">{page}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
