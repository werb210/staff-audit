// Quick test to see what environment variables are available
console.log('🔧 Environment Test:', {
  'import.meta.env.VITE_API_BASE_URL': import.meta.env?.VITE_API_BASE_URL,
  'All import.meta.env': import.meta.env,
  'process.env.NODE_ENV': process.env.NODE_ENV
});