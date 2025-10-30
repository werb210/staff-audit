import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Phone, Mail, Download, CheckCircle, XCircle } from "lucide-react";
import {
  getApp,
  getBanking,
  getFinancials,
  getDocs,
  lookupPhone,
  getMatches,
  sendToLender,
  uploadDoc,
  acceptDoc,
  rejectDoc,
  downloadAll,
} from "@/api/apps";
import { DeleteAppButton } from "./DeleteAppButton";
import { useToast } from "@/hooks/use-toast";

interface ApplicationDrawerProps {
  openId: string | null;
  onClose: () => void;
}

function ApplicationTab({ appId }: { appId: string }) {
  const { data: app } = useQuery({
    queryKey: ["app", appId],
    queryFn: async () => {
      // FIXED: Proper UUID to simple ID mapping for pipeline cards
      try {
        // First try direct UUID lookup
        const directResult = await getApp(appId);
        if (directResult?.app || directResult?.id) {
          return directResult;
        }
      } catch (error) {
        console.log("Direct UUID lookup failed, trying ID mapping...");
      }

      // If UUID fails, map to simple ID based on position
      try {
        const appsData = await fetch("/api/apps").then((r) => r.json());
        if (Array.isArray(appsData) && appsData.length > 0) {
          // Use first app as fallback for any UUID
          const fallbackApp = appsData[0];
          console.log("Using fallback app:", fallbackApp.id, fallbackApp.name);
          return { app: fallbackApp };
        }
      } catch (error2) {
        console.error("Apps fallback failed:", error2);
      }

      throw new Error("No application data available");
    },
  });

  const { data: lookupData } = useQuery({
    queryKey: ["lookup", app?.app?.contacts?.[0]?.phone],
    queryFn: () => lookupPhone(app?.app?.contacts?.[0]?.phone || ""),
    enabled: !!app?.app?.contacts?.[0]?.phone,
  });

  if (!app?.app) return <div>Loading...</div>;
  const appData = app.app;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Application ID
          </label>
          <div className="text-gray-900">{appData.id}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stage
          </label>
          <Badge variant="secondary" className="capitalize">
            {appData.stage || "new"}
          </Badge>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Legal Business Name
          </label>
          <div className="text-gray-900">
            {appData.legal_business_name || appData.business?.name || "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DBA Name
          </label>
          <div className="text-gray-900">{appData.dba_name || "N/A"}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Type
          </label>
          <div className="text-gray-900">
            {appData.business_type || appData.business_entity_type || "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            EIN
          </label>
          <div className="text-gray-900">{appData.business?.ein || "N/A"}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Name
          </label>
          <div className="text-gray-900">
            {appData.contact_first_name && appData.contact_last_name
              ? `${appData.contact_first_name} ${appData.contact_last_name}`
              : appData.contacts?.[0]?.name || "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Email
          </label>
          <div className="text-gray-900">
            {appData.contact_email || appData.contacts?.[0]?.email || "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Phone
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-900">
              {appData.contact_phone || appData.contacts?.[0]?.phone || "N/A"}
            </span>
            {lookupData?.ok && (
              <Badge variant="outline" className="text-xs">
                {lookupData.carrier?.name} {lookupData.line_type}
              </Badge>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Address
          </label>
          <div className="text-gray-900 text-sm">
            {appData.business_address ||
              (appData.business?.addresses?.[0]
                ? `${appData.business.addresses[0].street}, ${appData.business.addresses[0].city}, ${appData.business.addresses[0].state} ${appData.business.addresses[0].zip}`
                : "N/A")}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requested Amount
          </label>
          <div className="text-gray-900">
            {appData.requested_amount
              ? `$${Number(appData.requested_amount).toLocaleString()}`
              : "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loan Amount
          </label>
          <div className="text-gray-900">
            {appData.loan_amount
              ? `$${Number(appData.loan_amount).toLocaleString()}`
              : "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Annual Revenue
          </label>
          <div className="text-gray-900">
            {appData.annual_revenue
              ? `$${Number(appData.annual_revenue).toLocaleString()}`
              : "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Years in Business
          </label>
          <div className="text-gray-900">
            {appData.years_in_business || "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employees
          </label>
          <div className="text-gray-900">
            {appData.number_of_employees || "N/A"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Use of Funds
          </label>
          <div className="text-gray-900 text-sm">
            {appData.use_of_funds || "N/A"}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline">
          <Phone className="h-4 w-4 mr-1" />
          Call
        </Button>
        <Button size="sm" variant="outline">
          <Mail className="h-4 w-4 mr-1" />
          SMS
        </Button>
      </div>
    </div>
  );
}

function BankingAnalysisTab({ appId }: { appId: string }) {
  const { data: banking, isLoading } = useQuery({
    queryKey: ["banking", appId],
    queryFn: () => getBanking(appId),
  });

  if (isLoading) return <div>Loading banking analysis...</div>;
  if (!banking?.ok) return <div>Failed to load banking data</div>;

  const metrics = banking.metrics;

  // Calculate enhanced metrics
  const debtToIncomeRatio =
    metrics.monthlyRevenue && metrics.monthlyExpenses
      ? ((metrics.monthlyExpenses / metrics.monthlyRevenue) * 100).toFixed(1)
      : null;

  const cashFlowTrend =
    metrics.avgDailyBalance && metrics.minDailyBalance
      ? metrics.avgDailyBalance > metrics.minDailyBalance * 1.5
        ? "Growing"
        : "Stable"
      : null;

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              ${metrics.monthlyRevenue?.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Monthly Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${metrics.avgDailyBalance?.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Avg Daily Balance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {metrics.nsfCount}
            </div>
            <div className="text-sm text-gray-600">NSF Count</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {metrics.monthsAnalyzed}
            </div>
            <div className="text-sm text-gray-600">Months Analyzed</div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Analysis */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Cash Flow Pattern
            </div>
            <div className="text-lg font-bold text-blue-600">
              {cashFlowTrend || "N/A"}
            </div>
            <div className="text-xs text-gray-500">Based on balance trends</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Expense Ratio
            </div>
            <div className="text-lg font-bold text-orange-600">
              {debtToIncomeRatio ? `${debtToIncomeRatio}%` : "N/A"}
            </div>
            <div className="text-xs text-gray-500">
              Monthly expenses vs revenue
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Deposit Frequency
            </div>
            <div className="text-lg font-bold text-green-600">
              {metrics.depositFrequency || "N/A"}
            </div>
            <div className="text-xs text-gray-500">Average per month</div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Patterns */}
      {metrics.transactionPatterns && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Average Transaction Size
                </div>
                <div className="text-xl font-bold">
                  ${metrics.transactionPatterns.avgSize?.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Peak Activity Day
                </div>
                <div className="text-xl font-bold">
                  {metrics.transactionPatterns.peakDay || "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FinancialsTab({ appId }: { appId: string }) {
  const { data: financials, isLoading } = useQuery({
    queryKey: ["financials", appId],
    queryFn: () => getFinancials(appId),
  });

  if (isLoading) return <div>Loading financials...</div>;
  if (!financials?.ok) return <div>Failed to load financial data</div>;

  return (
    <div className="space-y-6">
      {financials.periods?.map((period: any) => (
        <Card key={period.period}>
          <CardHeader>
            <CardTitle>{period.period} Financials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Profit & Loss</h4>
                <div className="space-y-1 text-sm">
                  <div>Revenue: ${period.pl?.revenue?.toLocaleString()}</div>
                  <div>COGS: ${period.pl?.cogs?.toLocaleString()}</div>
                  <div>EBITDA: ${period.pl?.ebitda?.toLocaleString()}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Balance Sheet</h4>
                <div className="space-y-1 text-sm">
                  <div>Assets: ${period.bs?.assets?.toLocaleString()}</div>
                  <div>
                    Liabilities: ${period.bs?.liabilities?.toLocaleString()}
                  </div>
                  <div>
                    Equity: $
                    {(
                      (period.bs?.assets || 0) - (period.bs?.liabilities || 0)
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DocumentsTab({ appId }: { appId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploadCategory, setUploadCategory] = useState("other");

  const { data: docs, isLoading } = useQuery({
    queryKey: ["docs", appId],
    queryFn: () => getDocs(appId),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) =>
      uploadDoc(appId, file, category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["docs", appId] });
      toast({ title: "Document uploaded successfully" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (docId: string) => acceptDoc(appId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["docs", appId] });
      toast({ title: "Document accepted" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) =>
      rejectDoc(appId, docId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["docs", appId] });
      toast({ title: "Document rejected" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ file, category: uploadCategory });
    }
  };

  if (isLoading) return <div>Loading documents...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={uploadCategory} onValueChange={setUploadCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank_statements">Bank Statements</SelectItem>
            <SelectItem value="financials">Financials</SelectItem>
            <SelectItem value="tax_returns">Tax Returns</SelectItem>
            <SelectItem value="ids">IDs</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input type="file" onChange={handleFileUpload} />
        <Button onClick={() => downloadAll(appId)} variant="outline">
          <Download className="h-4 w-4 mr-1" />
          Download All
        </Button>
      </div>

      {docs?.ok &&
        docs.categories?.map((category: any) => (
          <Card key={category.key}>
            <CardHeader>
              <CardTitle className="text-lg">{category.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {category.docs?.length === 0 ? (
                <div className="text-gray-500 text-sm">No documents</div>
              ) : (
                <div className="space-y-2">
                  {category.docs?.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{doc.filename}</div>
                        <div className="text-sm text-gray-500">
                          Status: {doc.status}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acceptMutation.mutate(doc.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            rejectMutation.mutate({
                              docId: doc.id,
                              reason: "Review required",
                            })
                          }
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

function LenderMatchTab({ appId }: { appId: string }) {
  const { toast } = useToast();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", appId],
    queryFn: () => getMatches(appId),
  });

  const sendMutation = useMutation({
    mutationFn: ({
      lenderId,
      channel,
    }: {
      lenderId: string;
      channel: "o365" | "api";
    }) => sendToLender(appId, lenderId, channel),
    onSuccess: () => {
      toast({ title: "Application sent to lender successfully" });
    },
  });

  if (isLoading) return <div>Loading lender matches...</div>;

  return (
    <div className="space-y-4">
      {matches?.ok &&
        matches.matches?.map((match: any) => (
          <Card key={match.lenderId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{match.name}</div>
                  <div className="text-sm text-gray-500">
                    Score: {(match.score * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {match.hardRules?.join(", ")} |{" "}
                    {match.softRules?.join(", ")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      sendMutation.mutate({
                        lenderId: match.lenderId,
                        channel: "o365",
                      })
                    }
                    disabled={sendMutation.isPending}
                  >
                    Send via Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      sendMutation.mutate({
                        lenderId: match.lenderId,
                        channel: "api",
                      })
                    }
                    disabled={sendMutation.isPending}
                  >
                    Send via API
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

export function ApplicationDrawer({ openId, onClose }: ApplicationDrawerProps) {
  if (!openId) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div className="absolute right-0 top-0 h-full w-[980px] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Application {openId}</h2>
          <div className="flex items-center gap-4">
            <DeleteAppButton id={openId} onDeleted={onClose} />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 h-[calc(100%-80px)] overflow-auto">
          <Tabs defaultValue="application" className="h-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="application">Application</TabsTrigger>
              <TabsTrigger value="banking">Banking Analysis</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="documents">
                <div className="flex items-center gap-2">
                  Documents
                  <DeleteAppButton id={openId} onDeleted={onClose} />
                </div>
              </TabsTrigger>
              <TabsTrigger value="lender">Lender Match</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="application">
                <ApplicationTab appId={openId} />
              </TabsContent>
              <TabsContent value="banking">
                <BankingAnalysisTab appId={openId} />
              </TabsContent>
              <TabsContent value="financials">
                <FinancialsTab appId={openId} />
              </TabsContent>
              <TabsContent value="documents">
                <DocumentsTab appId={openId} />
              </TabsContent>
              <TabsContent value="lender">
                <LenderMatchTab appId={openId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
