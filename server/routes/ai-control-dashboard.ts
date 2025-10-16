/**
 * AI Control Dashboard Routes
 * Centralized AI management, training, and oversight system
 */

import { Router } from 'express';
import { callOpenAI, isOpenAIConfigured } from '../utils/openai';

const router = Router();

// AI Settings Storage (would be in database in production)
interface AISettings {
  features: Record<string, boolean>;
  models: Record<string, string>;
  prompts: Record<string, string>;
  thresholds: Record<string, number>;
}

let aiSettings: AISettings = {
  features: {
    creditSummary: true,
    riskScoring: true,
    nextStepEngine: true,
    documentMatching: true,
    documentSummary: true,
    lenderCustomization: true,
    explainDocument: true,
    draftEmail: true,
    suggestReplies: true,
    sentimentAnalysis: true,
    contactTags: true,
    dealScoring: true,
    fraudDetection: true,
    callSummary: true,
    escalationExtraction: true
  },
  models: {
    primary: 'gpt-4',
    fallback: 'gpt-3.5-turbo',
    sentiment: 'gpt-4',
    fraud: 'gpt-4'
  },
  prompts: {
    creditSummary: 'You are a senior credit analyst...',
    riskAssessment: 'Assess the risk level...',
    emailDraft: 'Draft a professional email...',
    documentExplanation: 'Explain this document...'
  },
  thresholds: {
    riskThreshold: 70,
    fraudThreshold: 80,
    confidenceThreshold: 85
  }
};

// AI Usage Analytics (would be in database)
interface AIUsageStats {
  feature: string;
  calls: number;
  avgLatency: number;
  errorRate: number;
  cost: number;
  lastUsed: string;
}

let usageStats: AIUsageStats[] = [
  {
    feature: 'creditSummary',
    calls: 156,
    avgLatency: 2.3,
    errorRate: 0.02,
    cost: 4.67,
    lastUsed: new Date().toISOString()
  },
  {
    feature: 'riskScoring',
    calls: 203,
    avgLatency: 1.8,
    errorRate: 0.01,
    cost: 2.15,
    lastUsed: new Date().toISOString()
  },
  {
    feature: 'documentMatching',
    calls: 89,
    avgLatency: 3.1,
    errorRate: 0.03,
    cost: 3.22,
    lastUsed: new Date().toISOString()
  }
];

/**
 * Get AI Dashboard Overview
 * GET /api/ai-control/dashboard
 */
router.get('/dashboard', async (req: any, res: any) => {
  try {
    const totalCalls = usageStats.reduce((sum, stat) => sum + stat.calls, 0);
    const totalCost = usageStats.reduce((sum, stat) => sum + stat.cost, 0);
    const avgLatency = usageStats.reduce((sum, stat) => sum + stat.avgLatency, 0) / usageStats.length;
    const avgErrorRate = usageStats.reduce((sum, stat) => sum + stat.errorRate, 0) / usageStats.length;

    const enabledFeatures = Object.values(aiSettings.features).filter(Boolean).length;
    const totalFeatures = Object.keys(aiSettings.features).length;

    res.json({
      success: true,
      overview: {
        totalFeatures,
        enabledFeatures,
        disabledFeatures: totalFeatures - enabledFeatures,
        systemStatus: isOpenAIConfigured() ? 'operational' : 'configuration_required'
      },
      usage: {
        totalCalls,
        totalCost: Math.round(totalCost * 100) / 100,
        avgLatency: Math.round(avgLatency * 100) / 100,
        avgErrorRate: Math.round(avgErrorRate * 10000) / 100, // as percentage
        last24h: totalCalls // simplified
      },
      topFeatures: usageStats
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5)
        .map(stat => ({
          name: stat.feature,
          calls: stat.calls,
          performance: Math.round((1 - stat.errorRate) * 100)
        }))
    });

  } catch (error: unknown) {
    console.error('❌ [AI-CONTROL] Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Get AI Feature Settings
 * GET /api/ai-control/settings
 */
router.get('/settings', async (req: any, res: any) => {
  try {
    res.json({
      success: true,
      settings: aiSettings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('❌ [AI-CONTROL] Settings error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Update AI Feature Settings
 * PUT /api/ai-control/settings
 */
router.put('/settings', async (req: any, res: any) => {
  try {
    const { features, models, prompts, thresholds } = req.body;

    if (features) {
      aiSettings.features = { ...aiSettings.features, ...features };
    }
    if (models) {
      aiSettings.models = { ...aiSettings.models, ...models };
    }
    if (prompts) {
      aiSettings.prompts = { ...aiSettings.prompts, ...prompts };
    }
    if (thresholds) {
      aiSettings.thresholds = { ...aiSettings.thresholds, ...thresholds };
    }

    console.log('✅ [AI-CONTROL] Settings updated');

    res.json({
      success: true,
      settings: aiSettings,
      message: 'Settings updated successfully'
    });

  } catch (error: unknown) {
    console.error('❌ [AI-CONTROL] Settings update error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * AI Prompt Playground
 * POST /api/ai-control/playground
 */
router.post('/playground', async (req: any, res: any) => {
  try {
    const { prompt, model, maxTokens } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    if (!isOpenAIConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI not configured'
      });
    }

    const startTime = Date.now();
    const result = await callOpenAI(prompt, maxTokens || 500);
    const latency = Date.now() - startTime;

    console.log(`✅ [AI-PLAYGROUND] Prompt tested (${latency}ms)`);

    res.json({
      success: true,
      result,
      metadata: {
        model: model || 'gpt-4',
        latency,
        tokens: result.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('❌ [AI-PLAYGROUND] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Get AI Usage Analytics
 * GET /api/ai-control/analytics
 */
router.get('/analytics', async (req: any, res: any) => {
  try {
    const { feature, timeframe } = req.query;

    let filteredStats = usageStats;
    
    if (feature) {
      filteredStats = usageStats.filter(stat => stat.feature === feature);
    }

    // Generate mock time-series data for charts
    const timeSeriesData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      calls: Math.floor(Math.random() * 20) + 5,
      latency: Math.random() * 3 + 1,
      errors: Math.floor(Math.random() * 3)
    }));

    res.json({
      success: true,
      analytics: {
        summary: filteredStats,
        timeSeries: timeSeriesData,
        trends: {
          callsGrowth: '+12%',
          latencyTrend: '-5%',
          errorRateChange: '-8%',
          costEfficiency: '+15%'
        }
      }
    });

  } catch (error: unknown) {
    console.error('❌ [AI-ANALYTICS] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Get AI Training Data & Feedback
 * GET /api/ai-control/training
 */
router.get('/training', async (req: any, res: any) => {
  try {
    // Mock training data - would come from actual feedback collection
    const trainingData = [
      {
        feature: 'creditSummary',
        originalOutput: 'Standard credit analysis...',
        userEdit: 'Enhanced credit analysis with...',
        improvement: 'Added industry-specific context',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        userId: 'user123'
      },
      {
        feature: 'riskScoring',
        originalOutput: 'MEDIUM RISK',
        userEdit: 'HIGH RISK',
        improvement: 'Caught additional debt concerns',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        userId: 'user456'
      },
      {
        feature: 'emailDraft',
        originalOutput: 'Dear Lender...',
        userEdit: 'Dear Mr. Johnson...',
        improvement: 'Personalized lender contact',
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        userId: 'user789'
      }
    ];

    const trainingStats = {
      totalFeedback: trainingData.length,
      featuresImproving: new Set(trainingData.map(d => d.feature)).size,
      avgImprovementRate: 0.87,
      lastTraining: new Date().toISOString()
    };

    res.json({
      success: true,
      training: {
        stats: trainingStats,
        recentFeedback: trainingData.slice(0, 10),
        improvementAreas: [
          'Industry-specific terminology',
          'Risk assessment accuracy',
          'Email personalization'
        ]
      }
    });

  } catch (error: unknown) {
    console.error('❌ [AI-TRAINING] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Submit AI Feedback
 * POST /api/ai-control/feedback
 */
router.post('/feedback', async (req: any, res: any) => {
  try {
    const { feature, originalOutput, userEdit, category, rating } = req.body;

    if (!feature || !originalOutput || !userEdit) {
      return res.status(400).json({
        success: false,
        error: 'Feature, original output, and user edit are required'
      });
    }

    // In production, save to database
    const feedbackEntry = {
      id: Date.now().toString(),
      feature,
      originalOutput,
      userEdit,
      category: category || 'improvement',
      rating: rating || 5,
      timestamp: new Date().toISOString(),
      userId: 'current-user' // Would come from auth
    };

    console.log(`✅ [AI-FEEDBACK] Feedback recorded for: ${feature}`);

    res.json({
      success: true,
      feedback: feedbackEntry,
      message: 'Feedback recorded for model improvement'
    });

  } catch (error: unknown) {
    console.error('❌ [AI-FEEDBACK] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Emergency AI System Toggle
 * POST /api/ai-control/emergency-disable
 */
router.post('/emergency-disable', async (req: any, res: any) => {
  try {
    const { reason } = req.body;

    // Disable all AI features
    Object.keys(aiSettings.features).forEach(feature => {
      aiSettings.features[feature] = false;
    });

    console.log(`🚨 [AI-EMERGENCY] All AI features disabled. Reason: ${reason || 'Emergency stop'}`);

    res.json({
      success: true,
      message: 'All AI features have been emergency disabled',
      disabledAt: new Date().toISOString(),
      reason: reason || 'Emergency stop'
    });

  } catch (error: unknown) {
    console.error('❌ [AI-EMERGENCY] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Test AI System Health
 * GET /api/ai-control/health
 */
router.get('/health', async (req: any, res: any) => {
  try {
    const health = {
      openai: isOpenAIConfigured(),
      features: Object.keys(aiSettings.features).length,
      enabledFeatures: Object.values(aiSettings.features).filter(Boolean).length,
      lastActivity: new Date().toISOString(),
      systemLoad: 'normal',
      responseTime: Math.random() * 2000 + 500
    };

    res.json({
      success: true,
      health,
      status: health.openai ? 'healthy' : 'configuration_required'
    });

  } catch (error: unknown) {
    console.error('❌ [AI-HEALTH] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;