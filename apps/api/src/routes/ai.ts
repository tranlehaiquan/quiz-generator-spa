import { Hono } from 'hono';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createAlibaba } from '@ai-sdk/alibaba';
import { z } from 'zod';

const QuizSchema = z.object({
  title: z.string().describe('Quiz title related to the topic'),
  description: z.string().describe('Short engaging description of this quiz'),
  tags: z.array(z.string()).describe('2-3 relevant topic tags'),
  questions: z.array(z.object({
    question: z.string().describe('The quiz question text'),
    options: z.array(z.string()).length(4).describe('Exactly 4 answer choices'),
    answer: z.string().describe('The correct answer, must exactly match one of the options'),
    explanation: z.string().describe('Brief explanation why this answer is correct'),
  })).min(1).max(20),
});

const ai = new Hono()
  .post('/generate', async (c) => {
    try {
      const body = await c.req.json();
      const {
        topic,
        count = 5,
        difficulty = 'medium',
        lang = 'vi',
        provider = 'openai',
        model,
        apiKey,
      } = body;

      if (!topic || typeof topic !== 'string') {
        return c.json({ error: 'Missing required field: topic' }, 400);
      }

      const resolvedOpenAiKey = apiKey || process.env.OPENAI_API_KEY || '';
      const resolvedAnthropicKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
      const resolvedAlibabaKey = apiKey || process.env.ALIBABA_API_KEY || '';

      const langInstruction = lang === 'vi'
        ? 'Generate quiz content in Vietnamese language.'
        : 'Generate quiz content in English language.';

      const difficultyMap: Record<string, string> = {
        easy: lang === 'vi' ? 'dễ (phù hợp cho người mới bắt đầu)' : 'easy (beginner-friendly)',
        medium: lang === 'vi' ? 'trung bình (kiến thức cơ bản đến nâng cao)' : 'medium (intermediate)',
        hard: lang === 'vi' ? 'khó (chuyên sâu và đòi hỏi suy luận)' : 'hard (advanced reasoning required)',
      };

      const systemPrompt = `You are an expert quiz creator and educator. ${langInstruction}
Create high-quality multiple-choice quiz questions. Each question must have exactly 4 answer options and one clearly correct answer. Include a brief explanation for why the correct answer is right.

IMPORTANT - Formatting: Use the following syntax for rich text in questions, options, and explanations:
- For math formulas: use $...$ for inline math (e.g., $x^2 + y^2 = r^2$) and $$...$$ for display/block math (e.g., $$E = mc^2$$)
- For code: use \`...\` for inline code (e.g., \`Array.map()\`) and \`\`\`...\`\`\` for code blocks
- For bold text: use **...** (e.g., **important concept**)
- For italic text: use *...* (e.g., *emphasis*)
Always use these format markers when questions involve math, programming, or technical content.`;

      const userPrompt = `Create a quiz with exactly ${count} questions about: "${topic}".
Difficulty level: ${difficultyMap[difficulty] || difficultyMap.medium}.
${langInstruction}
Return a well-structured quiz following the exact schema provided.`;

      let aiModel;

      if (provider === 'anthropic') {
        if (!resolvedAnthropicKey) {
          return c.json({ error: 'Anthropic API key not configured.' }, 400);
        }
        const anthropic = createAnthropic({ apiKey: resolvedAnthropicKey });
        aiModel = anthropic(model || 'claude-3-5-haiku-20241022');
      } else if (provider === 'deepseek') {
        const resolvedDeepSeekKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
        if (!resolvedDeepSeekKey) {
          return c.json({ error: 'DeepSeek API key not configured.' }, 400);
        }
        const deepseek = createDeepSeek({ apiKey: resolvedDeepSeekKey });
        aiModel = deepseek(model || 'deepseek-chat');
      } else if (provider === 'alibaba') {
        if (!resolvedAlibabaKey) {
          return c.json({ error: 'Alibaba API key not configured.' }, 400);
        }
        const alibaba = createAlibaba({
          apiKey: resolvedAlibabaKey,
          baseURL: 'https://ws-p0sybqft3q7u7io0.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
        });
        aiModel = alibaba(model || 'qwen-plus');
      } else {
        if (!resolvedOpenAiKey) {
          return c.json({ error: 'OpenAI API key not configured.' }, 400);
        }
        const openai = createOpenAI({ apiKey: resolvedOpenAiKey });
        aiModel = openai(model || 'gpt-4o-mini');
      }

      const result = await generateObject({
        model: aiModel,
        schema: QuizSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      const generatedQuiz = {
        id: 'ai-' + Date.now(),
        ...result.object,
      };

      return c.json(generatedQuiz);
    } catch (err: any) {
      console.error('AI generation error:', err);
      const msg = err?.message || 'AI generation failed';
      if (msg.includes('401') || msg.includes('API key') || msg.includes('Unauthorized')) {
        return c.json({ error: 'Invalid or missing API key.' }, 401);
      }
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
        return c.json({ error: 'API rate limit exceeded. Please wait and try again.' }, 429);
      }
      return c.json({ error: msg }, 500);
    }
  });

export default ai;
