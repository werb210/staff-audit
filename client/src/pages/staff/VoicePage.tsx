import React, { useState, useEffect } from 'react';
import { Phone, Voicemail, History, Play, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useVoiceSystem } from '@/hooks/useVoiceSystem';
import { useFeaturePanel, FeatureActionButton } from '@/features/featureWiring';

interface Call {
  id: string;
  from: string;
  to: string;
  direction: 'in' | 'out';
  status: string;
  duration?: number;
  createdAt: string;
  contactName?: string;
}

interface Voicemail {
  id: string;
  from: string;
  transcriptionText: string;
  recordingUrl: string;
  isRead: boolean;
  createdAt: string;
  contactName?: string;
}

export default function VoicePage() {
  useFeaturePanel("voice-dialer");
  
  const voiceSystem = useVoiceSystem();
  const [calls, setCalls] = useState<Call[]>([]);
  const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
  const [activeTab, setActiveTab] = useState('calls');

  useEffect(() => {
    // Load voicemails when component mounts
    voiceSystem.getVoicemails().then(setVoicemails);
  }, []);

  const handlePlayRecording = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  const handleMarkRead = async (voicemailId: string) => {
    await voiceSystem.markVoicemailRead(voicemailId);
    setVoicemails(prev => 
      prev.map(vm => vm.id === voicemailId ? { ...vm, isRead: true } : vm)
    );
  };

  const handleDeleteVoicemail = async (voicemailId: string) => {
    await voiceSystem.deleteVoicemail(voicemailId);
    setVoicemails(prev => prev.filter(vm => vm.id !== voicemailId));
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Voice System</h1>
        <div className="flex items-center gap-2">
          <FeatureActionButton 
            featureId="voice-dialer"
            className="border rounded px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              // Start call action
              alert('Voice dialer started!');
            }}
          >
            Start Call
          </FeatureActionButton>
          <Badge variant={voiceSystem.isConnected ? 'default' : 'destructive'}>
            {voiceSystem.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calls" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            My Calls
          </TabsTrigger>
          <TabsTrigger value="voicemail" className="flex items-center gap-2">
            <Voicemail className="h-4 w-4" />
            Voicemail Inbox
            {voicemails.filter(vm => !vm.isRead).length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {voicemails.filter(vm => !vm.isRead).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Call Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {calls.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No calls found
                </div>
              ) : (
                <div className="space-y-3">
                  {calls.map(call => (
                    <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Phone className={`h-5 w-5 ${call.direction === 'in' ? 'text-blue-600' : 'text-green-600'}`} />
                        <div>
                          <div className="font-medium">
                            {call.contactName || call.from}
                          </div>
                          <div className="text-sm text-gray-500">
                            {call.direction === 'in' ? 'Incoming' : 'Outgoing'} • {formatDateTime(call.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                          {call.status}
                        </Badge>
                        <div className="text-sm text-gray-500">
                          {formatDuration(call.duration)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voicemail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voicemail Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {voicemails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No voicemails found
                </div>
              ) : (
                <div className="space-y-4">
                  {voicemails.map(voicemail => (
                    <div key={voicemail.id} className={`p-4 border rounded-lg ${voicemail.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Voicemail className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium">
                              {voicemail.contactName || voicemail.from}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDateTime(voicemail.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!voicemail.isRead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkRead(voicemail.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePlayRecording(voicemail.recordingUrl)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteVoicemail(voicemail.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {voicemail.transcriptionText && (
                        <div className="bg-white p-3 rounded border text-sm">
                          <strong>Transcript:</strong>
                          <p className="mt-1">{voicemail.transcriptionText}</p>
                        </div>
                      )}
                      
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(voicemail.recordingUrl, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {!voicemail.isRead && (
                          <Badge variant="default">New</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Call logs will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}