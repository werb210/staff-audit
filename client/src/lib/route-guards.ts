export const onPipelineRoute = () => location.pathname === '/staff/pipeline';
export const guardPipeline = <T>(fn: () => T) => onPipelineRoute() ? fn() : undefined;
