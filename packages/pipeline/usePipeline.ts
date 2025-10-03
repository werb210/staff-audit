import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.VITE_PIPELINE_API ?? "/api";

export interface Application {
  id: number;
  businessName: string;
  loanAmount: number;
  status: string;
  stage: "New" | "Under Review" | "Required Docs" | "Lender Review" | "Approved" | "Declined";
  applicantName?: string;
  applicantEmail?: string;
  businessType: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageData {
  id: string;
  title: string;
  count: number;
  applications: Application[];
}

export const useApplications = () =>
  useQuery({
    queryKey: ["applications"],
    queryFn: async (): Promise<Application[]> => {
      const res = await fetch(`${API}/v1/applications`);
      if (!res.ok) {
        throw new Error("Failed to fetch applications");
      }
      const data = await res.json();
      return data.success ? data.data : data;
    },
  });

export const usePipelineStages = () =>
  useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async (): Promise<PipelineStageData[]> => {
      const res = await fetch(`${API}/v1/applications`);
      if (!res.ok) {
        throw new Error("Failed to fetch pipeline data");
      }
      const data = await res.json();
      const applications = data.success ? data.data : data;
      
      // Group applications by stage
      const stages = [
        { id: "new", title: "New", applications: [] },
        { id: "under-review", title: "Under Review", applications: [] },
        { id: "required-docs", title: "Required Docs", applications: [] },
        { id: "lender-review", title: "Lender Review", applications: [] },
        { id: "approved", title: "Approved", applications: [] },
        { id: "declined", title: "Declined", applications: [] },
      ];
      
      applications.forEach((app: Application) => {
        const stage = stages.find(s => 
          s.title.toLowerCase().replace(/\s+/g, '-') === app.stage?.toLowerCase().replace(/\s+/g, '-')
        );
        if (stage) {
          stage.applications.push(app);
        }
      });
      
      return stages.map(stage => ({
        ...stage,
        count: stage.applications.length
      }));
    },
  });

export const useMoveStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      const res = await fetch(`${API}/v1/applications/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update application stage");
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch applications data
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Application> }) => {
      const res = await fetch(`${API}/v1/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update application");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
  });
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/v1/applications/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete application");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
  });
};