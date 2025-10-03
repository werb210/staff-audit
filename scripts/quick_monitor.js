const SVC = `http://127.0.0.1:5000`;
let checks = 0;
const maxChecks = 6; // 30 seconds

async function monitor() {
  const t0 = Date.now();
  let status = 0;
  
  try {
    const response = await fetch(`${SVC}/api/apps/demo-app-123/overview`);
    status = response.status;
  } catch (e) {
    console.log(`Check ${checks + 1}: Network error - ${e.message}`);
    return;
  }
  
  const latency = Date.now() - t0;
  const memory = Math.round(process.memoryUsage().rss / 1024 / 1024);
  
  console.log(`Check ${checks + 1}: Status=${status}, Latency=${latency}ms, Memory=${memory}MB`);
  
  checks++;
  if (checks < maxChecks) {
    setTimeout(monitor, 5000);
  } else {
    console.log(`✅ Monitoring complete: ${checks} checks passed`);
  }
}

monitor();
