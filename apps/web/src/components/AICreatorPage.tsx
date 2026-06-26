import { useRouter } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import AIGenerator from './AIGenerator.tsx';
import { hc } from 'hono/client';
import type { AppType } from '@aeroquiz/api';
import { getAuthHeaders } from '@/contexts/AuthContext';
import type { Quiz } from '../App.tsx';

const client = hc<AppType>('/');

interface AICreatorPageProps {
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  lang: 'vi' | 'en';
}

export default function AICreatorPage({ addToast, lang }: AICreatorPageProps) {
  const router = useRouter();

  const handleQuizGenerated = async (quiz: Quiz) => {
    try {
      const res = await client.api.quizzes.$post({
        json: {
          title: quiz.title,
          description: quiz.description,
          tags: quiz.tags || ['AI Generated'],
          questions: quiz.questions,
        }
      }, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const savedQuiz = await res.json();
        addToast(
          lang === 'vi' ? 'AI đã tạo đề thi!' : 'AI generated quiz!',
          lang === 'vi' ? 'Đang chuyển đến bài làm...' : 'Starting quiz...',
          'success'
        );
        router.navigate({ to: `/player/${savedQuiz.id}` });
      } else {
        const errorData = await res.json();
        addToast('Error', errorData.error || 'Failed to save quiz.', 'error');
      }
    } catch {
      addToast('Connection Error', 'Could not save the generated quiz.', 'error');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" />
          {lang === 'vi' ? 'Tạo đề thi bằng AI' : 'AI Quiz Generator'}
        </h2>
        <p className="text-slate-400 text-sm">
          {lang === 'vi'
            ? 'Mô tả chủ đề và AI sẽ tạo đề thi trắc nghiệm cho bạn.'
            : 'Describe a topic and AI will generate a quiz for you.'}
        </p>
      </div>

      <AIGenerator
        onQuizGenerated={handleQuizGenerated}
        addToast={addToast}
        lang={lang}
      />
    </div>
  );
}
