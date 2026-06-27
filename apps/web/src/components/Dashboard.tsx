import { useState, useEffect } from 'react';
import {
  PlayCircle,
  Award,
  Database,
  Trash2,
  Terminal,
  History,
  Calendar,
  Clock,
  HelpCircle,
  Bot,
  FileJson,
  ScanLine,
  Search,
  X,
  ShieldCheck,
  Share2,
  Pencil,
} from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import type { Quiz, HistoryEntry } from '../App.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DashboardProps {
  quizzes: { builtin: Quiz[]; custom: Quiz[] };
  history: HistoryEntry[];
  stats: { playedCount: number; avgScore: number; savedCount: number };
  onStartQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onEditQuiz: (quiz: Quiz) => void;
  onClearHistory: () => void;
  onNavigateToCreate: () => void;
  t: any;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  token?: string | null;
}

export default function Dashboard({
  quizzes,
  history,
  stats,
  onStartQuiz,
  onDeleteQuiz,
  onEditQuiz,
  onClearHistory,
  onNavigateToCreate,
  t,
  addToast,
  token,
}: DashboardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'builtin'>('custom');
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);

  const copyToClipboard = (text: string): Promise<void> => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) resolve();
        else reject(new Error('Fallback copy failed'));
      } catch (err) {
        reject(err);
      }
    });
  };

  const [quizToShare, setQuizToShare] = useState<Quiz | null>(null);
  const [recordScore, setRecordScore] = useState(false);
  const [leaderboardQuiz, setLeaderboardQuiz] = useState<Quiz | null>(null);
  const [guestAttempts, setGuestAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    if (!leaderboardQuiz) return;
    setLoadingAttempts(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/quizzes/${leaderboardQuiz.id}/guest-attempts`, { headers })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGuestAttempts(data);
        else setGuestAttempts([]);
      })
      .catch(() => setGuestAttempts([]))
      .finally(() => setLoadingAttempts(false));
  }, [leaderboardQuiz, token]);

  const handleShareClick = (quiz: Quiz) => {
    if (!quiz.id.startsWith('custom-')) {
      const shareUrl = `${window.location.origin}/player/${quiz.id}`;
      copyToClipboard(shareUrl).then(() => {
        addToast(
          t('shareBtn') || 'Share',
          t('shareSuccess') || 'Link copied to clipboard!',
          'success'
        );
      }).catch(() => {
        addToast('Error', 'Failed to copy share link.', 'error');
      });
      return;
    }
    setQuizToShare(quiz);
    setRecordScore(false);
  };

  const isNewUser = quizzes.custom.length === 0 && history.length === 0;
  const hasActivity = stats.playedCount > 0 || stats.savedCount > 0;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter quizzes based on search query (matching title, description, or tags)
  const filteredCustom = quizzes.custom.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredBuiltin = quizzes.builtin.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isNewUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-500 relative">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-xl w-full text-center flex flex-col gap-3.5 z-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            {t('customGenerator')}
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-md mx-auto">
            {t('welcomeDesc')}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl z-10">
          {/* Paste JSON Card */}
          <button
            type="button"
            onClick={onNavigateToCreate}
            className="group flex flex-col items-start gap-4 rounded-3xl border border-indigo-500/10 bg-slate-900/35 p-7 text-left transition-all duration-300 hover:border-indigo-500/30 hover:bg-slate-900/55 hover:translate-y-[-4px] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] cursor-pointer"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 shadow-md transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-600/25 group-hover:scale-105">
              <Terminal className="size-5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-slate-100 text-base group-hover:text-indigo-300 transition duration-200">{t('pasteJsonBtn')}</span>
              <span className="text-xs text-slate-400 leading-relaxed font-medium">{t('pasteJsonDesc')}</span>
            </div>
            <div className="mt-auto flex items-center gap-3.5 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold">
                <FileJson className="size-3.5 text-slate-650" />
                <span>JSON</span>
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <ScanLine className="size-3.5 text-slate-650" />
                <span>OCR</span>
              </span>
            </div>
          </button>

          {/* AI Generator Card */}
          <button
            type="button"
            onClick={() => router.navigate({ to: '/creator', search: { mode: 'ai' } })}
            className="group flex flex-col items-start gap-4 rounded-3xl border border-purple-500/10 bg-slate-900/35 p-7 text-left transition-all duration-300 hover:border-purple-500/30 hover:bg-slate-900/55 hover:translate-y-[-4px] hover:shadow-[0_8px_30px_rgba(168,85,247,0.08)] cursor-pointer"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-455 shadow-md transition-all duration-300 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-purple-600/25 group-hover:scale-105">
              <Bot className="size-5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-slate-100 text-base group-hover:text-purple-300 transition duration-200">{t('aiCreateBtn')}</span>
              <span className="text-xs text-slate-400 leading-relaxed font-medium">{t('aiCreateDesc')}</span>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs text-purple-400/80 font-bold bg-purple-500/5 border border-purple-500/10 px-2 py-0.5 rounded-lg">
              <span>Smart AI v1.0</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10">
      {/* Quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">{t('customGenerator')}</h2>
          <p className="text-xs text-slate-400 font-medium">{t('customDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={onNavigateToCreate}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9.5 px-4 shadow-md shadow-indigo-600/15 transition border border-indigo-550"
          >
            <Terminal className="size-3.5 mr-1.5" />
            {t('pasteJsonBtn')}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.navigate({ to: '/creator', search: { mode: 'ai' } })}
            className="rounded-xl border-purple-500/20 text-purple-450 bg-purple-500/5 hover:bg-purple-500/10 hover:text-purple-355 h-9.5 px-4 text-xs font-bold transition"
          >
            <Bot className="size-3.5 mr-1.5" />
            {t('aiCreateBtn')}
          </Button>
        </div>
      </div>

      {/* Stats — only when user has activity */}
      {hasActivity && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="rounded-3xl bg-slate-900/20 border-slate-850 p-6 flex flex-col items-center justify-center text-center gap-3.5 transition duration-300 hover:border-slate-800 hover:bg-slate-900/30">
            <div className="p-3.5 bg-indigo-600/10 border border-indigo-500/15 text-indigo-455 rounded-2xl shadow-[0_0_15px_rgba(99,102,241,0.05)]">
              <PlayCircle className="size-5.5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('playedCount')}</p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.playedCount}</p>
            </div>
          </Card>
          <Card className="rounded-3xl bg-slate-900/20 border-slate-850 p-6 flex flex-col items-center justify-center text-center gap-3.5 transition duration-300 hover:border-slate-800 hover:bg-slate-900/30">
            <div className="p-3.5 bg-emerald-600/10 border border-emerald-500/15 text-emerald-455 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <Award className="size-5.5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('avgScore')}</p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.avgScore}%</p>
            </div>
          </Card>
          <Card className="rounded-3xl bg-slate-900/20 border-slate-850 p-6 flex flex-col items-center justify-center text-center gap-3.5 transition duration-300 hover:border-slate-800 hover:bg-slate-900/30">
            <div className="p-3.5 bg-purple-600/10 border border-purple-500/15 text-purple-455 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.05)]">
              <Database className="size-5.5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('savedCount')}</p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.savedCount}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Quizzes & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Quizzes List Area */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-10 py-3 bg-slate-950/40 border border-slate-850 focus:border-indigo-500/50 rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-550/20 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Tabs for Custom vs Built-in */}
          <div className="flex border-b border-slate-900 pb-0.5 space-x-5">
            <button
              onClick={() => setActiveTab('custom')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              {t('customQuizzes')} ({filteredCustom.length})
            </button>
            <button
              onClick={() => setActiveTab('builtin')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'builtin'
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              {t('builtinQuizzes')} ({filteredBuiltin.length})
            </button>
          </div>

          {/* Tab 1: Custom Quizzes */}
          {activeTab === 'custom' && (
            <>
              {filteredCustom.length === 0 ? (
                searchQuery ? (
                  <div className="rounded-3xl border border-slate-900 bg-slate-950/10 p-10 text-center flex flex-col items-center gap-3">
                    <Search className="size-8 text-slate-600 animate-pulse" />
                    <p className="text-xs text-slate-500 font-semibold">{t('searchNoResults')}</p>
                  </div>
                ) : (
                  <div className="rounded-3xl border-2 border-dashed border-slate-800 bg-slate-950/20 p-10 text-center flex flex-col items-center gap-4">
                    <div className="p-4 bg-slate-900/50 rounded-full border border-slate-850">
                      <HelpCircle className="size-8 text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">{t('noCustomQuizzes')}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onNavigateToCreate}
                      className="rounded-xl border-slate-700 hover:bg-slate-800 hover:text-white text-xs font-semibold px-4.5"
                    >
                      {t('createQuiz')}
                    </Button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredCustom.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="rounded-3xl border-slate-855 bg-slate-900/10 hover:bg-slate-900/25 hover:border-slate-800 hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 flex flex-col justify-between"
                    >
                      <CardHeader className="pb-4 pt-5 px-5">
                        {quiz.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {quiz.tags.map((tag) => (
                              <Badge
                                key={tag}
                                className="bg-indigo-950/40 text-indigo-400 border border-indigo-500/10 text-[9px] font-bold rounded-lg px-2 py-0.5 leading-none"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <CardTitle className="text-base font-extrabold text-slate-200 line-clamp-1 leading-snug">{quiz.title}</CardTitle>
                        <CardDescription className="text-slate-400 text-xs line-clamp-2 mt-1 leading-relaxed">
                          {quiz.description}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="pt-3 pb-4 px-5 border-t border-slate-900/50 flex justify-between items-center bg-slate-950/10 rounded-b-3xl">
                        {/* Left: action icon buttons */}
                        <div className="flex items-center gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditQuiz(quiz)}
                            className="rounded-xl text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 h-8 w-8 p-0"
                            title={t('editBtn') || 'Edit'}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setQuizToDelete(quiz)}
                            className="rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0"
                            title={t('deleteBtn')}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleShareClick(quiz)}
                            className="rounded-xl text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 h-8 w-8 p-0"
                            title={t('shareBtn') || 'Share'}
                          >
                            <Share2 className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.navigate({ to: '/leaderboard/$quizId', params: { quizId: quiz.id } })}
                            className="rounded-xl text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 h-8 w-8 p-0"
                            title={t('viewScoresBtn') || 'Leaderboard'}
                          >
                            <Award className="size-3.5" />
                          </Button>
                        </div>
                        {/* Right: question count + play */}
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {quiz.questions.length} {t('questions')}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => onStartQuiz(quiz)}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-8 px-4"
                          >
                            {t('playBtn')}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tab 2: Built-in Quizzes */}
          {activeTab === 'builtin' && (
            <>
              {filteredBuiltin.length === 0 ? (
                <div className="rounded-3xl border border-slate-900 bg-slate-950/10 p-10 text-center flex flex-col items-center gap-3">
                  <Search className="size-8 text-slate-600 animate-pulse" />
                  <p className="text-xs text-slate-500 font-semibold">{t('searchNoResults')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredBuiltin.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="rounded-3xl border-slate-855 bg-slate-900/10 hover:bg-slate-900/25 hover:border-slate-800 hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 flex flex-col justify-between"
                    >
                      <CardHeader className="pb-4 pt-5 px-5">
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          <Badge className="bg-emerald-950/45 text-emerald-400 border border-emerald-500/10 text-[9px] font-bold rounded-lg px-2 py-0.5 leading-none flex items-center gap-1 uppercase tracking-wide">
                            <ShieldCheck className="size-2.5" />
                            <span>Built-in</span>
                          </Badge>
                          {quiz.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className="bg-indigo-950/40 text-indigo-400 border border-indigo-500/10 text-[9px] font-bold rounded-lg px-2 py-0.5 leading-none"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <CardTitle className="text-base font-extrabold text-slate-200 line-clamp-1 leading-snug">{quiz.title}</CardTitle>
                        <CardDescription className="text-slate-400 text-xs line-clamp-2 mt-1 leading-relaxed">
                          {quiz.description}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="pt-3 pb-4 px-5 border-t border-slate-900/50 flex justify-between items-center bg-slate-950/10 rounded-b-3xl">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShareClick(quiz)}
                          className="rounded-xl text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 h-8 w-8 p-0"
                          title={t('shareBtn') || 'Share'}
                        >
                          <Share2 className="size-3.5" />
                        </Button>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {quiz.questions.length} {t('questions')}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => onStartQuiz(quiz)}
                            className="rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs h-8 px-4 border border-indigo-500/20"
                          >
                            {t('playBtn')}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* History timelines section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <History className="size-4.5 text-indigo-400" />
              {t('historyTitle')}
            </h3>
            {history.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearHistory}
                className="text-[10px] uppercase font-bold text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl px-2 h-7"
              >
                <Trash2 className="size-3 mr-1" />
                {t('clearHistoryBtn')}
              </Button>
            )}
          </div>

          <Card className="rounded-3xl border-slate-850 bg-slate-950/20 p-5 max-h-[500px] overflow-y-auto flex flex-col gap-3 custom-scrollbar backdrop-blur-sm">
            {history.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <div className="p-3 bg-slate-900/50 rounded-full border border-slate-850 text-slate-500">
                  <History className="size-6" />
                </div>
                <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed font-medium">{t('noHistory')}</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-800/80 ml-3.5 flex flex-col gap-6 py-2.5">
                {history.map((entry, idx) => {
                  const pct = Math.round((entry.correctCount / entry.totalCount) * 100);
                  let scoreBadgeClass = 'bg-rose-500/10 text-rose-455 border border-rose-500/15';
                  if (pct >= 80) scoreBadgeClass = 'bg-emerald-500/10 text-emerald-455 border border-emerald-500/15';
                  else if (pct >= 50) scoreBadgeClass = 'bg-amber-500/10 text-amber-455 border border-amber-500/15';

                  return (
                    <div key={entry.id || idx} className="relative pl-7 group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-1.5 top-1 size-3 rounded-full bg-slate-950 border-2 border-slate-700 transition duration-300 group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-205 line-clamp-2 leading-relaxed flex-1 group-hover:text-indigo-300 transition duration-200">{entry.quizTitle}</h4>
                          <Badge className={`text-[10px] rounded-lg font-black shrink-0 px-2 py-0.5 border leading-none ${scoreBadgeClass}`}>
                            {entry.correctCount}/{entry.totalCount}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium">
                          <span className="flex items-center">
                            <Calendar className="size-3 mr-1 text-slate-600" />
                            {formatDate(entry.timestamp)}
                          </span>
                          <span className="flex items-center">
                            <Clock className="size-3 mr-1 text-slate-600" />
                            {entry.timeTaken}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-455">
              <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">{t('confirmDeleteTitle')}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {t('confirmDeleteDesc')}
            </p>
            <div className="flex space-x-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setQuizToDelete(null)}
                className="flex-1 rounded-xl border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs py-2 h-9 font-bold cursor-pointer"
              >
                {t('cancelBtn')}
              </Button>
              <Button
                onClick={() => {
                  onDeleteQuiz(quizToDelete.id);
                  setQuizToDelete(null);
                }}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs py-2 h-9 font-bold shadow-md shadow-rose-600/15 border border-rose-550 cursor-pointer"
              >
                {t('deleteBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shareable Settings Modal */}
      {quizToShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <Share2 className="h-4.5 w-4.5 text-indigo-400" />
                <span>{t('shareSettingsTitle')}</span>
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQuizToShare(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {t('shareSettingsDesc')}
            </p>

            <div className="bg-slate-950/65 border border-slate-850 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs font-bold text-slate-200">{t('shareRecordToggle')}</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {t('shareRecordToggleDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={recordScore}
                onChange={(e) => setRecordScore(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/30 accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setQuizToShare(null)}
                className="flex-1 rounded-xl border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs py-2 h-9.5 font-bold cursor-pointer"
              >
                {t('cancelBtn')}
              </Button>
              <Button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/player/${quizToShare.id}${recordScore ? '?record=true' : ''}`;
                  copyToClipboard(shareUrl).then(() => {
                    addToast(
                      t('shareBtn') || 'Share',
                      t('shareSuccess') || 'Link copied to clipboard!',
                      'success'
                    );
                    setQuizToShare(null);
                  }).catch(() => {
                    addToast('Error', 'Failed to copy share link.', 'error');
                  });
                }}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 h-9.5 font-bold shadow-md shadow-indigo-600/15 cursor-pointer border border-indigo-550"
              >
                {t('shareCopyLink')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {leaderboardQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-indigo-400" />
                  <span>{t('guestScoresTitle')}</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-bold max-w-md line-clamp-1">
                  {leaderboardQuiz.title}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setLeaderboardQuiz(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {loadingAttempts ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
                </div>
              ) : guestAttempts.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="p-3 bg-slate-950/60 rounded-full border border-slate-850 text-slate-650">
                    <Award className="size-6" />
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">{t('noGuestScores')}</p>
                </div>
              ) : (
                <div className="border border-slate-850 rounded-2xl overflow-hidden divide-y divide-slate-900 bg-slate-950/30">
                  {guestAttempts.map((attempt) => {
                    const pct = Math.round((attempt.correctCount / attempt.totalCount) * 100);
                    let scoreColor = 'text-rose-450 bg-rose-500/10 border-rose-500/20';
                    if (pct >= 80) scoreColor = 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20';
                    else if (pct >= 50) scoreColor = 'text-amber-450 bg-amber-500/10 border-amber-500/20';

                    return (
                      <div key={attempt.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-950/50 transition">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-200 truncate">{attempt.playerName}</p>
                          <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-2">
                            <span>{attempt.timeTaken}</span>
                            <span className="inline-block w-1 h-1 rounded-full bg-slate-700" />
                            <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                          </p>
                        </div>
                        <Badge className={`text-xs font-black px-2.5 py-1 rounded-xl border shrink-0 ${scoreColor}`}>
                          {attempt.correctCount}/{attempt.totalCount} ({pct}%)
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-850">
              <Button
                onClick={() => setLeaderboardQuiz(null)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 h-9 px-6 font-bold shadow-md shadow-indigo-600/15 cursor-pointer border border-indigo-550"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
