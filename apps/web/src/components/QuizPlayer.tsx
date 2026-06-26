import { useState, useEffect, useRef } from 'react';
import { Timer, ChevronLeft, ChevronRight, Flag, CheckSquare, AlertTriangle, X, List, Columns } from 'lucide-react';
import type { Quiz } from '../App.tsx';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface QuizPlayerProps {
  quiz: Quiz;
  onFinishQuiz: (correctCount: number, totalCount: number, timeTakenStr: string, answers: Record<number, string>, elapsedSeconds: number) => void;
  onExitQuiz: () => void;
  t: any;
  lang: 'vi' | 'en';
}

function QuestionOption({ letter, option, selected, onSelect }: {
  letter: string; option: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect}
      className={`flex items-center text-left p-3 md:p-4 rounded-2xl border text-sm font-medium transition duration-200 cursor-pointer ${
        selected
          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/30'
      }`}>
      <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold mr-3 md:mr-4 shrink-0 transition ${
        selected ? 'bg-indigo-600 text-white border border-indigo-500' : 'bg-slate-900 border border-slate-700 text-slate-500'
      }`}>{letter}</div>
      <span className="leading-relaxed">{option}</span>
    </button>
  );
}

export default function QuizPlayer({
  quiz,
  onFinishQuiz,
  onExitQuiz,
  t,
  lang
}: QuizPlayerProps) {
  const [viewMode, setViewMode] = useState<'step' | 'scroll'>('step');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Self-contained timer — starts when mounted, cleared on unmount
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentQuestion = quiz.questions[currentIndex];

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPct = viewMode === 'scroll'
    ? (answeredCount / quiz.questions.length) * 100
    : ((currentIndex + 1) / quiz.questions.length) * 100;
  const isTimeWarning = elapsedSeconds > 300;

  const handleSelectOption = (questionIndex: number, option: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: option }));
  };

  const handleToggleFlag = (questionIndex: number) => {
    setFlagged(prev => ({ ...prev, [questionIndex]: !prev[questionIndex] }));
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

    onFinishQuiz(correct, quiz.questions.length, timeStr, answers, elapsedSeconds);
  };

  const handleConfirmExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowExitModal(false);
    onExitQuiz();
  };

  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Scroll mode — compact sticky bar */}
        {viewMode === 'scroll' && (
          <div className="sticky top-[72px] z-30 px-3 py-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 font-medium shrink-0">
                {answeredCount}/{quiz.questions.length}
              </span>
              <Progress value={progressPct} className="h-1.5 rounded-full flex-1" />
              <div className={`flex items-center gap-1 text-xs font-mono shrink-0 ${isTimeWarning ? 'text-rose-400' : 'text-indigo-400'}`}>
                <Timer className="h-3.5 w-3.5" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
              <Button variant="ghost" size="icon"
                onClick={() => setViewMode('step')}
                className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-300 shrink-0">
                <Columns className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon"
                onClick={() => setShowExitModal(true)}
                className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-400 shrink-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step mode — full header toolbar */}
        {viewMode === 'step' && (
          <>
            <div className="flex justify-between items-center bg-slate-900/40 border border-slate-800 p-4 rounded-3xl backdrop-blur-sm">
              <Button variant="ghost" onClick={() => setShowExitModal(true)}
                className="rounded-xl flex items-center text-xs text-slate-400 hover:text-slate-200 h-9">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>{t('backBtn')}</span>
              </Button>

              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon"
                  onClick={() => setViewMode('scroll')}
                  className="rounded-xl h-9 w-9 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50">
                  <List className="h-4 w-4" />
                </Button>

                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition ${
                  isTimeWarning
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold animate-pulse'
                    : 'bg-slate-950/60 border-slate-800 text-indigo-400 font-mono'
                }`}>
                  <Timer className="h-4 w-4" />
                  <span className="text-sm">{formatTimer(elapsedSeconds)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>{t('questionOf')} {currentIndex + 1} {t('ofWord')} {quiz.questions.length}</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <Progress value={progressPct} className="h-2 rounded-full" />
            </div>
          </>
        )}

        {/* Step mode — single question at a time */}
        {viewMode === 'step' && (
          <>
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm space-y-6">
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-lg md:text-xl font-bold text-slate-100 leading-normal">
                  {currentQuestion.question}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleFlag(currentIndex)}
                  className={`rounded-xl shrink-0 h-9 w-9 transition ${
                    flagged[currentIndex]
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={t('unflagged')}
                >
                  <Flag className={`h-4 w-4 ${flagged[currentIndex] ? 'fill-amber-400' : ''}`} />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3.5 pt-2">
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
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" disabled={currentIndex === 0} onClick={handleBack}
                className="rounded-2xl border-slate-800 bg-slate-900/20 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30 text-xs px-5 py-5 transition">
                <ChevronLeft className="h-4 w-4 mr-1.5" />
                <span>{t('prev')}</span>
              </Button>

              <div className="hidden sm:flex items-center space-x-1.5">
                {quiz.questions.map((_, qIdx) => {
                  const isAnswered = answers[qIdx] !== undefined;
                  const isQFlagged = flagged[qIdx];
                  const isActive = qIdx === currentIndex;
                  let cls = 'bg-slate-800/80 border-slate-800';
                  if (isActive) cls = 'bg-indigo-500/20 border-indigo-500 scale-110';
                  else if (isQFlagged) cls = 'bg-amber-500/25 border-amber-500/40';
                  else if (isAnswered) cls = 'bg-indigo-600/60 border-indigo-500/30';
                  return (
                    <button key={qIdx} onClick={() => setCurrentIndex(qIdx)}
                      className={`h-6 w-6 rounded-lg border text-[10px] font-bold flex items-center justify-center transition hover:scale-105 duration-200 ${cls}`}>
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              <Button onClick={handleNext}
                className={`rounded-2xl font-bold text-xs px-5 py-5 transition border ${
                  currentIndex === quiz.questions.length - 1
                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-600/10'
                    : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white'
                }`}>
                {currentIndex === quiz.questions.length - 1 ? (
                  <><CheckSquare className="h-4 w-4 mr-1.5" /><span>{t('finishBtn')}</span></>
                ) : (
                  <><span>{t('next')}</span><ChevronRight className="h-4 w-4 ml-1.5" /></>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Scroll mode — all questions in a scrollable list */}
        {viewMode === 'scroll' && (
          <>
            <div className="space-y-5">
              {quiz.questions.map((q, qIdx) => (
                <div key={qIdx}
                  className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-lg space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-0.5 shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <h3 className="text-sm md:text-base font-semibold text-slate-100 leading-normal">{q.question}</h3>
                    </div>
                    <Button variant="ghost" size="icon"
                      onClick={() => handleToggleFlag(qIdx)}
                      className={`rounded-lg shrink-0 h-7 w-7 transition ${
                        flagged[qIdx] ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-600 hover:text-slate-300'
                      }`}>
                      <Flag className={`h-3.5 w-3.5 ${flagged[qIdx] ? 'fill-amber-400' : ''}`} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                </div>
              ))}
            </div>

            <Button onClick={() => setShowSubmitModal(true)}
              className="sticky bottom-0 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-bold py-3.5 shadow-lg shadow-emerald-600/10 transition">
              <CheckSquare className="h-4 w-4 mr-2" />
              <span>{t('finishBtn')}</span>
            </Button>
          </>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <CheckSquare className="h-6 w-6" />
              <h3 className="text-xl font-bold text-slate-100">{t('confirmSubmit')}</h3>
            </div>
            <p className="text-sm text-slate-400">{t('confirmSubmitDesc')}</p>

            {answeredCount < quiz.questions.length && (
              <div className="flex items-start space-x-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/15 p-3 rounded-2xl">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {lang === 'vi'
                    ? `Chú ý: Bạn mới trả lời được ${answeredCount}/${quiz.questions.length} câu.`
                    : `Warning: You answered ${answeredCount} of ${quiz.questions.length} questions.`}
                </span>
              </div>
            )}

            <div className="flex space-x-3 mt-4 justify-end">
              <Button variant="ghost" className="rounded-xl" onClick={() => setShowSubmitModal(false)}>
                {t('cancelBtn')}
              </Button>
              <Button
                onClick={handleSubmitQuiz}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5"
              >
                {t('finishBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100">{t('exitConfirmTitle')}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowExitModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-slate-400">{t('exitConfirmDesc')}</p>
            <div className="flex space-x-3 justify-end">
              <Button variant="ghost" className="rounded-xl" onClick={() => setShowExitModal(false)}>
                {t('cancelBtn')}
              </Button>
              <Button variant="destructive" className="rounded-xl" onClick={handleConfirmExit}>
                {t('exitBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}