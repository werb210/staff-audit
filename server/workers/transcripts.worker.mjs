import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const RECORDINGS_DIR = process.env.RECORDINGS_DIR || './recordings';

// Ensure recordings directory exists
await fs.mkdir(RECORDINGS_DIR, { recursive: true });

async function downloadRecording(uri, filename) {
  const auth = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(uri, {
    headers: { Authorization: auth }
  });
  
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
  
  const buffer = await response.arrayBuffer();
  const filepath = path.join(RECORDINGS_DIR, filename);
  await fs.writeFile(filepath, Buffer.from(buffer));
  return filepath;
}

async function transcribeAudio(filepath) {
  console.log(`🎤 [TRANSCRIPT] Transcribing: ${filepath}`);
  
  const transcription = await openai.audio.transcriptions.create({
    file: await fs.readFile(filepath),
    model: 'whisper-1',
    language: 'en'
  });

  return transcription.text;
}

async function generateSummary(text) {
  console.log(`📝 [SUMMARY] Generating summary for ${text.length} characters`);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: `Please summarize this call transcript in exactly 5 bullet points. Focus on key decisions, action items, and important information discussed:\n\n${text}`
    }],
    max_tokens: 300,
    temperature: 0.3
  });

  return completion.choices[0].message.content;
}

async function processTranscripts() {
  console.log('🔄 [TRANSCRIPT-WORKER] Starting transcript processing...');
  
  try {
    // Get queued transcripts
    const queuedTranscripts = await db.execute(`
      SELECT t.id, t.recording_id, r.provider_uri, r.provider_recording_sid
      FROM call_transcripts t
      JOIN call_recordings r ON t.recording_id = r.id
      WHERE t.status = 'queued'
      ORDER BY t.createdAt ASC
      LIMIT 5
    `);

    if (queuedTranscripts.length === 0) {
      console.log('✅ [TRANSCRIPT-WORKER] No queued transcripts found');
      return;
    }

    for (const transcript of queuedTranscripts) {
      console.log(`📋 [TRANSCRIPT] Processing transcript ${transcript.id}...`);
      
      try {
        // Mark as processing
        await db.execute(`
          UPDATE call_transcripts 
          SET status = 'processing', updatedAt = now()
          WHERE id = $1
        `, [transcript.id]);

        // Download recording
        const filename = `${transcript.provider_recording_sid}.wav`;
        const filepath = await downloadRecording(transcript.provider_uri, filename);
        
        // Transcribe audio
        const text = await transcribeAudio(filepath);
        
        // Generate summary
        const summary = await generateSummary(text);
        
        // Update transcript record
        await db.execute(`
          UPDATE call_transcripts 
          SET status = 'done', text = $1, summary = $2, updatedAt = now()
          WHERE id = $3
        `, [text, summary, transcript.id]);

        // Clean up audio file
        await fs.unlink(filepath);
        
        console.log(`✅ [TRANSCRIPT] Completed transcript ${transcript.id}`);
        
      } catch (error) {
        console.error(`❌ [TRANSCRIPT] Error processing transcript ${transcript.id}:`, error);
        
        // Mark as error
        await db.execute(`
          UPDATE call_transcripts 
          SET status = 'error', error = $1, updatedAt = now()
          WHERE id = $2
        `, [error.message, transcript.id]);
      }
    }
    
  } catch (error) {
    console.error('❌ [TRANSCRIPT-WORKER] Fatal error:', error);
  }
}

// Run once if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await processTranscripts();
  await client.end();
}

export { processTranscripts };