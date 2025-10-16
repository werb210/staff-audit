import express from 'express';
import OpenAI from 'openai';

const r = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Generate AI ads
r.post('/ai/generate-ads', async (req, res) => {
  try {
    console.log('🤖 [MARKETING-AI] Generating AI ads with OpenAI');
    
    const { businessType, targetAudience, budget, goals, location, additionalInfo } = req.body;
    
    if (!openai.apiKey) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.' 
      });
    }

    const prompt = `Create 3 Google Ads campaign variations for a Canadian financial services company:

Business Type: ${businessType}
Target Audience: ${targetAudience}
Monthly Budget: $${budget}
Primary Goal: ${goals}
Target Location: ${location}
Additional Info: ${additionalInfo}

For each variation, provide:
1. 3 headlines (30 characters each max)
2. 2 descriptions (90 characters each max)
3. 10 relevant keywords
4. 4 sitelink suggestions
5. 4 callout extensions

Focus on Canadian market, use Canadian spelling, mention Canadian regulations where relevant.
Make ads compelling and conversion-focused for financial services.
Ensure compliance with Canadian advertising standards.

Format response as JSON with this structure:
{
  "ads": [
    {
      "headline1": "string",
      "headline2": "string", 
      "headline3": "string",
      "description1": "string",
      "description2": "string",
      "keywords": ["keyword1", "keyword2", ...],
      "adExtensions": {
        "sitelinks": ["link1", "link2", "link3", "link4"],
        "callouts": ["callout1", "callout2", "callout3", "callout4"]
      }
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a Canadian financial services marketing expert specializing in Google Ads. Create high-converting ad copy that complies with Canadian financial advertising regulations. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = JSON.parse(response.choices[0].message.content);
    
    console.log('✅ [MARKETING-AI] Generated', aiResponse.ads?.length || 0, 'ad variations');
    
    res.json(aiResponse);
    
  } catch (error) {
    console.error('AI ad generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate ads', 
      details: error.message 
    });
  }
});

// Regenerate single ad variation
r.post('/ai/regenerate-ad', async (req, res) => {
  try {
    console.log('🔄 [MARKETING-AI] Regenerating single ad variation');
    
    const { businessType, targetAudience, budget, goals, location, additionalInfo, variationIndex, previousAds } = req.body;
    
    if (!openai.apiKey) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured' 
      });
    }

    const prompt = `Create 1 new Google Ads campaign variation for a Canadian financial services company.
Make this variation different from the previous ones I'll show you.

Business Type: ${businessType}
Target Audience: ${targetAudience} 
Monthly Budget: $${budget}
Primary Goal: ${goals}
Target Location: ${location}
Additional Info: ${additionalInfo}

Previous ads to avoid duplicating:
${JSON.stringify(previousAds, null, 2)}

Create a fresh, unique approach while maintaining the same quality and Canadian focus.

Format response as JSON:
{
  "ad": {
    "headline1": "string",
    "headline2": "string",
    "headline3": "string", 
    "description1": "string",
    "description2": "string",
    "keywords": ["keyword1", "keyword2", ...],
    "adExtensions": {
      "sitelinks": ["link1", "link2", "link3", "link4"],
      "callouts": ["callout1", "callout2", "callout3", "callout4"]
    }
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a Canadian financial services marketing expert. Create a unique Google Ads variation that's different from previous attempts while maintaining high quality and Canadian compliance."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 1000
    });

    const aiResponse = JSON.parse(response.choices[0].message.content);
    
    console.log('✅ [MARKETING-AI] Regenerated ad variation');
    
    res.json(aiResponse);
    
  } catch (error) {
    console.error('AI ad regeneration error:', error);
    res.status(500).json({ 
      error: 'Failed to regenerate ad',
      details: error.message 
    });
  }
});

// AI keyword suggestions
r.post('/ai/suggest-keywords', async (req, res) => {
  try {
    console.log('🎯 [MARKETING-AI] Generating keyword suggestions');
    
    const { businessType, targetAudience, location } = req.body;
    
    if (!openai.apiKey) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured' 
      });
    }

    const prompt = `Generate keyword suggestions for Google Ads targeting Canadian market:

Business Type: ${businessType}
Target Audience: ${targetAudience}
Location: ${location}

Provide 3 categories:
1. High-intent keywords (10 keywords)
2. Broad match keywords (10 keywords) 
3. Long-tail keywords (15 keywords)

Focus on Canadian search patterns, include location modifiers, and consider seasonal trends.
Include both English and French-Canadian relevant terms where appropriate.

Format as JSON:
{
  "keywords": {
    "high_intent": ["keyword1", "keyword2", ...],
    "broad_match": ["keyword1", "keyword2", ...], 
    "long_tail": ["keyword1", "keyword2", ...]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a Canadian PPC specialist with expertise in keyword research for financial services. Focus on Canadian search behavior and compliance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 1000
    });

    const aiResponse = JSON.parse(response.choices[0].message.content);
    
    console.log('✅ [MARKETING-AI] Generated keyword suggestions');
    
    res.json(aiResponse);
    
  } catch (error) {
    console.error('AI keyword generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate keywords',
      details: error.message 
    });
  }
});

// AI ad performance optimization suggestions  
r.post('/ai/optimize-campaign', async (req, res) => {
  try {
    console.log('📊 [MARKETING-AI] Generating optimization suggestions');
    
    const { campaignData, performanceMetrics } = req.body;
    
    if (!openai.apiKey) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured' 
      });
    }

    const prompt = `Analyze this Google Ads campaign performance and provide optimization suggestions:

Campaign: ${JSON.stringify(campaignData, null, 2)}
Performance: ${JSON.stringify(performanceMetrics, null, 2)}

Provide specific, actionable recommendations for:
1. Ad copy improvements
2. Keyword bidding strategy
3. Audience targeting refinements
4. Budget allocation suggestions
5. Landing page optimization tips

Focus on Canadian market best practices and financial services compliance.

Format as JSON:
{
  "optimizations": {
    "priority": "high|medium|low",
    "recommendations": [
      {
        "category": "string",
        "suggestion": "string", 
        "expected_impact": "string",
        "implementation": "string"
      }
    ]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a senior Google Ads strategist specializing in Canadian financial services campaigns. Provide data-driven optimization recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500
    });

    const aiResponse = JSON.parse(response.choices[0].message.content);
    
    console.log('✅ [MARKETING-AI] Generated optimization suggestions');
    
    res.json(aiResponse);
    
  } catch (error) {
    console.error('AI optimization error:', error);
    res.status(500).json({ 
      error: 'Failed to generate optimization suggestions',
      details: error.message 
    });
  }
});

export default r;