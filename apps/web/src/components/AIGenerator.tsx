import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, Settings2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Quiz } from '../App.tsx';

interface AIGeneratorProps {
  onQuizGenerated: (quiz: Quiz) => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  lang: 'vi' | 'en';
}

const PROVIDERS = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'alibaba',
    label: 'Qwen (Alibaba)',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-plus-latest', 'qwen-max-latest', 'qwen3-235b-a22b'],
    defaultModel: 'qwen-plus',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    defaultModel: 'gpt-4o-mini',
    keyPlaceholder: 'sk-proj-...',
  },
  {
    id: 'anthropic',
    label: 'Claude',
    models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
    defaultModel: 'claude-3-5-haiku-20241022',
    keyPlaceholder: 'sk-ant-...',
  },
];

export default function AIGenerator({ onQuizGenerated, addToast, lang }: AIGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [provider, setProvider] = useState('deepseek');
  const [model, setModel] = useState('deepseek-chat');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentProvider = PROVIDERS.find(p => p.id === provider)!;

  const vi = lang === 'vi';

  const handleProviderChange = (id: string) => {
    setProvider(id);
    setModel(PROVIDERS.find(p => p.id === id)!.defaultModel);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      addToast(vi ? 'Thiếu thông tin' : 'Missing info', vi ? 'Vui lòng nhập chủ đề!' : 'Please enter a topic!', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          count,
          difficulty,
          lang,
          provider,
          model,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text.substring(0, 100) || `HTTP error ${res.status}` };
      }

      if (!res.ok) {
        addToast(
          vi ? 'Lỗi tạo đề thi AI' : 'AI Creation Failed',
          data.error || (vi ? 'Lỗi máy chủ không xác định.' : 'System returned an unknown server error.'),
          'error'
        );
        return;
      }

      onQuizGenerated(data as Quiz);
      setTopic('');
    } catch (err: any) {
      addToast(vi ? 'Lỗi kết nối' : 'Network error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Topic */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {vi ? 'Chủ đề đề thi trắc nghiệm' : 'Quiz Topic / Description'}
        </label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && topic.trim() && handleGenerate()}
          placeholder={vi ? 'Ví dụ: Lịch sử Việt Nam thế kỷ 20, Hoá học vô cơ lớp 12, React Hooks...' : 'e.g. 20th Century World History, Organic Chemistry, React Hooks...'}
          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition shadow-inner"
        />
      </div>

      {/* Count + Difficulty row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{vi ? 'Số lượng câu hỏi' : 'Number of Questions'}</label>
          <div className="flex gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-850">
            {[3, 5, 8, 10].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                  count === n
                    ? 'bg-indigo-600 border border-indigo-500/30 text-white shadow-md'
                    : 'border border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{vi ? 'Mức độ khó' : 'Difficulty Level'}</label>
          <div className="relative">
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-350 focus:outline-none focus:border-indigo-500/50 transition pr-10 cursor-pointer"
            >
              <option value="easy">{vi ? '🟢 Dễ (Cơ bản)' : '🟢 Easy (Basic)'}</option>
              <option value="medium">{vi ? '🟡 Trung bình (Khá)' : '🟡 Medium (Intermediate)'}</option>
              <option value="hard">{vi ? '🔴 Khó (Chuyên sâu)' : '🔴 Hard (Advanced)'}</option>
            </select>
            <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-extrabold py-5.5 border border-indigo-500/30 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/25 transition duration-300 text-sm tracking-wide"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{vi ? 'Đang gửi chủ đề và tạo đề thi...' : 'AI is thinking & generating quiz...'}</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2 text-indigo-200" />{vi ? 'Tạo đề thi với AI' : 'Generate Quiz with AI'}</>
        )}
      </Button>

      {/* Options toggle */}
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition mx-auto uppercase tracking-wider"
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span>{vi ? 'Tuỳ chọn nâng cao (Cài đặt AI)' : 'Advanced Options (AI Settings)'}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${showOptions ? 'rotate-180' : ''}`} />
      </button>

      {showOptions && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-slate-900 pt-4">
          {/* Provider + Model */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {vi ? 'Mô hình AI' : 'AI Provider'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-850">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id)}
                    className={`py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                      provider === p.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-355'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full md:w-48 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Model
              </label>
              <div className="relative">
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-300 focus:outline-none focus:border-indigo-500/50 transition pr-8 cursor-pointer"
                >
                  {currentProvider.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              API Key {vi ? '(Ghi đè cấu hình .env hệ thống - Tùy chọn)' : '(Optional - Overrides .env config)'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={currentProvider.keyPlaceholder}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-350 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 transition pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
