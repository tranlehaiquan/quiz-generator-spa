import { createContext, useContext, useState, useEffect } from 'react';
import {
  BrainCircuit,
  LayoutDashboard,
  PlusCircle,
  HelpCircle,
  Languages,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  LogIn,
  UserPlus,
  LogOut,
  Sparkles,
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
import AICreatorPage from './components/AICreatorPage.tsx';
import SignupForm from './components/auth/SignupForm.tsx';

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
  stats: { playedCount: number; avgScore: number; savedCount: number };
}

const AppDataContext = createContext<AppData>({
  quizzes: { builtin: [], custom: [] },
  history: [],
  user: null,
  token: null,
  isAuthLoading: true,
  stats: { playedCount: 0, avgScore: 0, savedCount: 0 },
});

export function useAppData() {
  return useContext(AppDataContext);
}

// ==========================================
// LOCALIZATION
// ==========================================
export const translations = {
  vi: {
    success: "Thành công",
    dashboard: "Trang chủ",
    createQuiz: "Tạo đề thi",
    aiCreate: "AI Tạo đề",
    login: "Đăng nhập",
    signup: "Đăng ký",
    logout: "Đăng xuất",
    goodMorning: "Chào buổi sáng, Sĩ tử!",
    goodAfternoon: "Chào buổi chiều, Sĩ tử!",
    goodEvening: "Chào buổi tối, Sĩ tử!",
    loginRequired: "Vui lòng đăng nhập để sử dụng tính năng này.",
    customGenerator: "Bộ tạo đề thi tự động",
    customDesc: "Dán cấu trúc JSON, tải lên file .json hoặc hình ảnh chụp đề thi để quét và tạo bài làm trắc nghiệm ngay lập tức.",
    pasteJsonBtn: "Dán JSON / Quét đề",
    aiCreateBtn: "Tạo bằng AI",
    tryDemoBtn: "Thử đề mẫu",
    playedCount: "Lượt làm bài",
    avgScore: "Điểm trung bình",
    savedCount: "Đề thi đã lưu",
    builtinQuizzes: "Kho đề thi có sẵn",
    customQuizzes: "Đề thi tự tạo",
    playBtn: "Làm bài",
    deleteBtn: "Xóa",
    noCustomQuizzes: "Bạn chưa có đề thi tự tạo nào. Nhấp vào 'Tạo đề thi' ở thanh điều hướng để bắt đầu!",
    historyTitle: "Lịch sử nộp bài",
    noHistory: "Chưa có kết quả làm bài nào. Hãy thử sức ngay với các đề thi có sẵn hoặc tự tạo!",
    clearHistoryBtn: "Xóa lịch sử",
    date: "Thời gian làm",
    score: "Điểm số",
    timeTaken: "Thời gian làm bài",
    results: "Kết quả",
    correct: "Đúng",
    incorrect: "Sai",
    totalTime: "Tổng thời gian",
    retake: "Làm lại",
    home: "Trang chủ",
    exitConfirmTitle: "Bạn có muốn thoát?",
    exitConfirmDesc: "Tiến trình làm bài hiện tại sẽ bị hủy và không lưu vào lịch sử.",
    exitBtn: "Thoát bài thi",
    cancelBtn: "Hủy bỏ",
    helpTitle: "Hướng dẫn sử dụng AeroQuiz",
    helpDesc: "AeroQuiz hỗ trợ làm bài trắc nghiệm thông minh và quét/tạo đề thi cực kỳ nhanh chóng:",
    helpStep1: "1. Tải lên mã JSON chứa danh sách câu hỏi trắc nghiệm của riêng bạn.",
    helpStep2: "2. Hoặc kéo thả hình ảnh/ảnh chụp đề thi lên để hệ thống phân tích OCR tự động thành đề thi.",
    helpStep3: "3. Thống kê điểm số và lịch sử làm bài được lưu trữ và hiển thị trực tiếp trên dashboard.",
    helpClose: "Đóng",
    editorTitle: "Cấu trúc đề thi (JSON)",
    scanZone: "Kéo thả ảnh đề thi vào đây hoặc bấm để chọn file",
    scanSupport: "Hỗ trợ file ảnh JPG, JPEG, PNG. Quét OCR thông minh bằng AI",
    loadTemplate: "Tải mẫu",
    formatJson: "Định dạng",
    parsePlay: "Bắt đầu làm bài",
    jsonValid: "Cấu trúc JSON hợp lệ",
    jsonInvalid: "Mã JSON không hợp lệ. Vui lòng kiểm tra lại dấu đóng mở ngoặc hoặc phẩy.",
    scanning: "Đang tải ảnh và xử lý quét OCR...",
    scanSuccess: "Đã quét ảnh và trích xuất đề thi thành công!",
    scanError: "Tải ảnh hoặc quét thất bại. Vui lòng kiểm tra file ảnh hoặc thử lại.",
    creatorDesc: "Tự tạo đề thi bằng cách chỉnh sửa trực tiếp JSON hoặc tải hình ảnh lên quét.",
    backBtn: "Quay lại",
    schemaHelp: "Cấu trúc JSON phải chứa các trường: 'title', 'description', và 'questions' (danh sách chứa 'question', 'options', 'answer', 'explanation').",
    questionOf: "Câu hỏi",
    ofWord: "trên",
    flagged: "Đã đánh dấu",
    unflagged: "Đánh dấu câu",
    finishBtn: "Nộp bài",
    prev: "Câu trước",
    next: "Câu sau",
    unansweredWarning: "Bạn chưa hoàn thành hết tất cả câu hỏi!",
    timerWarning: "Bạn đã làm bài được một khoảng thời gian khá lâu!",
    confirmSubmit: "Nộp bài thi",
    confirmSubmitDesc: "Bạn có chắc muốn kết thúc bài làm trắc nghiệm này?",
    scoreTitle: "Kết quả làm bài",
    perfectTitle: "Điểm tuyệt đối! 🌟",
    perfectDesc: "Thật không thể tin nổi! Bạn đã hoàn thành xuất sắc tất cả câu hỏi trắc nghiệm.",
    brilliantTitle: "Kết quả tuyệt vời! 🎉",
    brilliantDesc: "Rất tốt! Bạn nắm vững hầu như toàn bộ kiến thức của đề thi này.",
    passedTitle: "Đạt yêu cầu! 👍",
    passedDesc: "Chúc mừng bạn đã vượt qua, tuy nhiên vẫn còn một số câu hỏi cần cải thiện.",
    failedTitle: "Cần cố gắng thêm! 💪",
    failedDesc: "Chưa đạt yêu cầu. Bạn hãy đọc kỹ phần giải thích chi tiết đáp án bên dưới.",
    detailsTitle: "Giải thích đáp án chi tiết",
    yourAns: "Lựa chọn của bạn",
    correctAns: "Đáp án đúng",
    explanation: "Giải thích chi tiết",
    actions: "Hành động",
  },
  en: {
    success: "Success",
    dashboard: "Dashboard",
    createQuiz: "Create Quiz",
    aiCreate: "AI Create",
    login: "Sign In",
    signup: "Sign Up",
    logout: "Sign Out",
    goodMorning: "Good Morning, Quizzer!",
    goodAfternoon: "Good Afternoon, Quizzer!",
    goodEvening: "Good Evening, Quizzer!",
    loginRequired: "Please sign in to use this feature.",
    customGenerator: "Custom Quiz Generator",
    customDesc: "Paste a raw JSON template, import a .json file, or upload a quiz screenshot to scan and generate a playable test instantly.",
    pasteJsonBtn: "Paste JSON / Scan Quiz",
    aiCreateBtn: "Create with AI",
    tryDemoBtn: "Try Built-in Demo",
    playedCount: "Attempts",
    avgScore: "Average Score",
    savedCount: "Saved Quizzes",
    builtinQuizzes: "Built-in Quizzes",
    customQuizzes: "Your Custom Quizzes",
    playBtn: "Play",
    deleteBtn: "Delete",
    noCustomQuizzes: "No custom quizzes yet. Click 'Create Quiz' to generate one!",
    historyTitle: "Score History",
    noHistory: "No attempts recorded yet. Take a quiz to view statistics!",
    clearHistoryBtn: "Clear History",
    date: "Completed At",
    score: "Score",
    timeTaken: "Duration",
    results: "Results",
    correct: "Correct",
    incorrect: "Incorrect",
    totalTime: "Total Time",
    retake: "Retake",
    home: "Home",
    exitConfirmTitle: "Are you sure you want to exit?",
    exitConfirmDesc: "Your current progress will be lost and not saved to history.",
    exitBtn: "Exit Quiz",
    cancelBtn: "Cancel",
    helpTitle: "AeroQuiz User Guide",
    helpDesc: "AeroQuiz is an interactive player and instant custom quiz creator:",
    helpStep1: "1. Paste a valid formatted JSON structure containing quizzes.",
    helpStep2: "2. Or drag and drop any screenshot of a quiz, and the AI OCR scanner will parse it.",
    helpStep3: "3. Results and historical performance are automatically stored and rendered.",
    helpClose: "Close",
    editorTitle: "Quiz Structure (JSON)",
    scanZone: "Drag & drop quiz image here, or click to upload",
    scanSupport: "Supports JPG, JPEG, PNG. Smart AI OCR scan simulation",
    loadTemplate: "Load Template",
    formatJson: "Format",
    parsePlay: "Parse & Play",
    jsonValid: "JSON structure is valid",
    jsonInvalid: "Invalid JSON format. Check closing brackets, quotes or commas.",
    scanning: "Uploading and processing OCR scan...",
    scanSuccess: "Quiz image scanned and converted successfully!",
    scanError: "Scan failed. Please verify the image file format and try again.",
    creatorDesc: "Create custom quizzes by editing JSON directly or scanning images.",
    backBtn: "Back",
    schemaHelp: "JSON must contain 'title', 'description', and 'questions' array (each with 'question', 'options', 'answer', 'explanation').",
    questionOf: "Question",
    ofWord: "of",
    flagged: "Flagged",
    unflagged: "Flag question",
    finishBtn: "Finish",
    prev: "Previous",
    next: "Next",
    unansweredWarning: "You still have unanswered questions!",
    timerWarning: "The timer has been running for a long time!",
    confirmSubmit: "Submit Quiz",
    confirmSubmitDesc: "Are you sure you want to submit your answers now?",
    scoreTitle: "Test Performance",
    perfectTitle: "Perfect Score! 🌟",
    perfectDesc: "Amazing! You achieved a perfect score on this test.",
    brilliantTitle: "Brilliant Work! 🎉",
    brilliantDesc: "Excellent job! You answered almost all questions correctly.",
    passedTitle: "Passed! 👍",
    passedDesc: "You passed! But there are still areas you can review.",
    failedTitle: "Keep Practicing! 💪",
    failedDesc: "Failed. Take a look at the detailed answer explanations below.",
    detailsTitle: "Detailed Explanations",
    yourAns: "Your answer",
    correctAns: "Correct answer",
    explanation: "Explanation",
    actions: "Actions",
  }
};

// ==========================================
// TANSTACK ROUTER CONTEXT
// ==========================================
interface RouterContext {
  quizzes: { builtin: Quiz[]; custom: Quiz[] };
  history: HistoryEntry[];
  stats: { playedCount: number; avgScore: number; savedCount: number };
  onStartQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onClearHistory: () => void;
  onNavigateToCreate: () => void;
  onQuizCreated: (nq: Quiz) => void;
  onFinishQuiz: (
    quiz: Quiz,
    correctCount: number,
    totalCount: number,
    timeTakenStr: string,
    answers: Record<number, string>,
    elapsedSeconds: number
  ) => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  t: any;
  lang: 'vi' | 'en';
  setLang: React.Dispatch<React.SetStateAction<'vi' | 'en'>>;
  lastResult: QuizResult | null;
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  showHelpModal: boolean;
  setShowHelpModal: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  token: string | null;
  logout: () => void;
  isAuthLoading: boolean;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
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
  component: SignupComponent,
});

const creatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/creator',
  beforeLoad: ({ context }) => {
    if (!context.isAuthLoading && !context.user) {
      context.addToast(
        context.t.login,
        context.t.loginRequired,
        'warning'
      );
      throw redirect({ to: '/login' });
    }
  },
  component: CreatorComponent,
});

const aiCreatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai',
  beforeLoad: ({ context }) => {
    if (!context.isAuthLoading && !context.user) {
      context.addToast(
        context.t.login,
        context.t.loginRequired,
        'warning'
      );
      throw redirect({ to: '/login' });
    }
  },
  component: AICreatorComponent,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  creatorRoute,
  aiCreatorRoute,
  playerRoute,
  resultsRoute,
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
  const { user, isAuthLoading } = useAppData();
  const isPlaying = routerState.location.pathname.startsWith('/player');
  const isAuthPage = ['/login', '/signup', '/ai'].includes(routerState.location.pathname);

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white pb-12">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-indigo-500/10 bg-slate-950/70 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => routeRouter.navigate({ to: '/' })}
          >
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-pulse">
              <BrainCircuit className="h-6 w-6 text-indigo-400" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              AeroQuiz
            </span>
          </div>

          <nav className="flex items-center space-x-2">
            {!isPlaying && !isAuthPage && (
              <>
                <Link
                  to="/"
                  className="rounded-xl flex items-center text-xs sm:text-sm h-8 px-3.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition duration-200"
                  activeProps={{ className: 'bg-slate-800 text-slate-100 hover:bg-slate-800' }}
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">{context.t.dashboard}</span>
                </Link>

                {user && (
                  <>
                    <Link
                      to="/creator"
                      className="rounded-xl flex items-center text-xs sm:text-sm h-8 px-3.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition duration-200"
                      activeProps={{ className: 'bg-slate-800 text-slate-100 hover:bg-slate-800' }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      <span className="hidden sm:inline">{context.t.createQuiz}</span>
                    </Link>
                    <Link
                      to="/ai"
                      className="rounded-xl flex items-center text-xs sm:text-sm h-8 px-3.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition duration-200"
                      activeProps={{ className: 'bg-slate-800 text-slate-100 hover:bg-slate-800' }}
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      <span className="hidden sm:inline">{context.t.aiCreate}</span>
                    </Link>
                  </>
                )}
              </>
            )}

            <div className="h-4 w-px bg-slate-800 mx-2" />

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl h-9 w-9 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              onClick={() => context.setLang(prev => prev === 'vi' ? 'en' : 'vi')}
              title="Switch Language"
            >
              <Languages className="h-4 w-4" />
              <span className="text-[10px] font-bold absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-md px-1 py-0.5 border border-indigo-500 scale-75 uppercase">
                {context.lang}
              </span>
            </Button>

            {!isPlaying && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                onClick={() => context.setShowHelpModal(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}

            {!isAuthPage && (
              <>
                {isAuthLoading ? (
                  <div className="h-8 w-8 rounded-xl bg-slate-800/30 animate-pulse" />
                ) : user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 rounded-xl h-9 px-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition duration-200"
                    >
                      <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-slate-300 max-w-24 truncate">
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
                            <span>{context.t.logout}</span>
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
                      <span className="hidden sm:inline">{context.t.login}</span>
                    </Link>
                    <Link
                      to="/signup"
                      className="rounded-xl flex items-center text-xs sm:text-sm h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white transition duration-200"
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      <span className="hidden sm:inline">{context.t.signup}</span>
                    </Link>
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

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {context.toasts.map(toast => {
          let typeColorClass = "border-indigo-500/20 bg-slate-900/90 text-indigo-400";
          let Icon = Info;
          if (toast.type === 'success') {
            typeColorClass = "border-emerald-500/25 bg-emerald-950/80 text-emerald-400";
            Icon = CheckCircle2;
          } else if (toast.type === 'warning') {
            typeColorClass = "border-amber-500/25 bg-amber-950/80 text-amber-400";
            Icon = AlertTriangle;
          } else if (toast.type === 'error') {
            typeColorClass = "border-rose-500/25 bg-rose-950/80 text-rose-400";
            Icon = AlertTriangle;
          }
          return (
            <div
              key={toast.id}
              className={`p-4 rounded-2xl border backdrop-blur-xl pointer-events-auto flex items-start space-x-3 shadow-2xl transition duration-300 animate-in fade-in slide-in-from-right-5 ${typeColorClass}`}
            >
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <p className="font-bold text-sm text-slate-100">{toast.title}</p>
                <p className="text-xs opacity-90 leading-normal">{toast.message}</p>
              </div>
              <button
                onClick={() => context.setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Help Modal */}
      {context.showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <BrainCircuit className="h-5 w-5 text-indigo-400" />
                <span>{context.t.helpTitle}</span>
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => context.setShowHelpModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 py-4 text-sm leading-relaxed text-slate-300">
              <p>{context.t.helpDesc}</p>
              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
                <p className="text-slate-200">{context.t.helpStep1}</p>
                <p className="text-slate-200">{context.t.helpStep2}</p>
                <p className="text-slate-200">{context.t.helpStep3}</p>
              </div>
              <p className="text-xs text-indigo-400/80 font-medium">
                AeroQuiz v1.0 · React + TanStack Router + Hono RPC + Tailwind v4
              </p>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                onClick={() => context.setShowHelpModal(false)}
              >
                {context.t.helpClose}
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
  const { quizzes, history, stats } = useAppData();
  return (
    <Dashboard
      quizzes={quizzes}
      history={history}
      stats={stats}
      onStartQuiz={context.onStartQuiz}
      onDeleteQuiz={context.onDeleteQuiz}
      onClearHistory={context.onClearHistory}
      onNavigateToCreate={context.onNavigateToCreate}
      t={context.t}
    />
  );
}

function LoginComponent() {
  return <LoginForm />;
}

function SignupComponent() {
  return <SignupForm />;
}

function CreatorComponent() {
  const context = creatorRoute.useRouteContext();
  const routeRouter = useRouter();
  return (
    <JSONEditor
      onQuizCreated={context.onQuizCreated}
      onCancel={() => routeRouter.navigate({ to: '/' })}
      addToast={context.addToast}
      t={context.t}
      lang={context.lang}
    />
  );
}

function AICreatorComponent() {
  const context = aiCreatorRoute.useRouteContext();
  return (
    <AICreatorPage
      addToast={context.addToast}
      lang={context.lang}
    />
  );
}

function PlayerComponent() {
  const context = playerRoute.useRouteContext();
  const { quizId } = playerRoute.useParams();
  const routeRouter = useRouter();
  const { quizzes } = useAppData();

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

  return (
    <QuizPlayer
      quiz={quiz}
      onFinishQuiz={(correctCount, totalCount, timeTakenStr, answers, elapsedSeconds) =>
        context.onFinishQuiz(quiz, correctCount, totalCount, timeTakenStr, answers, elapsedSeconds)
      }
      onExitQuiz={() => routeRouter.navigate({ to: '/' })}
      t={context.t}
      lang={context.lang}
    />
  );
}

function ResultsComponent() {
  const context = resultsRoute.useRouteContext();
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
      t={context.t}
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
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);

  const t = translations[lang];

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
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
    addToast(quiz.title, lang === 'vi' ? "Đã bắt đầu làm bài!" : "Quiz started!", "info");
  };

  const handleFinishQuiz = async (
    quiz: Quiz,
    correctCount: number,
    totalCount: number,
    timeTakenStr: string,
    answers: Record<number, string>,
    elapsedSeconds: number
  ) => {
    setLastResult({ quiz, answers, elapsedSeconds, correctCount, totalCount });

    if (auth.token) {
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
        addToast(t.success, lang === 'vi' ? "Đã xóa đề thi!" : "Quiz deleted!", "success");
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
        addToast(t.success, lang === 'vi' ? "Đã xóa toàn bộ lịch sử!" : "History cleared!", "success");
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
          onClearHistory: handleClearHistory,
          onNavigateToCreate: () => router.navigate({ to: '/creator' }),
          onQuizCreated: (nq) => {
            addToast(lang === 'vi' ? "Đã lưu đề thi!" : "Quiz saved!", nq.title, "success");
            fetchData();
            handleStartQuiz(nq);
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
