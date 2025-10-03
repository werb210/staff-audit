import { useState } from 'react';
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { Badge } from "../../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Plus, Trash2, Clock, Users, Target, MessageCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface SequenceStep {
  id: string;
  type: 'connect' | 'message' | 'inmail' | 'follow' | 'wait';
  delay: number;
  template: string;
  subject?: string;
}

export default function LinkedInSequenceBuilder() {
  const { toast } = useToast();
  const [sequenceName, setSequenceName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [steps, setSteps] = useState<SequenceStep[]>([
    {
      id: '1',
      type: 'connect',
      delay: 0,
      template: 'Hi {{firstName}}, I noticed your background in {{industry}}. Would love to connect!',
    }
  ]);

  const addStep = () => {
    const newStep: SequenceStep = {
      id: Date.now().toString(),
      type: 'message',
      delay: 2,
      template: 'Thanks for connecting {{firstName}}! I help {{industry}} companies with...',
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (id: string, field: keyof SequenceStep, value: any) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const deleteStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter(step => step.id !== id));
    }
  };

  const stepTypeOptions = [
    { value: 'connect', label: 'Connection Request', icon: Users },
    { value: 'message', label: 'LinkedIn Message', icon: MessageCircle },
    { value: 'inmail', label: 'InMail', icon: Target },
    { value: 'follow', label: 'Follow Profile', icon: Plus },
    { value: 'wait', label: 'Wait Period', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">LinkedIn Sequence Builder</h2>
          <p className="text-gray-600">Create automated outreach sequences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast({title: "Save Draft", description: "Sequence draft saving coming soon"})}>Save Draft</Button>
          <Button onClick={() => toast({title: "Launch Sequence", description: "Sequence launcher coming soon"})}>Launch Sequence</Button>
        </div>
      </div>

      {/* Sequence Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sequence Name
              </label>
              <Input
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                placeholder="e.g. SaaS CEO Outreach"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <Input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. CEOs in SaaS companies"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this sequence's purpose..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sequence Steps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sequence Steps</CardTitle>
          <Button onClick={addStep} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Step {index + 1}</Badge>
                  <Select
                    value={step.type}
                    onValueChange={(value) => updateStep(step.id, 'type', value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      {stepTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-gray-900 hover:bg-gray-100">
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {steps.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteStep(step.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {step.type !== 'wait' && step.type !== 'follow' && (
                <>
                  {step.type === 'inmail' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject Line
                      </label>
                      <Input
                        value={step.subject || ''}
                        onChange={(e) => updateStep(step.id, 'subject', e.target.value)}
                        placeholder="Subject for InMail message..."
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Template
                    </label>
                    <Textarea
                      value={step.template}
                      onChange={(e) => updateStep(step.id, 'template', e.target.value)}
                      placeholder="Write your message template here..."
                      rows={4}
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      Available variables: {'{firstName}'}, {'{lastName}'}, {'{company}'}, {'{industry}'}, {'{title}'}
                    </div>
                  </div>
                </>
              )}

              {index > 0 && (
                <div className="flex items-center gap-4">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <label className="text-sm font-medium text-gray-700">Wait</label>
                  <Input
                    type="number"
                    value={step.delay}
                    onChange={(e) => updateStep(step.id, 'delay', parseInt(e.target.value))}
                    className="w-20"
                    min="1"
                  />
                  <span className="text-sm text-gray-600">days before this step</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            This sequence will reach out to <span className="font-medium">{targetAudience || 'your target audience'}</span> 
            {' '}over <span className="font-medium">{steps.reduce((acc, step, i) => acc + (i > 0 ? step.delay : 0), 0)} days</span> 
            {' '}with <span className="font-medium">{steps.length} touchpoints</span>.
          </div>
          
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="min-w-fit">Day {steps.slice(0, index + 1).reduce((acc, s, i) => acc + (i > 0 ? s.delay : 0), 0)}</Badge>
                <span className="capitalize">{step.type.replace('_', ' ')}</span>
                {step.template && (
                  <span className="text-gray-500 truncate">
                    "{step.template.substring(0, 50)}..."
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}