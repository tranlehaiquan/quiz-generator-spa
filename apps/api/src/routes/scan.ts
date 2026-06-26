import { Hono } from 'hono';
import { SCAN_PRESETS } from '../data/builtin.js';

const scan = new Hono()
  .post('/quizzes/scan', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file) {
      return c.json({ error: 'No image file uploaded' }, 400);
    }

    await new Promise((resolve) => setTimeout(resolve, 3500));

    const selectPreset = SCAN_PRESETS[Math.floor(Math.random() * SCAN_PRESETS.length)];

    const resultQuiz = {
      id: 'scanned-' + Date.now(),
      title: selectPreset.title,
      description: selectPreset.description,
      tags: selectPreset.tags,
      questions: selectPreset.questions,
    };

    return c.json(resultQuiz);
  });

export default scan;
