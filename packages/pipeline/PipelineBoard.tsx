import React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import { usePipelineStages, useMoveStage, Application } from "./usePipeline";

// Stage component for each pipeline column
export interface PipelineStageProps {
  id: string;
  title: string;
  count: number;
  applications: Application[];
  onApplicationClick?: (application: Application) => void;
}

export const PipelineStage: React.FC<PipelineStageProps> = ({
  id,
  title,
  count,
  applications,
  onApplicationClick,
}) => {
  return (
    <div className="flex flex-col bg-gray-50 rounded-lg p-4 min-h-96">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
          {count}
        </span>
      </div>
      
      <SortableContext items={applications.map(app => app.id.toString())}>
        <div className="flex-1 space-y-3">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onClick={() => onApplicationClick?.(application)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

// Application card component
export interface ApplicationCardProps {
  application: Application;
  onClick?: () => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onClick,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
            {application.businessName}
          </h4>
          <span className="text-lg font-semibold text-green-600">
            {formatCurrency(application.loanAmount)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{application.businessType}</span>
          <span>{formatDate(application.createdAt)}</span>
        </div>
        
        {application.applicantName && (
          <div className="text-sm text-gray-600">
            Contact: {application.applicantName}
          </div>
        )}
      </div>
    </div>
  );
};

// Main pipeline board component
export interface PipelineBoardProps {
  onApplicationClick?: (application: Application) => void;
  className?: string;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  onApplicationClick,
  className = "",
}) => {
  const { data: stages = [], isLoading, error } = usePipelineStages();
  const moveStage = useMoveStage();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    // Optional: Add drag start logic
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Add drag over logic
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    // Find the application being dragged
    const activeId = parseInt(active.id.toString());
    const overId = over.id.toString();
    
    // Find which stage the application should move to
    const targetStage = stages.find(stage => stage.id === overId);
    if (!targetStage) return;

    // Update the application stage
    moveStage.mutate({
      id: activeId,
      stage: targetStage.title,
    });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-gray-500">Loading pipeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-red-500">Error loading pipeline data</div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {stages.map((stage) => (
            <PipelineStage
              key={stage.id}
              id={stage.id}
              title={stage.title}
              count={stage.count}
              applications={stage.applications}
              onApplicationClick={onApplicationClick}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default PipelineBoard;