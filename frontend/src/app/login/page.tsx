'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sparkles, Shield, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push('/customers');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-blue-600 items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Customer Loyalty & Engagement Assistant
          </h1>
          <p className="text-xs text-slate-500">
            HCLTech Future Ready AI Engineer Hackathon &bull; Enterprise Access
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Sign in to your account</CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials to access the engagement and compliance workspace
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick-Fill Demo Personas */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Test Accounts (Phase 2 Personas)
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@engagement.hcl.com', 'Admin@Secure2026!')}
                  className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 transition-colors text-xs"
                >
                  <span className="font-semibold text-slate-800 block">System Administrator</span>
                  <span className="text-[11px] text-slate-500">admin@engagement.hcl.com &bull; Role: ADMIN</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('priya.marketing@example.com', 'Marketing@2026!')}
                  className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 transition-colors text-xs"
                >
                  <span className="font-semibold text-slate-800 block">Marketing Manager</span>
                  <span className="text-[11px] text-slate-500">priya.marketing@example.com &bull; Role: MARKETING_MANAGER</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('david.compliance@example.com', 'Compliance@2026!')}
                  className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 transition-colors text-xs"
                >
                  <span className="font-semibold text-slate-800 block">Compliance Reviewer</span>
                  <span className="text-[11px] text-slate-500">david.compliance@example.com &bull; Role: COMPLIANCE_REVIEWER</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
