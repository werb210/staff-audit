// Quick test to see what's happening with SLF API
const response = await fetch('http://localhost:5000/api/slf/contacts');
const data = await response.json();
console.log('Response:', JSON.stringify(data, null, 2));