import {
  PlayCircle,
  Award,
  Database,
  Trash2,
  Sparkles,
  Terminal,
  History,
  Calendar,
  Clock,
  Layers,
  HelpCircle,
  Bot,
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
  onClearHistory: () => void;
  onNavigateToCreate: () => void;
  t: any;
}

export default function Dashboard({
  quizzes,
  history,
  stats,
  onStartQuiz,
  onDeleteQuiz,
  onClearHistory,
  onNavigateToCreate,
  t
}: DashboardProps) {
  const router = useRouter();
  const hour = new Date().getHours();
  let greeting = t.goodEvening;
  if (hour < 12) greeting = t.goodMorning;
  else if (hour < 18) greeting = t.goodAfternoon;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Greetings Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
            {greeting}
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            {t.customDesc}
          </p>
        </div>
      </div>

      {/* Main Row: Banner and Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Welcome Action Card */}
        <div className="lg:col-span-2 flex flex-col justify-between p-6 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-950/60 border border-indigo-500/15 rounded-3xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition duration-500" />
          
          <div className="space-y-3">
            <Badge className="bg-indigo-500/10 hover:bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 py-1 px-3 text-xs rounded-full">
              {t.customGenerator}
            </Badge>
            <h3 className="text-2xl font-bold text-slate-100 mt-2">{t.customGenerator}</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              {t.customDesc}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button 
              onClick={onNavigateToCreate}
              className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-2 border border-indigo-500 px-5 shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/25 transition"
            >
              <Terminal className="h-4 w-4" />
              <span>{t.pasteJsonBtn}</span>
            </Button>

            <Button
              onClick={() => router.navigate({ to: '/ai' })}
              className="rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold flex items-center space-x-2 border border-amber-500/20 px-5 transition"
            >
              <Bot className="h-4 w-4" />
              <span>{t.aiCreateBtn}</span>
            </Button>

            {quizzes.builtin.length > 0 && (
              <Button 
                variant="secondary"
                onClick={() => onStartQuiz(quizzes.builtin[0])}
                className="rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/50 px-5 transition"
              >
                <Sparkles className="h-4 w-4 text-amber-400 mr-2" />
                <span>{t.tryDemoBtn}</span>
              </Button>
            )}
          </div>
        </div>

        {/* 3 Grid Analytics Column */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          <Card className="rounded-3xl bg-slate-900/40 border-slate-800/80 p-5 flex items-center space-x-4 shadow-md backdrop-blur-sm">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t.playedCount}</p>
              <h4 className="text-2xl font-black text-slate-100 mt-1">{stats.playedCount}</h4>
            </div>
          </Card>

          <Card className="rounded-3xl bg-slate-900/40 border-slate-800/80 p-5 flex items-center space-x-4 shadow-md backdrop-blur-sm">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t.avgScore}</p>
              <h4 className="text-2xl font-black text-slate-100 mt-1">{stats.avgScore}%</h4>
            </div>
          </Card>

          <Card className="rounded-3xl bg-slate-900/40 border-slate-800/80 p-5 flex items-center space-x-4 shadow-md backdrop-blur-sm">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t.savedCount}</p>
              <h4 className="text-2xl font-black text-slate-100 mt-1">{stats.savedCount}</h4>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content Grid: Quizzes & Score Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quiz Lists */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Built-in Quizzes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-300 flex items-center space-x-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <span>{t.builtinQuizzes}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.builtin.map(quiz => (
                <Card 
                  key={quiz.id} 
                  className="rounded-2xl border-slate-800/60 bg-slate-900/20 hover:bg-slate-900/30 shadow-sm transition hover:shadow-md duration-300 flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {quiz.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="bg-slate-800 text-slate-300 text-[10px] rounded-lg">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <CardTitle className="text-base font-bold text-slate-200">{quiz.title}</CardTitle>
                    <CardDescription className="text-slate-400 text-xs line-clamp-2 mt-1">{quiz.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-3 border-t border-slate-800/40 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-medium">
                      {quiz.questions.length} câu hỏi
                    </span>
                    <Button 
                      size="sm"
                      onClick={() => onStartQuiz(quiz)}
                      className="rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-semibold text-xs transition"
                    >
                      {t.playBtn}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Saved Quizzes Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-lg font-bold text-slate-300 flex items-center space-x-2">
              <Database className="h-5 w-5 text-indigo-400" />
              <span>{t.customQuizzes}</span>
            </h3>

            {quizzes.custom.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-500 space-y-3">
                <HelpCircle className="h-8 w-8 mx-auto text-slate-600" />
                <p className="text-xs max-w-sm mx-auto leading-relaxed">{t.noCustomQuizzes}</p>
                <Button 
                  size="sm"
                  variant="outline" 
                  onClick={onNavigateToCreate}
                  className="rounded-xl border-slate-700 hover:bg-slate-800 hover:text-slate-200 text-xs transition mt-2"
                >
                  {t.createQuiz}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.custom.map(quiz => (
                  <Card 
                    key={quiz.id}
                    className="rounded-2xl border-slate-800/60 bg-slate-900/20 hover:bg-slate-900/30 shadow-sm transition hover:shadow-md duration-300 flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {quiz.tags.map(tag => (
                          <Badge key={tag} className="bg-indigo-950/40 text-indigo-400 border border-indigo-500/10 text-[10px] rounded-lg">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <CardTitle className="text-base font-bold text-slate-200">{quiz.title}</CardTitle>
                      <CardDescription className="text-slate-400 text-xs line-clamp-2 mt-1">{quiz.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-3 border-t border-slate-800/40 flex justify-between items-center">
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteQuiz(quiz.id)}
                        className="text-xs rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border hover:border-rose-500/20 transition h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>{t.deleteBtn}</span>
                      </Button>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {quiz.questions.length} câu hỏi
                        </span>
                        <Button 
                          size="sm"
                          onClick={() => onStartQuiz(quiz)}
                          className="rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-semibold text-xs transition"
                        >
                          {t.playBtn}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Score History Log */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-300 flex items-center space-x-2">
              <History className="h-5 w-5 text-indigo-400" />
              <span>{t.historyTitle}</span>
            </h3>
            {history.length > 0 && (
              <Button 
                size="sm"
                variant="ghost"
                onClick={onClearHistory}
                className="text-xs text-slate-500 hover:text-rose-400 transition hover:bg-rose-500/10 rounded-xl"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                <span>{t.clearHistoryBtn}</span>
              </Button>
            )}
          </div>

          <Card className="rounded-3xl border-slate-800 bg-slate-950/40 p-4 max-h-[580px] overflow-y-auto space-y-3 custom-scrollbar">
            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <History className="h-6 w-6 mx-auto text-slate-600" />
                <p className="text-xs max-w-[200px] mx-auto leading-relaxed">{t.noHistory}</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-800/80 ml-3 space-y-5 py-2">
                {history.map((entry, idx) => {
                  const pct = Math.round((entry.correctCount / entry.totalCount) * 100);
                  let scoreBadgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                  if (pct >= 80) scoreBadgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                  else if (pct >= 50) scoreBadgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";

                  return (
                    <div key={entry.id || idx} className="relative pl-6 group">
                      {/* Timeline dot */}
                      <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-slate-800 border border-slate-700 group-hover:bg-indigo-500 group-hover:border-indigo-400 transition" />
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{entry.quizTitle}</h4>
                          <Badge className={`text-[10px] rounded-lg font-bold scale-90 ${scoreBadgeClass}`}>
                            {entry.correctCount}/{entry.totalCount}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-slate-600" />
                            {formatDate(entry.timestamp)}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-slate-600" />
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
    </div>
  );
}