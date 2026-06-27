import { useEffect, useState } from 'react';
import { RefreshCw, Home, CheckCircle2, XCircle, ChevronDown, ChevronUp, Clock, Award, Check, AlertCircle, Share2 } from 'lucide-react';
import type { Quiz } from '../App.tsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import RichText from '@/components/ui/RichText';

interface ResultsProps {
  quiz: Quiz;
  answers: Record<number, string>;
  elapsedSeconds: number;
  onRetake: () => void;
  onHome: () => void;
  t: any;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function Results({
  quiz,
  answers,
  elapsedSeconds,
  onRetake,
  onHome,
  t,
  addToast,
}: ResultsProps) {
  const [dashOffset, setDashOffset] = useState(471); // Default circumference for r=75 (2*pi*75 ~= 471)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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

  const handleShare = () => {
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
  };

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
  let feedbackTitle = t('perfectTitle');
  let feedbackDesc = t('perfectDesc');
  let ringColor = "stroke-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
  let ringColorGlow = "rgba(16,185,129,0.15)";

  if (pct < 100 && pct >= 80) {
    feedbackTitle = t('brilliantTitle');
    feedbackDesc = t('brilliantDesc');
    ringColor = "stroke-indigo-500";
    ringColorGlow = "rgba(99,102,241,0.15)";
  } else if (pct < 80 && pct >= 50) {
    feedbackTitle = t('passedTitle');
    feedbackDesc = t('passedDesc');
    ringColor = "stroke-amber-500";
    ringColorGlow = "rgba(245,158,11,0.15)";
  } else if (pct < 50) {
    feedbackTitle = t('failedTitle');
    feedbackDesc = t('failedDesc');
    ringColor = "stroke-rose-500";
    ringColorGlow = "rgba(239,68,68,0.15)";
  }

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Result Hero Panel Card */}
      <Card className="rounded-3xl border border-slate-850 bg-slate-950/25 p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">{t('scoreTitle')}</h2>
        
        {/* Animated Circular Score Gauge */}
        <div className="relative w-44 h-44 flex items-center justify-center mt-6">
          <div 
            className="absolute rounded-full w-36 h-36 blur-xl"
            style={{ backgroundColor: ringColorGlow }}
          />
          <svg className="w-full h-full transform -rotate-90 relative z-10">
            {/* Background Circle */}
            <circle
              cx="88"
              cy="88"
              r="75"
              className="stroke-slate-850 fill-none"
              strokeWidth="9"
            />
            {/* Foreground Progress Circle */}
            <circle
              cx="88"
              cy="88"
              r="75"
              className={`fill-none transition-all duration-1000 ease-out ${ringColor}`}
              strokeWidth="9"
              strokeDasharray="471"
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute flex flex-col items-center justify-center z-25">
            <span className="text-4xl font-black text-white tracking-tight">{pct}%</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{correctCount}/{totalQuestions} {t('correct')}</span>
          </div>
        </div>

        {/* Text Feedbacks */}
        <div className="mt-6 space-y-2.5 max-w-md relative z-10">
          <h3 className="text-2xl font-black tracking-tight text-white">{feedbackTitle}</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">{feedbackDesc}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8 border-t border-b border-slate-900/60 py-5 text-xs font-bold text-slate-500 relative z-10">
          <div className="text-center border-r border-slate-900/60 space-y-1.5">
            <p className="uppercase tracking-widest text-[9px] text-slate-500 font-black">{t('totalTime')}</p>
            <p className="text-lg font-black text-slate-205 flex items-center justify-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span>{timeTakenStr}</span>
            </p>
          </div>
          <div className="text-center space-y-1.5">
            <p className="uppercase tracking-widest text-[9px] text-slate-500 font-black">{t('score')}</p>
            <p className="text-lg font-black text-slate-205 flex items-center justify-center gap-1.5">
              <Award className="h-4 w-4 text-indigo-400" />
              <span>{correctCount} / {totalQuestions}</span>
            </p>
          </div>
        </div>

        {/* Hero CTA buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8 w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Button 
            onClick={onRetake}
            className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 shadow-lg shadow-indigo-600/10 border border-indigo-500 transition duration-200 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 mr-2 animate-spin-hover" />
            <span>{t('retake')}</span>
          </Button>

          <Button 
            variant="outline"
            onClick={handleShare}
            className="flex-1 rounded-2xl border-slate-850 bg-slate-900/10 hover:bg-slate-850 text-slate-350 hover:text-white py-5 transition duration-200 cursor-pointer"
          >
            <Share2 className="h-4 w-4 mr-2 text-indigo-400" />
            <span>{t('shareBtn') || 'Share'}</span>
          </Button>
          
          <Button 
            variant="outline"
            onClick={onHome}
            className="sm:flex-none rounded-2xl border-slate-850 bg-slate-900/10 hover:bg-slate-850 text-slate-350 hover:text-white px-5 py-5 transition duration-200"
            title={t('home')}
          >
            <Home className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </Card>

      {/* Detailed Review Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <span>{t('detailsTitle')}</span>
        </h3>

        <div className="space-y-3.5">
          {quiz.questions.map((q, idx) => {
            const userAns = answers[idx];
            const isCorrect = userAns === q.answer;
            const isExpanded = expandedIndex === idx;

            return (
              <div 
                key={idx}
                className={`rounded-3xl border transition-all duration-300 ${
                  isCorrect 
                    ? 'border-emerald-500/10 bg-emerald-950/5 hover:bg-emerald-950/10' 
                    : 'border-rose-500/10 bg-rose-950/5 hover:bg-rose-950/10'
                }`}
              >
                {/* Accordion Trigger Header */}
                <button
                  onClick={() => toggleExpand(idx)}
                  className="w-full flex items-start justify-between p-4.5 text-left transition cursor-pointer"
                >
                  <div className="flex items-start space-x-3.5 pr-4">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-slate-205 leading-normal">
                        <RichText text={q.question} />
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-2.5 text-xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('questionOf')} {idx + 1}</span>
                        <Badge className={`text-[9px] py-0 px-2 rounded-lg font-black leading-none uppercase ${
                          isCorrect 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shadow-sm' 
                            : 'bg-rose-500/10 text-rose-455 border border-rose-500/15 shadow-sm'
                        }`}>
                          {isCorrect ? t('correct') : t('incorrect')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-500 hover:text-slate-350 shrink-0 transition-transform duration-300 mt-0.5">
                    {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                  </div>
                </button>

                {/* Accordion Expand Panel Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-900/60 space-y-4 text-xs font-semibold">
                    
                    {/* User Selection vs Right Answer details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={`p-3.5 rounded-xl border flex gap-2 ${
                        isCorrect 
                          ? 'bg-emerald-950/20 border-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                          : 'bg-rose-950/20 border-rose-500/15 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                      }`}>
                        <div className="shrink-0 mt-0.5">
                          {isCorrect ? <Check className="h-4 w-4 text-emerald-450" /> : <AlertCircle className="h-4 w-4 text-rose-450" />}
                        </div>
                        <div>
                          <p className="font-bold text-[9px] text-slate-500 uppercase tracking-widest mb-1">{t('yourAns')}</p>
                          <p className="leading-relaxed text-slate-105"><RichText text={userAns || "---"} /></p>
                        </div>
                      </div>
                      
                      {!isCorrect && (
                        <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/15 text-emerald-355 rounded-xl flex gap-2 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                          <Check className="h-4 w-4 text-emerald-450 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-[9px] text-slate-500 uppercase tracking-widest mb-1">{t('correctAns')}</p>
                            <p className="leading-relaxed text-slate-105"><RichText text={q.answer} /></p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Explanations block */}
                    {q.explanation && (
                      <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5 leading-relaxed shadow-inner">
                        <p className="font-bold text-[9px] text-indigo-400 uppercase tracking-widest">{t('explanation')}</p>
                        <p className="text-slate-350 font-medium text-xs leading-relaxed"><RichText text={q.explanation} /></p>
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