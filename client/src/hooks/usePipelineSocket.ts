import { useEffect } from "react";
import { socketManager } from "@/lib/socket";
import { queryClient } from "@/lib/queryClient";

export const usePipelineSocket = () => {
  useEffect(() => {
    // Create callback function to reference in cleanup
    const handlePipelineUpdate = () => {
      console.info("[Pipeline] Received update event");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-kpis"] });
    };

    // Only connect if not already connected
    if (!socketManager.connected) {
      socketManager.connect();
    }

    // Listen for pipeline changes from the server
    socketManager.on("pipeline:update", handlePipelineUpdate);

    // Clean up listeners on unmount
    return () => {
      socketManager.off("pipeline:update", handlePipelineUpdate);
    };
  }, []);
};
