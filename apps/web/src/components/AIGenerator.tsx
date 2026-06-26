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

      const data = await res.json();

      if (!res.ok) {
        addToast(vi ? 'Thất bại' : 'Failed', data.error || 'Unknown error', 'error');
        return;
      }

      onQuizGenerated(data as Quiz);
      addToast(
        vi ? '✨ Đã tạo đề thi!' : '✨ Quiz generated!',
        vi ? "Nhấn 'Bắt đầu làm bài' để chơi" : "Click 'Parse & Play' to start",
        'success'
      );
      setTopic('');
    } catch (err: any) {
      addToast(vi ? 'Lỗi kết nối' : 'Network error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Topic */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400">
          {vi ? 'Chủ đề đề thi' : 'Quiz Topic'}
        </label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          placeholder={vi ? 'Ví dụ: Lịch sử Việt Nam, Sinh học tế bào, React...' : 'e.g. World History, Cell Biology, React...'}
          className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition"
        />
      </div>

      {/* Count + Difficulty row */}
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">{vi ? 'Số câu' : 'Questions'}</label>
          <div className="flex gap-1">
            {[3, 5, 8, 10].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                  count === n
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">{vi ? 'Độ khó' : 'Difficulty'}</label>
          <div className="relative">
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full appearance-none bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 transition pr-7 cursor-pointer"
            >
              <option value="easy">{vi ? '🟢 Dễ' : '🟢 Easy'}</option>
              <option value="medium">{vi ? '🟡 Trung bình' : '🟡 Medium'}</option>
              <option value="hard">{vi ? '🔴 Khó' : '🔴 Hard'}</option>
            </select>
            <ChevronDown className="h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold py-5 border border-indigo-500/40 transition duration-200"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{vi ? 'Đang tạo...' : 'Generating...'}</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" />{vi ? 'Tạo đề thi với AI' : 'Generate Quiz with AI'}</>
        )}
      </Button>

      {/* Options toggle */}
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center space-x-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition mx-auto"
      >
        <Settings2 className="h-3 w-3" />
        <span>{vi ? 'Tuỳ chọn nâng cao' : 'Advanced options'}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
      </button>

      {showOptions && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-slate-800/60 pt-3">
          {/* Provider + Model */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {vi ? 'Nhà cung cấp' : 'Provider'}
              </label>
              <div className="flex gap-1.5">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition ${
                      provider === p.id
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                        : 'border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Model
              </label>
              <div className="relative">
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full appearance-none bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/50 transition pr-7 cursor-pointer"
                >
                  {currentProvider.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="h-3 w-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              API Key {vi ? '(tuỳ chọn — ghi đè .env)' : '(optional — overrides .env)'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={currentProvider.keyPlaceholder}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition pr-9 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
