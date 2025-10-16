// Pipeline UI Package - Auto-generated barrel exports for enterprise deployment
// Main exports for @pipeline/ui package

// Core pipeline components
export { default as PipelineBoard } from "./PipelineBoard";
export type { PipelineBoardProps } from "./PipelineBoard";
export { PipelineStage } from "./PipelineBoard";
export type { PipelineStageProps } from "./PipelineBoard";
export { ApplicationCard } from "./PipelineBoard";
export type { ApplicationCardProps } from "./PipelineBoard";

// React Query hooks for API integration
export {
  useApplications,
  usePipelineStages,
  useMoveStage,
  useUpdateApplication,
  useDeleteApplication,
} from "./usePipeline";

// TypeScript interfaces
export type {
  Application,
  PipelineStageData,
} from "./usePipeline";

// Usage instructions:
// 1. Set VITE_PIPELINE_API environment variable to your API base URL
// 2. Import components: import { PipelineBoard, useApplications } from "@pipeline/ui"
// 3. Wrap your app with React Query QueryClient provider
// 4. Use PipelineBoard component with onApplicationClick handler