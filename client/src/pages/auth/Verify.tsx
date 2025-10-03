import React from "react";
import { api } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Shield, Clock } from "lucide-react";

export default function Verify() {
  const [phone, setPhone] = React.useState("");   // store in E.164 like +15551234567
  const [code, setCode] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [timer, setTimer] = React.useState(0);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const send = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    
    try {
      if (!phone.startsWith("+")) {
        setErr("Enter phone in E.164 format (e.g., +15551234567)");
        return;
      }
      
      await api("/api/auth/verify/start", { 
        method: "POST", 
        body: JSON.stringify({ phone, channel: "sms" }) 
      });
      
      setSent(true);
      setTimer(30);
      setMsg("Code sent. Check your phone.");
    } catch (error: any) {
      setErr(error.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const check = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    
    try {
      const result: any = await api("/api/auth/verify/check", { 
        method: "POST", 
        body: JSON.stringify({ phone, code }) 
      });
      
      if (result?.ok) {
        setMsg("Verification successful! Redirecting...");
        setTimeout(() => {
          const nextUrl = new URLSearchParams(window.location.search).get("next") || "/staff/settings/user-management";
          window.location.assign(nextUrl);
        }, 1000);
      }
    } catch (error: any) {
      setErr(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Verify Your Identity</CardTitle>
          <CardDescription>
            We'll send a verification code to your phone for secure access to admin features.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!sent ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    className="pl-10" 
                    placeholder="+15551234567" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500">Include country code (e.g., +1 for US/Canada)</p>
              </div>
              
              <Button 
                className="w-full" 
                onClick={send}
                disabled={loading || !phone.trim()}
              >
                {loading ? "Sending..." : "Send Verification Code"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Code</label>
                <Input 
                  placeholder="Enter 6-digit code" 
                  value={code} 
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                />
                <p className="text-xs text-gray-500">Check your phone for the verification code</p>
              </div>
              
              <Button 
                className="w-full" 
                disabled={code.length < 4 || loading} 
                onClick={check}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
              
              <Button 
                variant="outline"
                className="w-full" 
                disabled={timer > 0 || loading} 
                onClick={send}
              >
                {timer > 0 ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Resend in {timer}s
                  </>
                ) : (
                  "Resend Code"
                )}
              </Button>
            </>
          )}
          
          {msg && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-700">{msg}</AlertDescription>
            </Alert>
          )}
          
          {err && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{err}</AlertDescription>
            </Alert>
          )}
          
          {process.env.NODE_ENV !== "production" && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-700 text-xs">
                Dev mode: Use code "000000" to bypass verification
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}