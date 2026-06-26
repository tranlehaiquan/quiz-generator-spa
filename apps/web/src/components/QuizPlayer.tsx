import { useState, useEffect, useRef } from 'react';
import { Timer, ChevronLeft, ChevronRight, Flag, CheckSquare, AlertTriangle, X } from 'lucide-react';
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

export default function QuizPlayer({
  quiz,
  onFinishQuiz,
  onExitQuiz,
  t,
  lang
}: QuizPlayerProps) {
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

  const progressPct = ((currentIndex + 1) / quiz.questions.length) * 100;
  const isTimeWarning = elapsedSeconds > 300;

  const handleSelectOption = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: option }));
  };

  const handleToggleFlag = () => {
    setFlagged(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
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

  const isFlagged = flagged[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Header toolbar */}
        <div className="flex justify-between items-center bg-slate-900/40 border border-slate-800 p-4 rounded-3xl backdrop-blur-sm">
          <Button
            variant="ghost"
            onClick={() => setShowExitModal(true)}
            className="rounded-xl flex items-center text-xs text-slate-400 hover:text-slate-200 h-9"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>{t('backBtn')}</span>
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

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>{t('questionOf')} {currentIndex + 1} {t('ofWord')} {quiz.questions.length}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} className="h-2 rounded-full" />
        </div>

        {/* Question Card */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-100 leading-normal">
              {currentQuestion.question}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFlag}
              className={`rounded-xl shrink-0 h-9 w-9 transition ${
                isFlagged
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={t('unflagged')}
            >
              <Flag className={`h-4 w-4 ${isFlagged ? 'fill-amber-400' : ''}`} />
            </Button>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3.5 pt-2">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentIndex] === option;
              const letter = String.fromCharCode(65 + idx);
              return (
                <button
                  key={`${currentIndex}-${idx}`}
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  className={`flex items-center text-left p-4 rounded-2xl border text-sm font-medium transition duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/30'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold mr-4 shrink-0 transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white border border-indigo-500'
                      : 'bg-slate-900 border border-slate-700 text-slate-500'
                  }`}>
                    {letter}
                  </div>
                  <span className="leading-relaxed">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={handleBack}
            className="rounded-2xl border-slate-800 bg-slate-900/20 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30 text-xs px-5 py-5 transition"
          >
            <ChevronLeft className="h-4 w-4 mr-1.5" />
            <span>{t('prev')}</span>
          </Button>

          {/* Question dot indicators */}
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
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => setCurrentIndex(qIdx)}
                  className={`h-6 w-6 rounded-lg border text-[10px] font-bold flex items-center justify-center transition hover:scale-105 duration-200 ${cls}`}
                >
                  {qIdx + 1}
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleNext}
            className={`rounded-2xl font-bold text-xs px-5 py-5 transition border ${
              currentIndex === quiz.questions.length - 1
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-600/10'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white'
            }`}
          >
            {currentIndex === quiz.questions.length - 1 ? (
              <>
                <CheckSquare className="h-4 w-4 mr-1.5" />
                <span>{t('finishBtn')}</span>
              </>
            ) : (
              <>
                <span>{t('next')}</span>
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
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