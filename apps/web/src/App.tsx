import { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  BrainCircuit,
  LayoutDashboard,
  PlusCircle,
  HelpCircle,
  Languages,
  X,
  LogIn,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { hc } from 'hono/client';
import type { AppType } from '@aeroquiz/api';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  Link,
  useRouter,
  useRouterState,
  redirect,
} from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { User } from '@/contexts/AuthContext';
import Dashboard from './components/Dashboard.tsx';
import JSONEditor from './components/JSONEditor.tsx';
import QuizPlayer from './components/QuizPlayer.tsx';
import Results from './components/Results.tsx';
import LoginForm from './components/auth/LoginForm.tsx';
import SetupPage from './components/auth/SetupPage.tsx';

import SignupForm from './components/auth/SignupForm.tsx';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import LeaderboardPage from './components/LeaderboardPage.tsx';

// ==========================================
// TYPES & SCHEMAS
// ==========================================
export interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  tags: string[];
  questions: Question[];
}

export interface HistoryEntry {
  id: string;
  quizId: string;
  quizTitle: string;
  correctCount: number;
  totalCount: number;
  timeTaken: string;
  timestamp: number;
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface QuizResult {
  quiz: Quiz;
  answers: Record<number, string>;
  elapsedSeconds: number;
  correctCount: number;
  totalCount: number;
}

// ==========================================
// REACT CONTEXT FOR APP DATA (bypasses TanStack context staleness)
// ==========================================
interface AppData {
  quizzes: { builtin: Quiz[]; custom: Quiz[] };
  history: HistoryEntry[];
  user: User | null;
  token: string | null;
  isAuthLoading: boolean;
  allowSignup: boolean;
  needsSetup: boolean;
  stats: { playedCount: number; avgScore: number; savedCount: number };
  lang: 'vi' | 'en';
  setLang: (l: 'vi' | 'en') => void;
  showHelpModal: boolean;
  setShowHelpModal: React.Dispatch<React.SetStateAction<boolean>>;
  t: TFunction;
}

const AppDataContext = createContext<AppData>({
  quizzes: { builtin: [], custom: [] },
  history: [],
  user: null,
  token: null,
  isAuthLoading: true,
  allowSignup: true,
  needsSetup: false,
  stats: { playedCount: 0, avgScore: 0, savedCount: 0 },
  lang: 'vi',
  setLang: () => {},
  showHelpModal: false,
  setShowHelpModal: () => {},
  t: ((key: string) => key) as any,
});

export function useAppData() {
  return useContext(AppDataContext);
}

// ==========================================
// TANSTACK ROUTER CONTEXT
// ==========================================
interface RouterContext {
  quizzes: { builtin: Quiz[]; custom: Quiz[] };
  history: HistoryEntry[];
  stats: { playedCount: number; avgScore: number; savedCount: number };
  onStartQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onEditQuiz: (quiz: Quiz) => void;
  onClearHistory: () => void;
  onNavigateToCreate: () => void;
  onQuizCreated: (nq: Quiz) => void;
  onQuizUpdated: (nq: Quiz) => void;
  onFinishQuiz: (
    quiz: Quiz,
    correctCount: number,
    totalCount: number,
    timeTakenStr: string,
    answers: Record<number, string>,
    elapsedSeconds: number,
    guestName?: string
  ) => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  t: TFunction;
  lang: 'vi' | 'en';
  setLang: (l: 'vi' | 'en') => void;
  lastResult: QuizResult | null;
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  showHelpModal: boolean;
  setShowHelpModal: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  token: string | null;
  logout: () => void;
  isAuthLoading: boolean;
  allowSignup: boolean;
  needsSetup: boolean;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context, location }) => {
    if (context.needsSetup && location.pathname !== '/setup') {
      throw redirect({ to: '/setup' });
    }
  },
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexComponent,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginComponent,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: ({ context }) => {
    if (!context.allowSignup) {
      throw redirect({ to: '/login' });
    }
  },
  component: SignupComponent,
});

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: SetupComponent,
});

const creatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/creator',
  validateSearch: (search: Record<string, unknown>) => ({
    mode: ((search.mode as string) === 'ai' || (search.mode as string) === 'ocr' ? search.mode : 'json') as string,
  }),
  beforeLoad: ({ context }) => {
    if (!context.isAuthLoading && !context.user) {
      context.addToast(
        context.t('login'),
        context.t('loginRequired'),
        'warning'
      );
      throw redirect({ to: '/login' });
    }
  },
  component: CreatorComponent,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor/$quizId',
  beforeLoad: ({ context }) => {
    if (!context.isAuthLoading && !context.user) {
      context.addToast(
        context.t('login'),
        context.t('loginRequired'),
        'warning'
      );
      throw redirect({ to: '/login' });
    }
  },
  component: EditorComponent,
});

const playerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/player/$quizId',
  component: PlayerComponent,
});

const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/results',
  component: ResultsComponent,
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaderboard/$quizId',
  beforeLoad: ({ context }) => {
    if (!context.isAuthLoading && !context.user) {
      throw redirect({ to: '/login' });
    }
  },
  component: LeaderboardComponent,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  setupRoute,
  creatorRoute,
  editorRoute,
  playerRoute,
  resultsRoute,
  leaderboardRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: undefined as any,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const client = hc<AppType>('/');

// ==========================================
// ROUTE COMPONENTS
// ==========================================
function RootComponent() {
  const context = rootRoute.useRouteContext();
  const routeRouter = useRouter();
  const routerState = useRouterState();
  const { user, isAuthLoading, allowSignup, lang, setLang, showHelpModal, setShowHelpModal, t } = useAppData();
  const isPlaying = routerState.location.pathname.startsWith('/player');
  const isAuthPage = ['/login', '/signup'].includes(routerState.location.pathname);

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white pb-12">
      {/* Navigation Header */}
      <header className="sticky top-0 z-45 w-full border-b border-indigo-500/10 bg-slate-950/70 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => routeRouter.navigate({ to: '/' })}
          >
            <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.1)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] group-hover:border-indigo-500/40 transition-all duration-300">
              <BrainCircuit className="h-5 w-5 text-indigo-400 group-hover:text-indigo-300 transition duration-300" />
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent group-hover:to-indigo-200 transition duration-300">
              AeroQuiz
            </span>
          </div>

          <nav className="flex items-center space-x-2">
            {!isPlaying && !isAuthPage && (
              <>
                <Link
                  to="/"
                  className="rounded-xl flex items-center text-xs sm:text-sm h-9 px-3.5 border border-transparent text-slate-400 hover:text-indigo-300 hover:bg-indigo-600/5 hover:border-indigo-500/10 transition duration-200"
                  activeProps={{ className: 'bg-indigo-600/10 text-indigo-300 border-indigo-500/25 hover:bg-indigo-600/15' }}
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">{t('dashboard')}</span>
                </Link>

                {user && (
                  <>
                    <Link
                      to="/creator"
                      search={{ mode: 'json' }}
                      className="rounded-xl flex items-center text-xs sm:text-sm h-9 px-3.5 border border-transparent text-slate-400 hover:text-indigo-300 hover:bg-indigo-600/5 hover:border-indigo-500/10 transition duration-200"
                      activeProps={{ className: 'bg-indigo-600/10 text-indigo-300 border-indigo-500/25 hover:bg-indigo-600/15' }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      <span className="hidden sm:inline">{t('createQuiz')}</span>
                    </Link>
                  </>
                )}
              </>
            )}

            <div className="h-4 w-px bg-slate-800 mx-2" />

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl h-9 w-9 text-slate-400 hover:text-indigo-300 hover:bg-indigo-600/5 border border-transparent hover:border-indigo-500/10 transition duration-200"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              title="Switch Language"
            >
              <Languages className="h-4 w-4" />
              <span className="text-[9px] font-bold absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-md px-1 py-0.5 border border-indigo-500 scale-75 uppercase">
                {lang}
              </span>
            </Button>

            {!isPlaying && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9 text-slate-400 hover:text-indigo-300 hover:bg-indigo-600/5 border border-transparent hover:border-indigo-500/10 transition duration-200"
                onClick={() => setShowHelpModal(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}

            {!isAuthPage && (
              <>
                {isAuthLoading ? (
                  <div className="h-9 w-9 rounded-xl bg-slate-850/40 animate-pulse" />
                ) : user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 rounded-xl h-9 px-3 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition duration-200"
                    >
                      <div className="h-6.5 w-6.5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-[0_0_10px_rgba(99,102,241,0.25)] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white leading-none">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden sm:inline text-xs font-semibold text-slate-300 max-w-24 truncate">
                        {user.name}
                      </span>
                    </button>

                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                          <div className="px-3 py-2.5 border-b border-slate-800 mb-1">
                            <p className="text-sm font-medium text-slate-100">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          </div>
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              context.logout();
                              routeRouter.navigate({ to: '/' });
                            }}
                            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition duration-200"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>{t('logout')}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Link
                      to="/login"
                      className="rounded-xl flex items-center text-xs sm:text-sm h-8 px-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition duration-200"
                    >
                      <LogIn className="h-4 w-4 mr-1.5" />
                      <span className="hidden sm:inline">{t('login')}</span>
                    </Link>
                    {allowSignup && (
                      <Link
                        to="/signup"
                        className="rounded-xl flex items-center text-xs sm:text-sm h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white transition duration-200"
                      >
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        <span className="hidden sm:inline">{t('signup')}</span>
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 pt-8 max-w-6xl">
        <Outlet />
      </main>

      {/* Sonner Toaster */}
      <Toaster />

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <BrainCircuit className="h-5 w-5 text-indigo-400" />
                <span>{t('helpTitle')}</span>
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setShowHelpModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 py-4 text-sm leading-relaxed text-slate-300">
              <p>{t('helpDesc')}</p>
              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
                <p className="text-slate-200">{t('helpStep1')}</p>
                <p className="text-slate-200">{t('helpStep2')}</p>
                <p className="text-slate-200">{t('helpStep3')}</p>
              </div>
              <p className="text-xs text-indigo-400/80 font-medium">
                AeroQuiz v1.0 · React + TanStack Router + Hono RPC + Tailwind v4
              </p>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                onClick={() => setShowHelpModal(false)}
              >
                {t('helpClose')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IndexComponent() {
  const context = indexRoute.useRouteContext();
  const { quizzes, history, stats, t } = useAppData();
  return (
    <Dashboard
      quizzes={quizzes}
      history={history}
      stats={stats}
      onStartQuiz={context.onStartQuiz}
      onDeleteQuiz={context.onDeleteQuiz}
      onEditQuiz={context.onEditQuiz}
      onClearHistory={context.onClearHistory}
      onNavigateToCreate={context.onNavigateToCreate}
      t={t}
      addToast={context.addToast}
      token={context.token}
    />
  );
}

function LoginComponent() {
  return <LoginForm />;
}

function SignupComponent() {
  return <SignupForm />;
}

function SetupComponent() {
  return <SetupPage />;
}

function CreatorComponent() {
  const context = creatorRoute.useRouteContext();
  const { t, lang } = useAppData();
  const routeRouter = useRouter();
  const { mode } = creatorRoute.useSearch();
  const currentMode: 'json' | 'ai' | 'ocr' = (mode === 'ai' || mode === 'ocr' ? mode : 'json') as 'json' | 'ai' | 'ocr';
  return (
    <JSONEditor
      mode={currentMode}
      onModeChange={(m) => routeRouter.navigate({ to: '/creator', search: { mode: m } })}
      onQuizCreated={context.onQuizCreated}
      onCancel={() => routeRouter.navigate({ to: '/' })}
      addToast={context.addToast}
      t={t}
      lang={lang}
    />
  );
}

function EditorComponent() {
  const context = editorRoute.useRouteContext();
  const { t, lang, quizzes } = useAppData();
  const routeRouter = useRouter();
  const { quizId } = editorRoute.useParams();

  const quiz = quizzes.custom.find(q => q.id === quizId) ?? null;

  if (!quiz) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <JSONEditor
      mode="json"
      onModeChange={() => {}}
      onQuizCreated={context.onQuizCreated}
      onQuizUpdated={context.onQuizUpdated}
      onCancel={() => routeRouter.navigate({ to: '/' })}
      addToast={context.addToast}
      t={t}
      lang={lang}
      editingQuiz={quiz}
    />
  );
}

function LeaderboardComponent() {
  const context = leaderboardRoute.useRouteContext();
  const { lang } = useAppData();
  const routeRouter = useRouter();
  const { quizId } = leaderboardRoute.useParams();

  return (
    <LeaderboardPage
      quizId={quizId}
      token={context.token!}
      onBack={() => routeRouter.navigate({ to: '/' })}
      lang={lang}
    />
  );
}

function PlayerComponent() {
  const context = playerRoute.useRouteContext();
  const { quizId } = playerRoute.useParams();
  const routeRouter = useRouter();
  const { quizzes, t, lang } = useAppData();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const all = [...quizzes.builtin, ...quizzes.custom];
    const found = all.find(q => q.id === quizId);
    if (found) {
      setQuiz(found);
      setLoading(false);
      return;
    }

    client.api.quizzes[':id'].$get({ param: { id: quizId } })
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(data => {
        setQuiz(data as Quiz);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [quizId, quizzes]);

  useEffect(() => {
    if (error) {
      context.addToast("Error", "Quiz not found", "error");
      routeRouter.navigate({ to: '/' });
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500" />
      </div>
    );
  }

  if (!quiz) return null;

  const queryParams = new URLSearchParams(window.location.search);
  const isRecordMode = queryParams.get('record') === 'true';

  return (
    <QuizPlayer
      quiz={quiz}
      onFinishQuiz={(correctCount, totalCount, timeTakenStr, answers, elapsedSeconds, guestName) =>
        context.onFinishQuiz(quiz, correctCount, totalCount, timeTakenStr, answers, elapsedSeconds, guestName)
      }
      onExitQuiz={() => routeRouter.navigate({ to: '/' })}
      t={t}
      lang={lang}
      recordMode={isRecordMode}
    />
  );
}

function ResultsComponent() {
  const context = resultsRoute.useRouteContext();
  const { t } = useAppData();
  const routeRouter = useRouter();

  useEffect(() => {
    if (!context.lastResult) {
      routeRouter.navigate({ to: '/' });
    }
  }, [context.lastResult]);

  if (!context.lastResult) return null;

  return (
    <Results
      quiz={context.lastResult.quiz}
      answers={context.lastResult.answers}
      elapsedSeconds={context.lastResult.elapsedSeconds}
      onRetake={() => context.onStartQuiz(context.lastResult!.quiz)}
      onHome={() => routeRouter.navigate({ to: '/' })}
      t={t}
      addToast={context.addToast}
    />
  );
}

// ==========================================
// CORE APP — ROOT STATE MANAGEMENT
// ==========================================
function AppContent() {
  const auth = useAuth();
  const [quizzes, setQuizzes] = useState<{ builtin: Quiz[]; custom: Quiz[] }>({ builtin: [], custom: [] });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);

  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'en' || i18n.language?.startsWith('en') ? 'en' : 'vi') as 'vi' | 'en';
  const setLang = (l: 'vi' | 'en') => {
    i18n.changeLanguage(l);
  };

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const options = { description: message };
    if (type === 'success') toast.success(title, options);
    else if (type === 'error') toast.error(title, options);
    else if (type === 'warning') toast.warning(title, options);
    else toast(title, options);
  };

  const fetchData = async () => {
    try {
      const headers: Record<string, string> = auth.token ? { Authorization: `Bearer ${auth.token}` } : {};
      const qRes = await client.api.quizzes.$get({}, { headers });
      if (qRes.ok) setQuizzes(await qRes.json() as any);

      if (auth.token) {
        const hRes = await client.api.history.$get({}, { headers });
        if (hRes.ok) setHistory(await hRes.json() as HistoryEntry[]);
      }
    } catch {
      addToast("Connection Error", "Failed to connect to backend server.", "error");
    }
  };

  useEffect(() => {
    if (!auth.isLoading) {
      fetchData();
    }
  }, [auth.isLoading, auth.token]);

  const handleStartQuiz = (quiz: Quiz) => {
    router.navigate({ to: `/player/${quiz.id}` });
    addToast(quiz.title, t('quizStarted'), "info");
  };

  const handleFinishQuiz = async (
    quiz: Quiz,
    correctCount: number,
    totalCount: number,
    timeTakenStr: string,
    answers: Record<number, string>,
    elapsedSeconds: number,
    guestName?: string
  ) => {
    setLastResult({ quiz, answers, elapsedSeconds, correctCount, totalCount });

    if (guestName) {
      try {
        const res = await fetch(`/api/quizzes/${quiz.id}/guest-attempts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: guestName,
            timeTaken: timeTakenStr,
            answers,
          }),
        });
        if (res.ok) {
          const scoreData = await res.json();
          if (scoreData && typeof scoreData.correctCount === 'number') {
            setLastResult({
              quiz,
              answers,
              elapsedSeconds,
              correctCount: scoreData.correctCount,
              totalCount: scoreData.totalCount,
            });
          }
        }
      } catch { /* ignore */ }
    } else if (auth.token) {
      try {
        const res = await client.api.history.$post({
          json: {
            quizId: quiz.id,
            quizTitle: quiz.title,
            correctCount,
            totalCount,
            timeTaken: timeTakenStr,
          }
        }, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (res.ok) fetchData();
      } catch { /* ignore */ }
    }

    router.navigate({ to: '/results' });
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const res = await client.api.quizzes[':id'].$delete(
        { param: { id: quizId } },
        { headers: { Authorization: `Bearer ${auth.token}` } },
      );
      if (res.ok) {
        addToast(t('success'), t('quizDeleted'), "success");
        fetchData();
      } else {
        addToast("Error", "Could not delete this quiz.", "error");
      }
    } catch {
      addToast("Connection Error", "Network error while deleting quiz.", "error");
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await client.api.history.$delete(
        {},
        { headers: { Authorization: `Bearer ${auth.token}` } },
      );
      if (res.ok) {
        setHistory([]);
        addToast(t('success'), t('historyCleared'), "success");
      }
    } catch {
      addToast("Error", "Failed to clear history.", "error");
    }
  };

  const totalAttempts = history.length;
  const avgScorePct = totalAttempts > 0
    ? Math.round(history.reduce((acc, curr) => acc + curr.correctCount / curr.totalCount, 0) / totalAttempts * 100)
    : 0;

  const appData: AppData = {
    quizzes,
    history,
    stats: { playedCount: totalAttempts, avgScore: avgScorePct, savedCount: quizzes.custom.length },
    user: auth.user,
    token: auth.token,
    isAuthLoading: auth.isLoading,
    allowSignup: auth.allowSignup,
    needsSetup: auth.needsSetup,
    lang,
    setLang,
    showHelpModal,
    setShowHelpModal,
    t,
  };

  return (
    <AppDataContext.Provider value={appData}>
      <RouterProvider
        router={router}
        context={{
          quizzes,
          history,
          stats: { playedCount: totalAttempts, avgScore: avgScorePct, savedCount: quizzes.custom.length },
          onStartQuiz: handleStartQuiz,
          onDeleteQuiz: handleDeleteQuiz,
          onEditQuiz: (quiz) => router.navigate({ to: '/editor/$quizId', params: { quizId: quiz.id } }),
          onClearHistory: handleClearHistory,
          onNavigateToCreate: () => router.navigate({ to: '/creator', search: { mode: 'json' } }),
          onQuizCreated: (nq) => {
            addToast(t('quizSaved'), nq.title, "success");
            fetchData();
            handleStartQuiz(nq);
          },
          onQuizUpdated: (nq) => {
            addToast(t('quizUpdated'), nq.title, "success");
            fetchData();
            router.navigate({ to: '/' });
          },
          onFinishQuiz: handleFinishQuiz,
          addToast,
          t,
          lang,
          setLang,
          lastResult,
          toasts,
          setToasts,
          showHelpModal,
          setShowHelpModal,
          user: auth.user,
          token: auth.token,
          logout: auth.logout,
          isAuthLoading: auth.isLoading,
          allowSignup: auth.allowSignup,
          needsSetup: auth.needsSetup,
        }}
      />
    </AppDataContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
