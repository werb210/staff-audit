import { Router } from "express";
import { requireAuth } from "../../auth/verifyOnly";
import fetch from "node-fetch";

const r = Router();
r.use(requireAuth);

// Step 1: Get authorization URL
r.get("/authorize", async (req: any, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const state = Math.random().toString(36).substring(7);
  const scope = 'r_liteprofile w_member_social';
  
  if (!clientId || !redirectUri) {
    return res.status(500).json({ 
      ok: false, 
      error: "LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_REDIRECT_URI" 
    });
  }
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&scope=${encodeURIComponent(scope)}`;
  
  res.json({ ok: true, authUrl, state });
});

// Step 2: Handle callback and get access token
r.post("/callback", async (req: any, res) => {
  try {
    const { code, state } = req.body;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).json({ 
        ok: false, 
        error: "LinkedIn OAuth not configured" 
      });
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.status(400).json({ ok: false, error: tokenData.error_description || 'Token exchange failed' });
    }
    
    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    const profileData = await profileResponse.json();
    
    // Store token securely (in production, encrypt this)
    // For now, we'll return it to be stored client-side
    res.json({
      ok: true,
      accessToken: tokenData.access_token,
      profile: {
        id: profileData.id,
        firstName: profileData.localizedFirstName,
        lastName: profileData.localizedLastName
      }
    });
    
  } catch (error: any) {
    console.error('LinkedIn OAuth callback error:', error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Post to LinkedIn page
r.post("/post", async (req: any, res) => {
  try {
    const { content, accessToken, pageId } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ ok: false, error: "Access token required" });
    }
    
    const postData = {
      author: `urn:li:organization:${pageId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };
    
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      res.json({ ok: true, postId: result.id });
    } else {
      res.status(response.status).json({ ok: false, error: result.message || 'Post failed' });
    }
    
  } catch (error: any) {
    console.error('LinkedIn post error:', error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

export default r;