import { useEffect, useState } from 'react';
import { RefreshCw, Home, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Quiz } from '../App.tsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ResultsProps {
  quiz: Quiz;
  answers: Record<number, string>;
  elapsedSeconds: number;
  onRetake: () => void;
  onHome: () => void;
  t: any;
}

export default function Results({
  quiz,
  answers,
  elapsedSeconds,
  onRetake,
  onHome,
  t
}: ResultsProps) {
  const [dashOffset, setDashOffset] = useState(471); // Default circumference for r=75 (2*pi*75 ~= 471)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const totalQuestions = quiz.questions.length;
  let correctCount = 0;
  
  quiz.questions.forEach((q, idx) => {
    if (answers[idx] === q.answer) {
      correctCount++;
    }
  });

  const pct = Math.round((correctCount / totalQuestions) * 100);

  // Time taken formatting
  const m = Math.floor(elapsedSeconds / 60);
  const s = elapsedSeconds % 60;
  const timeTakenStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

  // Animate SVG circle on component load
  useEffect(() => {
    const circumference = 2 * Math.PI * 75;
    const offset = circumference - (pct / 100) * circumference;
    
    const timer = setTimeout(() => {
      setDashOffset(offset);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [pct]);

  // Performance feedback evaluation
  let feedbackTitle = t.perfectTitle;
  let feedbackDesc = t.perfectDesc;
  let ringColor = "stroke-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]";

  if (pct < 100 && pct >= 80) {
    feedbackTitle = t.brilliantTitle;
    feedbackDesc = t.brilliantDesc;
    ringColor = "stroke-indigo-400";
  } else if (pct < 80 && pct >= 50) {
    feedbackTitle = t.passedTitle;
    feedbackDesc = t.passedDesc;
    ringColor = "stroke-amber-400";
  } else if (pct < 50) {
    feedbackTitle = t.failedTitle;
    feedbackDesc = t.failedDesc;
    ringColor = "stroke-rose-500";
  }

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Result Hero Panel Card */}
      <Card className="rounded-3xl border-slate-800 bg-slate-900/30 p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t.scoreTitle}</h2>
        
        {/* Animated Circular Score Gauge */}
        <div className="relative w-44 h-44 flex items-center justify-center mt-6">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="88"
              cy="88"
              r="75"
              className="stroke-slate-800/80 fill-none"
              strokeWidth="10"
            />
            {/* Foreground Progress Circle */}
            <circle
              cx="88"
              cy="88"
              r="75"
              className={`fill-none transition-all duration-1000 ease-out ${ringColor}`}
              strokeWidth="10"
              strokeDasharray="471"
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-slate-100 tracking-tight">{pct}%</span>
            <span className="text-xs text-slate-500 font-semibold mt-0.5">{correctCount}/{totalQuestions}</span>
          </div>
        </div>

        {/* Text Feedbacks */}
        <div className="mt-6 space-y-2 max-w-md">
          <h3 className="text-2xl font-black tracking-tight text-slate-100">{feedbackTitle}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{feedbackDesc}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8 border-t border-b border-slate-800/60 py-4 text-xs font-semibold text-slate-500">
          <div className="text-center border-r border-slate-800/40 space-y-1">
            <p className="uppercase tracking-wider text-[10px] text-slate-500">{t.totalTime}</p>
            <p className="text-base font-extrabold text-slate-300">{timeTakenStr}</p>
          </div>
          <div className="text-center space-y-1">
            <p className="uppercase tracking-wider text-[10px] text-slate-500">{t.score}</p>
            <p className="text-base font-extrabold text-slate-300">{correctCount} / {totalQuestions}</p>
          </div>
        </div>

        {/* Hero CTA buttons */}
        <div className="flex flex-wrap justify-center gap-3.5 mt-8 w-full max-w-xs">
          <Button 
            onClick={onRetake}
            className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 transition border border-indigo-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span>{t.retake}</span>
          </Button>
          
          <Button 
            variant="outline"
            onClick={onHome}
            className="flex-1 rounded-2xl border-slate-850 bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 py-5 transition"
          >
            <Home className="h-4 w-4 mr-2" />
            <span>{t.home}</span>
          </Button>
        </div>
      </Card>

      {/* Detailed Review Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-300 flex items-center space-x-2">
          <span>{t.detailsTitle}</span>
        </h3>

        <div className="space-y-3">
          {quiz.questions.map((q, idx) => {
            const userAns = answers[idx];
            const isCorrect = userAns === q.answer;
            const isExpanded = expandedIndex === idx;

            return (
              <div 
                key={idx}
                className={`rounded-2xl border transition duration-200 ${
                  isCorrect 
                    ? 'border-emerald-500/10 bg-emerald-950/5' 
                    : 'border-rose-500/10 bg-rose-950/5'
                }`}
              >
                {/* Accordion Trigger Header */}
                <button
                  onClick={() => toggleExpand(idx)}
                  className="w-full flex items-start justify-between p-4 text-left transition"
                >
                  <div className="flex items-start space-x-3.5 pr-4">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-slate-200 leading-normal">{q.question}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                        <span className="text-slate-500 font-medium">{t.questionOf} {idx + 1}</span>
                        <Badge className={`text-[10px] py-0 px-2 rounded-lg font-bold scale-90 ${
                          isCorrect 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {isCorrect ? t.correct : t.incorrect}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-400 hover:text-slate-200 mt-0.5">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {/* Accordion Expand Panel Content */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-1 border-t border-slate-900/60 space-y-4 text-xs">
                    
                    {/* User Selection vs Right Answer details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className={`p-3 rounded-xl border ${
                        isCorrect 
                          ? 'bg-emerald-950/20 border-emerald-500/15 text-emerald-300' 
                          : 'bg-rose-950/20 border-rose-500/15 text-rose-300'
                      }`}>
                        <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t.yourAns}</p>
                        <p className="font-medium leading-relaxed">{userAns || "---"}</p>
                      </div>
                      
                      {!isCorrect && (
                        <div className="p-3 bg-emerald-950/20 border border-emerald-500/15 text-emerald-300 rounded-xl">
                          <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t.correctAns}</p>
                          <p className="font-medium leading-relaxed">{q.answer}</p>
                        </div>
                      )}
                    </div>

                    {/* Explanations block */}
                    {q.explanation && (
                      <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1 leading-relaxed">
                        <p className="font-bold text-[10px] text-indigo-400 uppercase tracking-wide">{t.explanation}</p>
                        <p className="text-slate-300">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}