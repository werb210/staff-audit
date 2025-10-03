// Client-side test script to replicate the exact client portal request
const testSignNowRequest = async () => {
  const applicationId = "f22c0bc9-40d7-4eaa-b671-7761d8101d50";
  const staffUrl = "https://staff.boreal.financial";
  
  
  try {
    const response = await fetch(`${staffUrl}/api/applications/${applicationId}/signnow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://client.boreal.financial'
      },
      credentials: 'include',
      body: JSON.stringify({})
    });
    
    
    const data = await response.json();
    
    return { success: true, data };
  } catch (error) {
    console.error("❌ Request failed:", error);
    return { success: false, error: error.message };
  }
};

// Execute test
testSignNowRequest();
