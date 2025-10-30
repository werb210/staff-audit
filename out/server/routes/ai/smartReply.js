import { Router } from 'express';
import OpenAI from "openai";
import { authMiddleware } from '../../middleware/authJwt';
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const router = Router();
// Apply authentication middleware
router.use(authMiddleware);
// Generate smart reply
router.post('/smart-reply', async (req, res) => {
    try {
        const { threadHistory, replyType, context = {}, tone = 'professional', maxLength = 160 } = req.body;
        if (!threadHistory || !replyType) {
            return res.status(400).json({
                error: 'threadHistory and replyType are required'
            });
        }
        console.log(`[SMART-REPLY] Generating ${replyType} reply with ${tone} tone`);
        const reply = await generateSmartReply(threadHistory, replyType, context, tone, maxLength);
        res.json({
            success: true,
            reply,
            metadata: {
                replyType,
                tone,
                maxLength,
                characterCount: reply.length,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[SMART-REPLY] Error generating reply:', error);
        res.status(500).json({
            error: 'Failed to generate smart reply',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Generate multiple reply options
router.post('/reply-options', async (req, res) => {
    try {
        const { threadHistory, replyType, context = {}, count = 3 } = req.body;
        if (!threadHistory || !replyType) {
            return res.status(400).json({
                error: 'threadHistory and replyType are required'
            });
        }
        console.log(`[SMART-REPLY] Generating ${count} reply options for ${replyType}`);
        const replies = await Promise.all([
            generateSmartReply(threadHistory, replyType, context, 'professional', 160),
            generateSmartReply(threadHistory, replyType, context, 'friendly', 160),
            generateSmartReply(threadHistory, replyType, context, 'formal', 160)
        ]);
        res.json({
            success: true,
            options: replies.map((reply, index) => ({
                id: index + 1,
                text: reply,
                tone: ['professional', 'friendly', 'formal'][index],
                characterCount: reply.length
            })),
            metadata: {
                replyType,
                optionsCount: replies.length,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[SMART-REPLY] Error generating reply options:', error);
        res.status(500).json({
            error: 'Failed to generate reply options',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Generate contextual follow-up suggestions
router.post('/followup-suggestions', async (req, res) => {
    try {
        const { threadHistory, context = {} } = req.body;
        if (!threadHistory) {
            return res.status(400).json({
                error: 'threadHistory is required'
            });
        }
        const suggestions = await generateFollowupSuggestions(threadHistory, context);
        res.json({
            success: true,
            suggestions,
            metadata: {
                suggestionsCount: suggestions.length,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[SMART-REPLY] Error generating followup suggestions:', error);
        res.status(500).json({
            error: 'Failed to generate followup suggestions',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Main smart reply generation function
async function generateSmartReply(threadHistory, replyType, context, tone, maxLength) {
    const systemPrompts = {
        sms: `You are a professional customer service representative responding via SMS. Keep responses concise, helpful, and under ${maxLength} characters. Use a ${tone} tone.`,
        email: `You are a professional customer service representative responding via email. Provide comprehensive but concise responses with a ${tone} tone.`,
        professional: `You are a business professional responding to a client inquiry. Maintain a professional, courteous tone while being helpful and informative.`,
        casual: `You are a friendly customer service representative. Use a warm, approachable tone while remaining professional.`,
        followup: `You are following up on a previous conversation. Be proactive, helpful, and show that you remember the context of previous interactions.`
    };
    const systemPrompt = systemPrompts[replyType] || systemPrompts.professional;
    let userPrompt = `Based on the following conversation thread, generate an appropriate ${replyType} response:\n\n${threadHistory}`;
    // Add context if provided
    if (context.contactName) {
        userPrompt += `\n\nContact Name: ${context.contactName}`;
    }
    if (context.applicationId) {
        userPrompt += `\nApplication ID: ${context.applicationId}`;
    }
    if (context.purpose) {
        userPrompt += `\nPurpose: ${context.purpose}`;
    }
    if (context.urgency) {
        userPrompt += `\nUrgency Level: ${context.urgency}`;
    }
    // Add specific instructions based on reply type
    if (replyType === 'sms') {
        userPrompt += `\n\nIMPORTANT: Keep the response under ${maxLength} characters for SMS compatibility.`;
    }
    else if (replyType === 'email') {
        userPrompt += `\n\nFormat as a professional email response with appropriate greeting and closing.`;
    }
    userPrompt += `\n\nGenerate only the response text, no additional formatting or explanations.`;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_tokens: replyType === 'sms' ? 100 : 500,
            temperature: 0.7
        });
        let reply = response.choices[0].message.content?.trim() || '';
        // Ensure SMS responses are within character limit
        if (replyType === 'sms' && reply.length > maxLength) {
            reply = reply.substring(0, maxLength - 3) + '...';
        }
        return reply;
    }
    catch (error) {
        console.error('[SMART-REPLY] OpenAI API error:', error);
        return generateFallbackReply(replyType, context);
    }
}
// Generate follow-up suggestions
async function generateFollowupSuggestions(threadHistory, context) {
    const prompt = `Based on this conversation thread, suggest 3 appropriate follow-up actions or responses:

${threadHistory}

Context: ${JSON.stringify(context, null, 2)}

Return suggestions as a JSON array of strings. Each suggestion should be actionable and relevant to the conversation.`;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: "You are a customer service expert. Provide helpful, actionable follow-up suggestions based on conversation context."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 300
        });
        const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
        return result.suggestions || result.followups || [];
    }
    catch (error) {
        console.error('[SMART-REPLY] Error generating followup suggestions:', error);
        return [
            'Schedule a follow-up call',
            'Send additional documentation',
            'Check application status'
        ];
    }
}
// Fallback replies when AI is unavailable
function generateFallbackReply(replyType, context) {
    const fallbacks = {
        sms: "Thank you for your message. We've received your inquiry and will respond shortly.",
        email: "Thank you for contacting us. We have received your message and will respond within 24 hours. If this is urgent, please call our office directly.",
        professional: "Thank you for your inquiry. We are reviewing your request and will provide a response shortly.",
        casual: "Hi! Thanks for reaching out. We'll get back to you soon!",
        followup: "Thank you for following up. We are continuing to process your request and will update you soon."
    };
    return fallbacks[replyType] || fallbacks.professional;
}
export default router;
