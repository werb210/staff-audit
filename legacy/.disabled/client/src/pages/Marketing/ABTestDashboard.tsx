import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ABTestDashboard() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: experiments = [] } = useQuery({
    queryKey: ['/api/marketing/experiments'],
    staleTime: 30000
  });

  const createExperiment = useMutation({
    mutationFn: async (data: any) => await apiRequest('/api/marketing/experiments', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/experiments'] });
      setShowCreateForm(false);
    }
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'ab_test',
    trafficSplit: 50
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">A/B Test Experiments</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          Create Experiment
        </Button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Experiment</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Experiment name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <select
              className="px-3 py-2 border rounded-lg"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="ab_test">A/B Test</option>
              <option value="multivariate">Multivariate</option>
              <option value="feature_flag">Feature Flag</option>
            </select>
            <Input
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Traffic Split %"
              value={formData.trafficSplit}
              onChange={(e) => setFormData({ ...formData, trafficSplit: Number(e.target.value) })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => createExperiment.mutate(formData)}
              disabled={!formData.name || createExperiment.isPending}
            >
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiments.map((exp: any) => (
          <ExperimentCard key={exp.id} experiment={exp} />
        ))}
      </div>
    </div>
  );
}

function ExperimentCard({ experiment }: { experiment: any }) {
  const { data: results } = useQuery({
    queryKey: ['/api/marketing/experiments', experiment.id, 'results'],
    staleTime: 30000
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold">{experiment.name}</h3>
        <span className={`px-2 py-1 text-xs rounded ${
          experiment.status === 'running' ? 'bg-green-100 text-green-800' :
          experiment.status === 'draft' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {experiment.status}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">{experiment.description}</p>
      
      {results && results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Results:</h4>
          {results.map((result: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{result.variant_name}</span>
              <span>{result.conversion_rate}% ({result.conversions}/{result.participants})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}