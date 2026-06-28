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
    type: z.enum(['factual', 'scenario', 'debug', 'conceptual', 'fill-in'])
      .describe('The style/format of this question — rotate across types, do not repeat the same type more than twice in a row'),
    question: z.string().describe('The quiz question text — vary the opening phrase, never always start with "What is..." or "Which of the following..."'),
    options: z.array(z.string()).length(4).describe('Exactly 4 answer choices — wrong answers must reflect real, common misconceptions, not obviously wrong distractors'),
    answer: z.string().describe('The correct answer, must exactly match one of the options'),
    explanation: z.string().describe('2–3 sentence explanation that teaches the concept, not just restates the answer'),
    hint: z.string().optional().describe('Optional subtle hint that nudges thinking without giving away the answer'),
  })).min(1).max(20),
});

const TECHNICAL_TOPIC_PATTERN =
  /code|program|math|calcul|algorithm|sql|javascript|typescript|python|java|react|angular|vue|css|html|linux|bash|shell|network|database|api|rest|graphql|docker|kubernetes|git|physics|chemistry|equation|formula|derivative|integral/i;

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
        ? 'Generate all quiz content in Vietnamese language.'
        : 'Generate all quiz content in English language.';

      const difficultyMap: Record<string, string> = {
        easy: lang === 'vi' ? 'dễ (phù hợp cho người mới bắt đầu)' : 'easy (beginner-friendly)',
        medium: lang === 'vi' ? 'trung bình (kiến thức cơ bản đến nâng cao)' : 'medium (intermediate)',
        hard: lang === 'vi' ? 'khó (chuyên sâu và đòi hỏi suy luận)' : 'hard (advanced reasoning required)',
      };

      const isTechnical = TECHNICAL_TOPIC_PATTERN.test(topic);

      const formatReminder = isTechnical
        ? `\nThis is a technical topic — you MUST use code blocks (\`\`\`language\\n...\\n\`\`\`) or math notation ($...$) in at least 60% of questions and options where relevant.`
        : `\nThis is a conceptual topic — use **bold** to highlight key terms and *italics* for emphasis where helpful. Keep formatting purposeful, not decorative.`;

      const systemPrompt = `You are an expert quiz creator and educator. ${langInstruction}

## Your Goal
Create engaging, high-quality multiple-choice questions that feel dynamic — not flat or repetitive. Every question should challenge the reader to think, not just recall.

## Question Type Variety
You MUST rotate across these formats and include each at least once when count >= 5:
- **factual**: Direct knowledge check. e.g. "What does \`Array.prototype.reduce()\` return when the array is empty and no initial value is provided?"
- **scenario**: Real-world situation. e.g. "A developer needs to merge two large sorted arrays efficiently. Which approach minimizes time complexity?"
- **debug**: Find the error. e.g. "The following code throws a runtime error. What is the cause? \`\`\`js\\nconst x = null;\\nconsole.log(x.length);\\n\`\`\`"
- **conceptual**: Why/how reasoning. e.g. "Why does \`0.1 + 0.2 !== 0.3\` in most programming languages?"
- **fill-in**: Complete the blank. e.g. "The derivative of $\\sin(x)$ with respect to $x$ is ___."

Never start more than 2 questions in a row with the same phrasing. Avoid overusing "What is..." or "Which of the following...".

## Formatting Rules (MANDATORY — apply whenever relevant)
- Inline math: \`$...$\` → e.g. The area of a circle is $A = \\pi r^2$
- Block/display math: \`$$...$$\` → e.g. $$\\int_0^\\infty e^{-x}\\,dx = 1$$
- Inline code: backtick → e.g. \`Array.map()\` returns a new array
- Code block: triple backtick + language → \`\`\`js\\nconst x = 1;\\n\`\`\`
- Bold key term: \`**...**\` → e.g. **closures** capture variables from their enclosing scope
- Italic emphasis: \`*...*\` → e.g. this is *not* the same as a shallow copy

Use these markers in questions, options, and explanations. Plain text is fine only for purely non-technical, non-mathematical content.

## Answer Quality Rules
- All 4 options must be plausible to someone who hasn't mastered the topic
- Wrong answers should reflect genuine misconceptions, not obviously absurd choices
- Avoid options like "None of the above" or "All of the above"
- Explanations must teach the concept in 2–3 sentences — not just restate which answer is correct`;

      const userPrompt = `Create a quiz with exactly ${count} questions about: "${topic}".
Difficulty: ${difficultyMap[difficulty] || difficultyMap.medium}.
${langInstruction}
${formatReminder}

Distribute question types evenly. Do not repeat the same type more than twice consecutively.
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
