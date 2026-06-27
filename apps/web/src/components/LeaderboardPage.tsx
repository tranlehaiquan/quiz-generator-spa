import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Trophy,
  Clock,
  User,
  BarChart3,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Breakdown {
  index: number;
  question: string;
  options: string[];
  correctAnswer: string;
  playerAnswer: string | null;
  isCorrect: boolean;
  explanation: string | null;
}

interface AttemptDetail {
  attempt: {
    id: string;
    playerName: string;
    correctCount: number;
    totalCount: number;
    timeTaken: string;
    createdAt: string;
  };
  quizTitle: string;
  breakdown: Breakdown[];
}

interface Attempt {
  id: string;
  playerName: string;
  correctCount: number;
  totalCount: number;
  timeTaken: string;
  createdAt: string;
}

interface LeaderboardData {
  quiz: { id: string; title: string; description: string };
  attempts: Attempt[];
}

interface LeaderboardPageProps {
  quizId: string;
  token: string;
  onBack: () => void;
  lang: 'vi' | 'en';
}

function ScoreBadge({ correct, total }: { correct: number; total: number }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  let colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  if (pct >= 80) colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  else if (pct >= 50) colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return (
    <Badge className={`text-xs font-black px-2.5 py-1 rounded-xl border shrink-0 ${colorClass}`}>
      {correct}/{total} ({pct}%)
    </Badge>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-xs font-bold text-slate-500 w-6 text-center">#{rank}</span>;
}

export default function LeaderboardPage({ quizId, token, onBack, lang }: LeaderboardPageProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/quizzes/${quizId}/guest-attempts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, [quizId, token]);

  const handleSelectAttempt = async (attemptId: string) => {
    if (selectedAttemptId === attemptId) {
      setSelectedAttemptId(null);
      setDetail(null);
      return;
    }
    setSelectedAttemptId(attemptId);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/guest-attempts/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!d.error) setDetail(d);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Sort attempts by score desc, then time asc
  const sorted = data
    ? [...data.attempts].sort((a, b) => {
        const aPct = a.correctCount / a.totalCount;
        const bPct = b.correctCount / b.totalCount;
        if (bPct !== aPct) return bPct - aPct;
        // Secondary: parse time (e.g. "47s" → 47)
        const aTime = parseInt(a.timeTaken) || 0;
        const bTime = parseInt(b.timeTaken) || 0;
        return aTime - bTime;
      })
    : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-rose-400 text-sm font-semibold">{error}</p>
        <Button variant="ghost" onClick={onBack} className="rounded-xl text-slate-400">
          <ArrowLeft className="h-4 w-4 mr-2" /> {lang === 'vi' ? 'Quay lại' : 'Go back'}
        </Button>
      </div>
    );
  }

  const totalAttempts = sorted.length;
  const avgScore = totalAttempts > 0
    ? Math.round(sorted.reduce((s, a) => s + (a.correctCount / a.totalCount), 0) / totalAttempts * 100)
    : 0;
  const topScore = totalAttempts > 0
    ? Math.round((sorted[0].correctCount / sorted[0].totalCount) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={onBack}
            className="rounded-xl text-slate-500 hover:text-slate-200 -ml-2 mb-1 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            {lang === 'vi' ? 'Quay lại bảng điều khiển' : 'Back to Dashboard'}
          </Button>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent flex items-center gap-2.5">
            <Award className="h-6 w-6 text-indigo-400 shrink-0" />
            {lang === 'vi' ? 'Bảng điểm công khai' : 'Public Leaderboard'}
          </h1>
          {data && (
            <p className="text-slate-400 text-sm font-medium">{data.quiz.title}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      {totalAttempts > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: User, label: lang === 'vi' ? 'Lượt làm bài' : 'Total Attempts', value: totalAttempts },
            { icon: BarChart3, label: lang === 'vi' ? 'Điểm trung bình' : 'Avg Score', value: `${avgScore}%` },
            { icon: Trophy, label: lang === 'vi' ? 'Điểm cao nhất' : 'Top Score', value: `${topScore}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 text-center">
              <Icon className="h-4 w-4 text-indigo-400 mx-auto mb-1.5" />
              <p className="text-xl font-extrabold text-slate-100">{value}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard table */}
      {totalAttempts === 0 ? (
        <div className="py-20 text-center flex flex-col items-center gap-4">
          <div className="p-4 bg-slate-950/60 rounded-full border border-slate-850 text-slate-600">
            <Award className="size-8" />
          </div>
          <p className="text-sm text-slate-500 font-semibold">
            {lang === 'vi' ? 'Chưa có kết quả làm bài nào.' : 'No attempts recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {lang === 'vi' ? 'Bảng xếp hạng' : 'Rankings'} — {totalAttempts} {lang === 'vi' ? 'lượt' : 'attempts'}
          </h2>
          <div className="border border-slate-800/60 rounded-2xl overflow-hidden divide-y divide-slate-900 bg-slate-950/20">
            {sorted.map((attempt, idx) => {
              const isOpen = selectedAttemptId === attempt.id;
              return (
                <div key={attempt.id}>
                  {/* Row */}
                  <button
                    type="button"
                    onClick={() => handleSelectAttempt(attempt.id)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-900/40 transition-colors duration-150 group"
                  >
                    <RankBadge rank={idx + 1} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                        {attempt.playerName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{attempt.timeTaken}</span>
                        <span className="inline-block w-1 h-1 rounded-full bg-slate-700" />
                        <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                      </p>
                    </div>
                    <ScoreBadge correct={attempt.correctCount} total={attempt.totalCount} />
                    {isOpen
                      ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-slate-600 shrink-0 group-hover:text-slate-400 transition-colors" />
                    }
                  </button>

                  {/* Expandable detail */}
                  {isOpen && (
                    <div className="border-t border-slate-900 bg-slate-950/40 px-5 py-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {loadingDetail ? (
                        <div className="flex justify-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-indigo-500" />
                        </div>
                      ) : detail ? (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                            {lang === 'vi' ? 'Chi tiết từng câu hỏi' : 'Per-Question Breakdown'}
                          </p>
                          <div className="space-y-2">
                            {detail.breakdown.map((item) => (
                              <div
                                key={item.index}
                                className={`rounded-xl border p-3.5 space-y-2.5 ${
                                  item.isCorrect
                                    ? 'border-emerald-500/20 bg-emerald-950/20'
                                    : item.playerAnswer === null
                                    ? 'border-slate-800 bg-slate-950/30'
                                    : 'border-rose-500/20 bg-rose-950/20'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  {item.isCorrect ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                  ) : item.playerAnswer === null ? (
                                    <Minus className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                  )}
                                  <p className="text-xs font-semibold text-slate-200 leading-relaxed flex-1">
                                    <span className="text-[10px] font-bold text-slate-500 mr-1.5">Q{item.index + 1}.</span>
                                    {item.question}
                                  </p>
                                </div>

                                <div className="pl-6.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {item.options.map((opt) => {
                                    const isCorrectOpt = opt === item.correctAnswer;
                                    const isPlayerOpt = opt === item.playerAnswer;
                                    let optClass = 'text-slate-500 bg-slate-950/40 border-slate-800';
                                    if (isCorrectOpt) optClass = 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30 font-bold';
                                    if (isPlayerOpt && !isCorrectOpt) optClass = 'text-rose-400 bg-rose-950/30 border-rose-500/30 font-bold line-through';
                                    return (
                                      <div key={opt} className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border ${optClass}`}>
                                        {isCorrectOpt && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                        {isPlayerOpt && !isCorrectOpt && <XCircle className="h-3 w-3 shrink-0" />}
                                        <span>{opt}</span>
                                        {isCorrectOpt && (
                                          <span className="ml-auto text-[9px] font-black uppercase tracking-wider opacity-70">
                                            {lang === 'vi' ? 'Đúng' : 'Correct'}
                                          </span>
                                        )}
                                        {isPlayerOpt && !isCorrectOpt && (
                                          <span className="ml-auto text-[9px] font-black uppercase tracking-wider opacity-70">
                                            {lang === 'vi' ? 'Đã chọn' : 'Chosen'}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {item.explanation && (
                                  <p className="pl-6.5 text-[11px] text-indigo-300/80 italic leading-relaxed">
                                    💡 {item.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
