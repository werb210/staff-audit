import { tokenStore } from "@/lib/tokenStore";
import { startLogin } from "@/lib/authApi";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OtpBox from "@/components/OtpBox";

export default function Login() {
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'creds'|'otp'>('creds');
  const [hint, setHint] = useState<string>();
  const [attemptId, setAttemptId] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Version check
  console.log('[LOGIN-COMPONENT] Version: 2025-09-29-v4-FINAL');

  async function submitCreds(e: React.FormEvent) {
    e.preventDefault();
    
    // STRONG duplicate prevention
    if (loading || stage === 'otp' || isSubmitting) {
      console.log('[LOGIN] BLOCKED duplicate - loading:', loading, 'stage:', stage, 'submitting:', isSubmitting);
      return;
    }
    
    setErr(null);
    setLoading(true);
    setIsSubmitting(true);
    
    try {
      console.log('[LOGIN] Starting login for:', email);
      const data = await startLogin(email.trim(), password.trim());
      console.log('[LOGIN] Login response:', data);
      setHint(data.phoneMasked);
      setAttemptId(data.attemptId);
      setStage('otp');
      console.log('[LOGIN] Switched to OTP stage with attemptId:', data.attemptId);
    } catch (error) {
      console.error('[LOGIN] Login error:', error);
      setErr("Invalid email or password");
      setIsSubmitting(false);
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(code: string) {
    setErr(null);
    setLoading(true);
    
    if (!attemptId) {
      setErr("Session expired - please login again");
      setStage('creds');
      setLoading(false);
      return;
    }
    
    try {
      console.log('[OTP] Verifying code with attemptId:', attemptId);
      const response = await fetch('/api/auth/mfa/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, code })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OTP] Verification failed:', errorData);
        throw new Error(errorData.error || 'Invalid code');
      }
      
      const data = await response.json();
      console.log('[OTP] Verification success:', data);
      
      if (data.token) {
        // Backend returns {token, user} format
        tokenStore.set(data.token, data.token); // Use same token for both
        localStorage.setItem('bf.access', data.token);
        console.log('[OTP] Token stored, redirecting to dashboard');
        window.location.href = '/staff/dashboard';
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      console.error('[OTP] Verification failed:', error);
      setErr("Invalid verification code - please check the 6-digit code from SMS");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Staff Login</CardTitle>
          <CardDescription>
            {stage === 'creds' ? 'Sign in to access the Staff CRM' : `Enter the verification code sent to ${hint}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === 'creds' ? (
            <form onSubmit={submitCreds} className="space-y-4">
              {err && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {err === "invalid_credentials" ? "Invalid email or password" : err}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="off"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="off"
                  required
                  disabled={loading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Continue"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {err && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {err}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <OtpBox onSubmit={submitOtp} />
              </div>
              
              <div className="text-center">
                <Button type="button" variant="link" size="sm" onClick={() => setStage('creds')} disabled={loading}>
                  Back to Credentials
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}