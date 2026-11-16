'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerApiClient, AssembledCustomerProfile } from '../../../services/customer.service';
import { PolicyApiClient, PolicyEvaluationReport } from '../../../services/policy.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  ArrowLeft,
  User,
  CreditCard,
  Activity,
  DollarSign,
  Mail,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Megaphone,
  Gift
} from 'lucide-react';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [profile, setProfile] = useState<AssembledCustomerProfile | null>(null);
  const [policyReport, setPolicyReport] = useState<PolicyEvaluationReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [evaluatingPolicy, setEvaluatingPolicy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [customerData, policyData] = await Promise.all([
          CustomerApiClient.getCustomerProfile(customerId),
          PolicyApiClient.getLatestPolicyEvaluation(customerId).catch(() => null)
        ]);
        setProfile(customerData);
        setPolicyReport(policyData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load customer profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [customerId]);

  const handleRunPolicyEvaluation = async () => {
    if (!profile) return;
    try {
      setEvaluatingPolicy(true);
      const report = await PolicyApiClient.evaluateCustomerPolicy(profile.customer.customerId);
      setPolicyReport(report);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to evaluate policy');
    } finally {
      setEvaluatingPolicy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Assembling consolidated customer profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white border border-slate-200 rounded-xl shadow-sm text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-semibold text-slate-900">Unable to load customer profile</h2>
        <p className="text-xs text-slate-600">{error || 'Customer not found'}</p>
        <Link href="/customers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const { customer, subscription, activity, billing, communicationPreferences } = profile;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/customers">
            <Button variant="outline" size="sm" className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {customer.firstName} {customer.lastName}
              </h1>
              <Badge variant="outline" className="font-mono text-[11px]">
                {customer.customerId}
              </Badge>
              <Badge variant="default" className="text-[11px]">
                {customer.loyaltyTier}
              </Badge>
              <Badge variant={customer.accountStatus === 'ACTIVE' ? 'success' : 'destructive'} className="text-[11px]">
                {customer.accountStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated 360&deg; profile assembled via CustomerProfileService
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Profile Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2 text-slate-900">
              <User className="h-4 w-4 text-blue-600 mr-2" /> Basic Information
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {customer.customerType}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Email Address:</span>
              <span className="font-medium text-slate-900 truncate">{customer.email}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Phone Number:</span>
              <span className="font-medium text-slate-900">{customer.phone || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Loyalty Points:</span>
              <span className="font-semibold text-blue-600">{customer.loyaltyPoints} pts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-slate-500">Member Since:</span>
              <span className="text-slate-700">
                {new Date(customer.membershipStartDate).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2 text-slate-900">
              <CreditCard className="h-4 w-4 text-purple-600 mr-2" /> Subscription Plan
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {subscription.planStatus}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Active Plan:</span>
              <span className="font-semibold text-slate-900">{subscription.activePlan}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Plan Type:</span>
              <span className="font-medium text-slate-900">{subscription.planType}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Start Date:</span>
              <span className="text-slate-700">
                {new Date(subscription.planStartDate).toLocaleDateString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-slate-500">Status:</span>
              <Badge variant={subscription.planStatus === 'ACTIVE' ? 'success' : 'secondary'} className="w-fit text-[10px]">
                {subscription.planStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2 text-slate-900">
              <Activity className="h-4 w-4 text-emerald-600 mr-2" /> Activity Tracking
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {activity.activityTrend === 'INCREASING' ? (
                <span className="flex items-center text-emerald-600">
                  <TrendingUp className="h-3 w-3 mr-1" /> Increasing
                </span>
              ) : activity.activityTrend === 'DECREASING' ? (
                <span className="flex items-center text-red-600">
                  <TrendingDown className="h-3 w-3 mr-1" /> Decreasing
                </span>
              ) : (
                <span className="flex items-center text-slate-600">
                  <Minus className="h-3 w-3 mr-1" /> Stable
                </span>
              )}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Last Active Date:</span>
              <span className="font-medium text-slate-900">
                {activity.lastActivityDate
                  ? new Date(activity.lastActivityDate).toLocaleDateString()
                  : 'No recorded activity'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Events (Last 30 Days):</span>
              <span className="font-semibold text-slate-900">{activity.activityCount30d} events</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-slate-500">Events (Previous 30 Days):</span>
              <span className="font-medium text-slate-700">{activity.activityCountPrevious30d} events</span>
            </div>
          </CardContent>
        </Card>

        {/* Billing & Financial Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2 text-slate-900">
              <DollarSign className="h-4 w-4 text-amber-600 mr-2" /> Billing & Payment Status
            </CardTitle>
            <Badge
              variant={billing.paymentStatus === 'PAID' ? 'success' : 'destructive'}
              className="text-[10px]"
            >
              {billing.paymentStatus}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Outstanding Balance:</span>
              <span className={`font-semibold ${billing.outstandingAmount > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                ${billing.outstandingAmount.toFixed(2)} {billing.currency}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <span className="text-slate-500">Total Invoiced:</span>
              <span className="font-medium text-slate-900">
                ${billing.totalInvoiced.toFixed(2)} {billing.currency}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-slate-500">Overdue Invoices:</span>
              <span className="font-medium text-slate-700">
                {billing.overdueInvoicesCount} invoices
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Communication Preferences Card */}
        <Card className="border-slate-200 shadow-sm bg-white md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2 text-slate-900">
              <Mail className="h-4 w-4 text-blue-600 mr-2" /> Compliance & Communication Consent
            </CardTitle>
            <CardDescription className="text-xs">
              Verified channel consent preferences enforced in message generation
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block mb-1">Email Consent</span>
              <Badge variant={communicationPreferences.emailConsent ? 'success' : 'destructive'}>
                {communicationPreferences.emailConsent ? 'Opted In' : 'Declined'}
              </Badge>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block mb-1">SMS Consent</span>
              <Badge variant={communicationPreferences.smsConsent ? 'success' : 'outline'}>
                {communicationPreferences.smsConsent ? 'Opted In' : 'No Consent'}
              </Badge>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block mb-1">Preferred Channel</span>
              <span className="font-semibold text-slate-800">{communicationPreferences.preferredChannel}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block mb-1">Do Not Disturb</span>
              <Badge variant={communicationPreferences.optedOut ? 'destructive' : 'success'}>
                {communicationPreferences.optedOut ? 'Opted Out' : 'Active'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Phase 4 Policy Engine Evaluation & Recommendation Card */}
        <Card className="border-slate-200 shadow-sm bg-white md:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center space-x-2 text-slate-900">
                <Sparkles className="h-4 w-4 text-purple-600 mr-2" /> Policy Engine Evaluation & Grounded Recommendation
              </CardTitle>
              <CardDescription className="text-xs">
                Deterministic business policy evaluation, strategy mapping, billing stages and eligible rewards
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleRunPolicyEvaluation}
              disabled={evaluatingPolicy}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
            >
              {evaluatingPolicy ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  Evaluate Policy
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="pt-4 text-xs space-y-4">
            {policyReport ? (
              <div className="space-y-4">
                {/* Strategy & Action Banner */}
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Recommended Strategy: {policyReport.strategy.primaryObjective.replace(/_/g, ' ')}
                    </span>
                    <Badge variant={policyReport.strategy.suppressPromotions ? 'destructive' : 'default'}>
                      {policyReport.strategy.suppressPromotions ? 'Promotions Suppressed' : 'Promotions Allowed'}
                    </Badge>
                  </div>
                  <div className="text-slate-700 text-xs">
                    <span className="font-semibold text-slate-900">Recommended Tone: </span>
                    <span className="font-mono text-purple-700">{policyReport.strategy.recommendedTone}</span>
                  </div>
                  <div className="text-slate-700 text-xs">
                    <span className="font-semibold text-slate-900">Primary Segment: </span>
                    <Badge variant="outline" className="ml-1 bg-white">
                      {policyReport.strategy.primarySegment}
                    </Badge>
                  </div>
                  {policyReport.strategy.reasoning.length > 0 && (
                    <div className="pt-1 text-[11px] text-purple-800 space-y-0.5">
                      {policyReport.strategy.reasoning.map((r, i) => (
                        <div key={i}>• {r}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Billing Stage & Offers Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Billing Policy Stage */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Billing Reminder Policy</span>
                      <Badge
                        variant={
                          policyReport.billing.highestStage === 'ESCALATION_REVIEW'
                            ? 'destructive'
                            : policyReport.billing.highestStage !== 'NONE'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {policyReport.billing.highestStage}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {policyReport.billing.summaryMessage}
                    </div>
                    {policyReport.billing.requiresHumanReview && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px] font-medium flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                        Requires Human Approval Prior to Dispatch
                      </div>
                    )}
                  </div>

                  {/* Top Recommended Offer / Campaign */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Target Incentive / Offer</span>
                      <Badge variant="outline" className="bg-white">
                        {policyReport.offers.eligibleOffers.length} Eligible Offers
                      </Badge>
                    </div>
                    {policyReport.recommendation.primaryOfferCode ? (
                      <div className="text-xs">
                        <div className="font-mono text-purple-700 font-semibold">
                          {policyReport.recommendation.primaryOfferCode}
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          {policyReport.recommendation.primaryOfferName}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic">
                        {policyReport.strategy.suppressPromotions
                          ? 'Promotional offers suppressed due to outstanding debt'
                          : 'No active offers currently qualified'}
                      </div>
                    )}
                    {policyReport.recommendation.recommendedCampaignName && (
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        Campaign: <span className="text-slate-700 font-medium">{policyReport.recommendation.recommendedCampaignName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs space-y-2">
                <Sparkles className="h-6 w-6 text-slate-400 mx-auto" />
                <p>No policy evaluation has been run for this customer yet.</p>
                <p className="text-[11px] text-slate-400">
                  Click &quot;Evaluate Policy&quot; to deterministically check active campaigns, offers, and billing reminder stage.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
