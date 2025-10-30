export const onPipelineRoute = () => location.pathname === "/staff/pipeline";
export const guardPipeline = (fn) => onPipelineRoute() ? fn() : undefined;
