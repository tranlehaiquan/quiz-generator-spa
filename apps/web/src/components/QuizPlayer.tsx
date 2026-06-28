import { useState, useEffect, useRef } from 'react';
import { Timer, ChevronLeft, ChevronRight, Flag, CheckSquare, AlertTriangle, X, List, Columns, Check } from 'lucide-react';
import type { Quiz } from '../App.tsx';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import RichText from '@/components/ui/RichText';

interface QuizPlayerProps {
  quiz: Quiz;
  onFinishQuiz: (correctCount: number, totalCount: number, timeTakenStr: string, answers: Record<number, string>, elapsedSeconds: number, guestName?: string) => void;
  onExitQuiz: () => void;
  t: any;
  lang: 'vi' | 'en';
  recordMode?: boolean;
}

// Question type badge config
const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  factual:    { label: '📖 Factual',    color: 'bg-blue-500/10 border-blue-500/25 text-blue-400' },
  scenario:   { label: '🧩 Scenario',   color: 'bg-violet-500/10 border-violet-500/25 text-violet-400' },
  debug:      { label: '🐛 Debug',      color: 'bg-rose-500/10 border-rose-500/25 text-rose-400' },
  conceptual: { label: '💡 Conceptual', color: 'bg-amber-500/10 border-amber-500/25 text-amber-400' },
  'fill-in':  { label: '✏️ Fill-in',    color: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' },
};

function QuestionOption({ letter, option, selected, onSelect }: {
  letter: string; option: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center text-left p-3.5 md:p-4 rounded-2xl border text-sm font-semibold transition-all duration-200 cursor-pointer hover:translate-x-1 ${
        selected
          ? 'bg-indigo-600/10 border-indigo-500 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.06)]'
          : 'bg-slate-950/40 border-slate-850 text-slate-350 hover:border-slate-700 hover:bg-slate-900/30'
      }`}
    >
      <div className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-bold mr-3.5 shrink-0 transition-all duration-300 ${
        selected
          ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/20 scale-105 border border-transparent'
          : 'bg-slate-900 border border-slate-800 text-slate-500'
      }`}>
        {selected ? <Check className="h-3.5 w-3.5" /> : letter}
      </div>
      <RichText text={option} className="leading-relaxed flex-1" />
    </button>
  );
}

export default function QuizPlayer({
  quiz,
  onFinishQuiz,
  onExitQuiz,
  t,
  lang,
  recordMode = false,
}: QuizPlayerProps) {
  const [viewMode, setViewMode] = useState<'step' | 'scroll'>(() => {
    const saved = localStorage.getItem('aeroquiz_view_mode');
    return (saved === 'step' || saved === 'scroll') ? saved : 'step';
  });

  const handleSetViewMode = (mode: 'step' | 'scroll') => {
    setViewMode(mode);
    localStorage.setItem('aeroquiz_view_mode', mode);
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [hintVisible, setHintVisible] = useState<Record<number, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [hasStarted, setHasStarted] = useState(!recordMode);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    return localStorage.getItem('aeroquiz_auto_advance') === 'true';
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef(autoAdvance);
  autoAdvanceRef.current = autoAdvance;

  useEffect(() => {
    if (!hasStarted) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted]);

  // Keyboard navigation (step mode only)
  useEffect(() => {
    if (viewMode !== 'step' || !hasStarted) return;

    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFlag(currentIndex);
      } else {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
          const option = currentQuestion.options[num - 1];
          if (option) handleSelectOption(currentIndex, option);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, hasStarted, currentIndex, answers]);

  const currentQuestion = quiz.questions[currentIndex] as (typeof quiz.questions[number] & { type?: string; hint?: string });

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPct = viewMode === 'scroll'
    ? (answeredCount / quiz.questions.length) * 100
    : ((currentIndex + 1) / quiz.questions.length) * 100;
  const isTimeWarning = elapsedSeconds > 600; // 10 min feels more natural than 5

  const handleSelectOption = (questionIndex: number, option: string) => {
    setAnswers(prev => {
      // Don't re-trigger auto-advance if already answered
      if (prev[questionIndex] === option) return prev;
      const next = { ...prev, [questionIndex]: option };

      // Auto-advance in step mode after 600ms
      if (autoAdvanceRef.current && viewMode === 'step' && questionIndex === currentIndex) {
        setTimeout(() => {
          setCurrentIndex(i => {
            if (i < quiz.questions.length - 1) return i + 1;
            return i;
          });
        }, 600);
      }

      return next;
    });
  };

  const handleToggleFlag = (questionIndex: number) => {
    setFlagged(prev => ({ ...prev, [questionIndex]: !prev[questionIndex] }));
  };

  const handleToggleHint = (questionIndex: number) => {
    setHintVisible(prev => ({ ...prev, [questionIndex]: !prev[questionIndex] }));
  };

  const handleToggleAutoAdvance = () => {
    setAutoAdvance(prev => {
      const next = !prev;
      localStorage.setItem('aeroquiz_auto_advance', String(next));
      return next;
    });
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handleSubmitQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowSubmitModal(false);

    let correct = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.answer) correct++;
    });

    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

    onFinishQuiz(correct, quiz.questions.length, timeStr, answers, elapsedSeconds, recordMode ? playerName : undefined);
  };

  const handleConfirmExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowExitModal(false);
    onExitQuiz();
  };

  // ─── Record mode: name entry screen ───────────────────────────────────────
  if (recordMode && !hasStarted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 animate-in fade-in duration-300 relative">
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative">
          <button
            onClick={onExitQuiz}
            className="absolute left-5 top-5 text-slate-500 hover:text-slate-350 transition cursor-pointer"
            title={lang === 'vi' ? 'Quay lại' : 'Back'}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-2 relative z-10 pt-4">
            <h3 className="text-lg font-extrabold text-slate-100">{t('guestInputNameTitle')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {t('guestInputNameDesc')}
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'vi' ? 'Họ và tên của bạn' : 'Your Full Name'}
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={t('guestInputNamePlaceholder')}
                className="w-full px-4 py-3 bg-slate-950/65 border border-slate-850 focus:border-indigo-500/60 rounded-2xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && playerName.trim()) setHasStarted(true);
                }}
              />
            </div>

            <Button
              onClick={() => setHasStarted(true)}
              disabled={!playerName.trim()}
              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6 text-sm transition cursor-pointer shadow-lg shadow-indigo-600/15"
            >
              {t('guestStartBtn')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main quiz UI ──────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* ── Scroll mode: compact sticky bar ── */}
        {viewMode === 'scroll' && (
          <div className="sticky top-[72px] z-30 px-4 py-2 bg-slate-950/85 backdrop-blur-md border border-slate-900 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 font-bold tracking-wider shrink-0 uppercase">
                {answeredCount}/{quiz.questions.length} {lang === 'vi' ? 'XONG' : 'DONE'}
              </span>
              <Progress value={progressPct} className="h-1.5 rounded-full flex-1" />
              <div className={`flex items-center gap-1.5 text-xs font-bold font-mono shrink-0 px-2.5 py-1 rounded-lg border ${
                isTimeWarning ? 'text-rose-400 bg-rose-500/5 border-rose-500/15' : 'text-indigo-400 bg-indigo-500/5 border-indigo-500/15'
              }`}>
                <Timer className="h-3.5 w-3.5" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
              <Button variant="ghost" size="icon"
                onClick={() => handleSetViewMode('step')}
                className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-900 shrink-0 transition">
                <Columns className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon"
                onClick={() => setShowExitModal(true)}
                className="h-8 w-8 rounded-xl text-slate-550 hover:text-rose-400 hover:bg-rose-500/10 shrink-0 transition">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step mode: full header toolbar ── */}
        {viewMode === 'step' && (
          <>
            <div className="flex justify-between items-center bg-slate-900/30 border border-slate-850 p-4 rounded-3xl backdrop-blur-sm shadow-md">
              <Button variant="ghost" onClick={() => setShowExitModal(true)}
                className="rounded-xl flex items-center text-xs font-bold text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900/40 h-9.5 px-3.5">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>{t('backBtn')}</span>
              </Button>

              <div className="flex items-center space-x-2">
                {/* Auto-advance toggle */}
                <button
                  onClick={handleToggleAutoAdvance}
                  title={lang === 'vi' ? 'Tự động chuyển câu' : 'Auto-advance'}
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition ${
                    autoAdvance
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {lang === 'vi' ? 'Tự động' : 'Auto'}
                </button>

                <Button variant="ghost" size="icon"
                  onClick={() => handleSetViewMode('scroll')}
                  className="rounded-xl h-9.5 w-9.5 text-slate-500 hover:text-slate-350 hover:bg-slate-850 transition">
                  <List className="h-4.5 w-4.5" />
                </Button>

                <div className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border transition-all duration-300 font-bold ${
                  isTimeWarning
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                    : 'bg-slate-950/60 border-slate-850 text-indigo-400 font-mono shadow-inner'
                }`}>
                  <Timer className="h-4 w-4" />
                  <span className="text-xs">{formatTimer(elapsedSeconds)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 px-1">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span>{t('questionOf')} {currentIndex + 1} {t('ofWord')} {quiz.questions.length}</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <Progress value={progressPct} className="h-2 rounded-full" />
            </div>
          </>
        )}

        {/* ── Step mode: single question card ── */}
        {viewMode === 'step' && (
          <>
            <div className="bg-slate-950/20 border border-slate-850 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Question header */}
              <div className="flex justify-between items-start gap-4 border-b border-slate-900/60 pb-4">
                <div className="flex-1 space-y-2">
                  {/* Type badge */}
                  {currentQuestion.type && TYPE_BADGE[currentQuestion.type] && (
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wide ${TYPE_BADGE[currentQuestion.type].color}`}>
                      {TYPE_BADGE[currentQuestion.type].label}
                    </span>
                  )}
                  <h3 className="text-lg md:text-xl font-extrabold text-white tracking-tight leading-snug">
                    <RichText text={currentQuestion.question} />
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleFlag(currentIndex)}
                  className={`rounded-xl shrink-0 h-9 w-9 transition-all duration-300 border ${
                    flagged[currentIndex]
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      : 'text-slate-650 border-slate-850 hover:text-slate-400 hover:bg-slate-900'
                  }`}
                  title={flagged[currentIndex] ? t('unflagged') : t('flagged')}
                >
                  <Flag className={`h-4 w-4 ${flagged[currentIndex] ? 'fill-amber-400 text-amber-450' : ''}`} />
                </Button>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3 pt-1">
                {currentQuestion.options.map((option, idx) => (
                  <QuestionOption
                    key={idx}
                    letter={String.fromCharCode(65 + idx)}
                    option={option}
                    selected={answers[currentIndex] === option}
                    onSelect={() => handleSelectOption(currentIndex, option)}
                  />
                ))}
              </div>

              {/* Hint */}
              {currentQuestion.hint && (
                <div className="pt-1">
                  {hintVisible[currentIndex] ? (
                    <div className="text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3 leading-relaxed">
                      💡 <span className="font-semibold text-slate-300">{currentQuestion.hint}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleHint(currentIndex)}
                      className="text-[11px] text-slate-500 hover:text-indigo-400 font-semibold transition underline underline-offset-2"
                    >
                      {lang === 'vi' ? 'Xem gợi ý' : 'Show hint'}
                    </button>
                  )}
                </div>
              )}

              {/* Keyboard shortcut hint */}
              <p className="text-[10px] text-slate-700 text-right select-none">
                {lang === 'vi'
                  ? '← → di chuyển · 1–4 chọn đáp án · F đánh dấu'
                  : '← → navigate · 1–4 select · F flag'}
              </p>
            </div>

            {/* Navigation row */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" disabled={currentIndex === 0} onClick={handleBack}
                className="rounded-2xl border-slate-850 bg-slate-900/15 hover:bg-slate-850 hover:text-slate-100 disabled:opacity-30 text-xs font-bold px-5 py-5.5 transition duration-200">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>{t('prev')}</span>
              </Button>

              {/* Pagination dots — desktop */}
              <div className="hidden sm:flex items-center space-x-1.5 bg-slate-900/20 border border-slate-850/80 px-2 py-1.5 rounded-2xl">
                {quiz.questions.map((_, qIdx) => {
                  const isAnswered = answers[qIdx] !== undefined;
                  const isQFlagged = flagged[qIdx];
                  const isActive = qIdx === currentIndex;
                  let cls = 'bg-slate-950 border-slate-850 text-slate-500';
                  if (isActive) cls = 'bg-indigo-600/20 border-indigo-500 text-indigo-300 scale-110 shadow-md shadow-indigo-500/10 font-black';
                  else if (isQFlagged) cls = 'bg-amber-500/15 border-amber-500/30 text-amber-450';
                  else if (isAnswered) cls = 'bg-indigo-600/15 border-indigo-500/25 text-indigo-350';
                  return (
                    <button key={qIdx} onClick={() => setCurrentIndex(qIdx)}
                      className={`h-7 w-7 rounded-lg border text-[10px] font-bold flex items-center justify-center transition-all duration-200 hover:scale-105 ${cls}`}>
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Pagination — mobile fallback */}
              <div className="sm:hidden text-xs font-bold text-slate-400 tabular-nums">
                {currentIndex + 1} / {quiz.questions.length}
              </div>

              <Button onClick={handleNext}
                className={`rounded-2xl font-bold text-xs px-5 py-5.5 transition border duration-200 cursor-pointer ${
                  currentIndex === quiz.questions.length - 1
                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-550 text-white shadow-lg shadow-emerald-600/10'
                    : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-550 text-white shadow-lg shadow-indigo-600/10'
                }`}>
                {currentIndex === quiz.questions.length - 1 ? (
                  <><CheckSquare className="h-4 w-4 mr-1.5" /><span>{t('finishBtn')}</span></>
                ) : (
                  <><span>{t('next')}</span><ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          </>
        )}

        {/* ── Scroll mode: all questions list ── */}
        {viewMode === 'scroll' && (
          <>
            <div className="space-y-5">
              {quiz.questions.map((q, qIdx) => {
                const qTyped = q as typeof q & { type?: string; hint?: string };
                return (
                  <div key={qIdx}
                    className="bg-slate-950/20 border border-slate-850 rounded-3xl p-5 md:p-6 shadow-md relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex justify-between items-start gap-3 border-b border-slate-900/60 pb-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 rounded-lg px-2.5 py-0.5 shrink-0 mt-0.5 uppercase tracking-wide">
                          {qIdx + 1}
                        </span>
                        <div className="space-y-1 flex-1">
                          {qTyped.type && TYPE_BADGE[qTyped.type] && (
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wide ${TYPE_BADGE[qTyped.type].color}`}>
                              {TYPE_BADGE[qTyped.type].label}
                            </span>
                          )}
                          <h3 className="text-sm md:text-base font-bold text-slate-100 leading-normal">
                            <RichText text={q.question} />
                          </h3>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon"
                        onClick={() => handleToggleFlag(qIdx)}
                        className={`rounded-xl shrink-0 h-8 w-8 border transition ${
                          flagged[qIdx]
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'text-slate-650 border-slate-850 hover:text-slate-400 hover:bg-slate-900'
                        }`}>
                        <Flag className={`h-3.5 w-3.5 ${flagged[qIdx] ? 'fill-amber-400' : ''}`} />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((option, optIdx) => (
                        <QuestionOption
                          key={optIdx}
                          letter={String.fromCharCode(65 + optIdx)}
                          option={option}
                          selected={answers[qIdx] === option}
                          onSelect={() => handleSelectOption(qIdx, option)}
                        />
                      ))}
                    </div>

                    {/* Hint in scroll mode */}
                    {qTyped.hint && (
                      <div>
                        {hintVisible[qIdx] ? (
                          <div className="text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3 leading-relaxed">
                            💡 <span className="font-semibold text-slate-300">{qTyped.hint}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleToggleHint(qIdx)}
                            className="text-[11px] text-slate-500 hover:text-indigo-400 font-semibold transition underline underline-offset-2"
                          >
                            {lang === 'vi' ? 'Xem gợi ý' : 'Show hint'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button onClick={() => setShowSubmitModal(true)}
              className="sticky bottom-4 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-550 text-white font-bold py-4 shadow-lg shadow-emerald-600/15 transition cursor-pointer">
              <CheckSquare className="h-4.5 w-4.5 mr-1.5" />
              <span>{t('finishBtn')}</span>
            </Button>
          </>
        )}
      </div>

      {/* ── Submit Confirmation Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-emerald-450">
              <CheckSquare className="h-6 w-6" />
              <h3 className="text-lg font-extrabold text-slate-100">{t('confirmSubmit')}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">{t('confirmSubmitDesc')}</p>

            {answeredCount < quiz.questions.length && (
              <div className="flex items-start space-x-2 text-xs text-amber-450 bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-2xl">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">
                  {lang === 'vi'
                    ? `Chú ý: Bạn mới trả lời được ${answeredCount}/${quiz.questions.length} câu.`
                    : `Warning: You answered only ${answeredCount} of ${quiz.questions.length} questions.`}
                </span>
              </div>
            )}

            <div className="flex space-x-3.5 mt-4 justify-end border-t border-slate-800/40 pt-3.5">
              <Button variant="ghost" className="rounded-xl border border-transparent hover:bg-slate-850" onClick={() => setShowSubmitModal(false)}>
                {t('cancelBtn')}
              </Button>
              <Button
                onClick={handleSubmitQuiz}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-505 text-white font-bold px-6 shadow-md shadow-emerald-650/10 border border-emerald-550"
              >
                {t('finishBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exit Confirmation Modal ── */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-100">{t('exitConfirmTitle')}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowExitModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">{t('exitConfirmDesc')}</p>
            <div className="flex space-x-3 justify-end border-t border-slate-800/40 pt-3.5">
              <Button variant="ghost" className="rounded-xl border border-transparent hover:bg-slate-850" onClick={() => setShowExitModal(false)}>
                {t('cancelBtn')}
              </Button>
              <Button variant="destructive" className="rounded-xl font-bold shadow-md shadow-rose-600/10 border border-rose-550" onClick={handleConfirmExit}>
                {t('exitBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
