export function printRoutes(app: any) {
  const out: string[] = [];
  const walk = (stack: any[], prefix = '') => {
    if (!stack) return;
    
    stack.forEach((l: any) => {
      if (l.route && l.route.path) { 
        out.push(`${(Object.keys(l.route.methods)[0] || 'ALL').toUpperCase()} ${prefix}${l.route.path}`); 
      }
      if (l.name === 'router' && l.handle && l.handle.stack) { 
        // Simple route prefix extraction without complex regex
        let base = prefix;
        if (l.regexp && l.regexp.source) {
          const match = l.regexp.source.match(/\^\\?(\/[^\\?]*)?/);
          if (match && match[1]) {
            base = prefix + match[1];
          }
        }
        walk(l.handle.stack, base);
      }
    });
  };
  
  try {
    walk(app._router.stack, '');
    console.log('=== ROUTE INVENTORY START ===\n' + out.sort().join('\n') + '\n=== ROUTE INVENTORY END ===');
  } catch (error) {
    console.log('Route inventory failed:', error);
  }
}