import { Hono } from 'hono';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import Tesseract from 'tesseract.js';
import { z } from 'zod';

const QuizSchema = z.object({
  title: z.string().describe('Quiz title inferred from content'),
  description: z.string().describe('Short description of this quiz'),
  tags: z.array(z.string()).describe('2-3 relevant topic tags'),
  questions: z.array(z.object({
    question: z.string().describe('The quiz question text exactly as it appears'),
    options: z.array(z.string()).length(4).describe('Exactly 4 answer choices in order'),
    answer: z.string().describe('The correct answer, must exactly match one of the options'),
    explanation: z.string().describe('Brief explanation why this answer is correct'),
  })).min(1).max(30),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getAIModel() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return { name: 'openai', model: openai('gpt-4o-mini') };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    return { name: 'anthropic', model: anthropic('claude-3-5-haiku-20241022') };
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    const deepseek = createDeepSeek({ apiKey: deepseekKey });
    return { name: 'deepseek', model: deepseek('deepseek-chat') };
  }

  return null;
}

async function structureWithAI(rawText: string) {
  const ai = getAIModel();
  if (!ai) return null;

  const systemPrompt = `You are an expert quiz formatter. Given raw OCR text from a quiz/exam image, extract all questions and structure them into a proper quiz object.
For each question:
- Capture the exact question text
- List all answer choices in correct order (must have exactly 4 options — if fewer, infer reasonable distractors)
- Identify the correct answer (if marked/circled in the text, use that; otherwise use your knowledge)
- Provide a brief explanation for the correct answer

Return a well-structured quiz with a descriptive title, short description, and 2-3 relevant topic tags.`;

  const result = await generateObject({
    model: ai.model,
    schema: QuizSchema,
    system: systemPrompt,
    prompt: `Raw OCR text extracted from a quiz image:\n\n"""\n${rawText}\n"""\n\nExtract all questions into a structured quiz.`,
  });

  return result.object;
}

const scan = new Hono()
  .post('/quizzes/scan', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No image file uploaded' }, 400);
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
    }

    try {
      // Step 1: Tesseract OCR — extract raw text from image (free, no API key needed)
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      const { data: { text: rawText } } = await Tesseract.recognize(
        Buffer.from(base64, 'base64'),
        'vie+eng',
        { logger: (m) => { if (m.status === 'recognizing text') console.log(`OCR progress: ${Math.round(m.progress * 100)}%`); } }
      );

      const trimmed = rawText.trim();
      if (!trimmed) {
        return c.json({ error: 'No text could be extracted from this image. Try a clearer photo.' }, 400);
      }

      console.log(`Tesseract OCR extracted ${trimmed.length} chars`);

      // Step 2: AI structuring — convert raw text into structured quiz (uses any configured provider)
      const ai = getAIModel();
      if (ai) {
        try {
          const structured = await structureWithAI(trimmed);
          return c.json({ id: 'scanned-' + Date.now(), ...structured });
        } catch (err: any) {
          console.error('AI structuring failed, returning raw OCR text:', err.message);
          // Fall through to return raw text
        }
      }

      // No AI provider configured or AI failed — return raw OCR text
      return c.json({
        id: 'scanned-' + Date.now(),
        title: 'OCR Scan Result',
        description: 'Raw text extracted by Tesseract OCR. Configure an AI provider (OPENAI_API_KEY, ANTHROPIC_API_KEY, or DEEPSEEK_API_KEY) for automatic structuring.',
        tags: ['OCR', 'Raw'],
        questions: [{
          question: 'Raw extracted text',
          options: ['See raw text below', '', '', ''],
          answer: 'See raw text below',
          explanation: trimmed.substring(0, 500) + (trimmed.length > 500 ? '...' : ''),
        }],
        rawText: trimmed,
      });
    } catch (err: any) {
      console.error('OCR scan error:', err);
      const msg = err?.message || 'OCR scan failed';
      if (msg.includes('401') || msg.includes('API key') || msg.includes('Unauthorized')) {
        return c.json({ error: 'Invalid or missing AI API key.' }, 401);
      }
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
        return c.json({ error: 'AI rate limit exceeded. Please wait and try again.' }, 429);
      }
      return c.json({ error: msg }, 500);
    }
  });

export default scan;
