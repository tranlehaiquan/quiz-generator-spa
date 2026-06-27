import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Zap,
  Braces,
  ScanEye,
  Sparkles,
  Plus,
  Trash2,
  ListPlus,
  Info,
} from 'lucide-react';
import type { Quiz, Question } from '../App.tsx';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { hc } from 'hono/client';
import type { AppType } from '@aeroquiz/api';
import { getAuthHeaders } from '@/contexts/AuthContext';
import JsonMode from './creator/JsonMode.tsx';
import OcrMode from './creator/OcrMode.tsx';
import AIGenerator from './AIGenerator.tsx';
import RichText from '@/components/ui/RichText';

const client = hc<AppType>('/');

type InputMode = 'json' | 'ocr' | 'ai';

interface JSONEditorProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  onQuizCreated: (quiz: Quiz) => void;
  onQuizUpdated?: (quiz: Quiz) => void;
  onCancel: () => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  t: (key: string) => string;
  lang: 'vi' | 'en';
  editingQuiz?: Quiz | null;
}

const TEMPLATE_JSON = {
  title: "Đề kiểm tra kiến thức mẫu",
  description: "Liệu bạn có thể đạt điểm tối đa cho chủ đề này không?",
  questions: [
    {
      question: "Ngôn ngữ nào dưới đây KHÔNG phải là ngôn ngữ lập trình?",
      options: ["Python", "Java", "HTML", "C++"],
      answer: "HTML",
      explanation: "HTML là ngôn ngữ đánh dấu siêu văn bản dùng để định nghĩa cấu trúc nội dung hiển thị, không phải là ngôn ngữ lập trình có logic xử lý."
    },
    {
      question: "Cổng mặc định dùng cho lưu lượng web HTTP là gì?",
      options: ["22", "80", "443", "8080"],
      answer: "80",
      explanation: "Cổng 80 là cổng tiêu chuẩn được gán cho lưu lượng web truyền tải không mã hóa qua giao thức HTTP."
    }
  ]
};

export default function JSONEditor({ mode, onModeChange, onQuizCreated, onQuizUpdated, onCancel, addToast, t, lang, editingQuiz }: JSONEditorProps) {
  const isEditMode = !!editingQuiz;
  const [jsonText, setJsonText] = useState(
    editingQuiz
      ? JSON.stringify({ title: editingQuiz.title, description: editingQuiz.description, tags: editingQuiz.tags, questions: editingQuiz.questions }, null, 2)
      : JSON.stringify(TEMPLATE_JSON, null, 2)
  );
  const [isValid, setIsValid] = useState(true);
  const [validationMsg, setValidationMsg] = useState(t('jsonValid'));
  const [hasGenerated, setHasGenerated] = useState(mode === 'json' || isEditMode);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(editingQuiz ?? null);
  const [showQuestions, setShowQuestions] = useState(false);

  useEffect(() => {
    if (!isEditMode) setHasGenerated(mode === 'json');
  }, [mode]);

  const validateSchema = (text: string): Quiz | null => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        setIsValid(false);
        setValidationMsg(t('jsonInvalid'));
        return null;
      }
      setIsValid(true);
      setValidationMsg(t('jsonValid'));
      return parsed;
    } catch {
      setIsValid(false);
      setValidationMsg(t('jsonInvalid'));
      return null;
    }
  };

  const handleLoadTemplate = () => {
    setJsonText(JSON.stringify(TEMPLATE_JSON, null, 2));
    setIsValid(true);
    setValidationMsg(t('jsonValid'));
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setIsValid(true);
      setValidationMsg(t('jsonValid'));
    } catch {
      addToast("JSON Error", lang === 'vi' ? "Không thể định dạng mã JSON bị lỗi cú pháp." : "Could not format invalid JSON.", "error");
    }
  };

  const handleGenerate = async () => {
    const quizData = validateSchema(jsonText);
    if (!quizData) return;

    try {
      const res = await client.api.quizzes.$post({
        json: {
          title: quizData.title,
          description: quizData.description,
          tags: quizData.tags || ["Custom"],
          questions: quizData.questions
        }
      }, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const savedQuiz = await res.json();
        onQuizCreated(savedQuiz);
      } else {
        const errorData = await res.json() as { error?: string };
        addToast("Error", errorData.error || "Failed to save quiz.", "error");
      }
    } catch {
      addToast("Connection Error", "Could not sync quiz with server.", "error");
    }
  };

  const handleScanComplete = (quiz: Quiz & { rawText?: string }) => {
    if (quiz.rawText) {
      setJsonText(JSON.stringify(quiz, null, 2));
      setIsValid(true);
      setValidationMsg(t('jsonValid'));
      setHasGenerated(true);
      onModeChange('json');
      addToast(
        lang === 'vi' ? 'OCR hoàn tất (văn bản thô)' : 'OCR complete (raw text)',
        lang === 'vi' ? 'Không có AI để cấu trúc. Văn bản thô đã được chèn vào editor.' : 'No AI configured for structuring. Raw text placed in editor.',
        'warning'
      );
    } else {
      setPreviewQuiz(quiz);
      addToast(
        lang === 'vi' ? 'Đã quét ảnh thành công!' : 'Image scanned successfully!',
        lang === 'vi' ? 'Xem trước và chỉnh sửa đề thi bên dưới.' : 'Preview and edit your quiz below.',
        'success'
      );
    }
  };

  const handleAIGenerated = (quiz: Quiz) => {
    setPreviewQuiz(quiz);
    addToast(
      lang === 'vi' ? 'AI đã tạo đề thi!' : 'AI generated quiz!',
      lang === 'vi' ? 'Xem trước và chỉnh sửa đề thi bên dưới.' : 'Preview and edit your quiz below.',
      'success'
    );
  };

  // Preview Editor handlers
  const validatePreviewQuiz = (): boolean => {
    if (!previewQuiz) return false;
    for (let i = 0; i < previewQuiz.questions.length; i++) {
      const q = previewQuiz.questions[i];
      if (!q.question.trim()) {
        addToast(lang === 'vi' ? `Lỗi câu hỏi ${i+1}` : `Error Question ${i+1}`, lang === 'vi' ? "Nội dung câu hỏi không được trống." : "Question text cannot be empty.", "warning");
        return false;
      }
      if (q.options.some(opt => !opt.trim())) {
        addToast(lang === 'vi' ? `Lỗi câu hỏi ${i+1}` : `Error Question ${i+1}`, lang === 'vi' ? "Tất cả 4 lựa chọn không được để trống." : "All 4 choices must be filled.", "warning");
        return false;
      }
      if (!q.answer.trim() || !q.options.includes(q.answer)) {
        addToast(lang === 'vi' ? `Lỗi câu hỏi ${i+1}` : `Error Question ${i+1}`, lang === 'vi' ? "Vui lòng chọn 1 lựa chọn làm đáp án đúng (click nút chữ cái)." : "Please select one choice as correct answer (click the letter badge).", "warning");
        return false;
      }
    }
    return true;
  };

  const handleSavePreviewQuiz = async (andPlay: boolean = true) => {
    if (!previewQuiz || !validatePreviewQuiz()) return;

    if (isEditMode && editingQuiz) {
      // UPDATE existing quiz via PUT
      try {
        const res = await fetch(`/api/quizzes/${editingQuiz.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            title: previewQuiz.title,
            description: previewQuiz.description,
            tags: previewQuiz.tags || ['Custom'],
            questions: previewQuiz.questions,
          }),
        });
        if (res.ok) {
          const updated = await res.json() as Quiz;
          addToast(
            lang === 'vi' ? 'Đã cập nhật đề thi!' : 'Quiz updated!',
            previewQuiz.title,
            'success'
          );
          onQuizUpdated?.({ ...updated, id: editingQuiz.id });
          if (!andPlay) onCancel();
        } else {
          const errorData = await res.json() as { error?: string };
          addToast('Error', errorData.error || 'Failed to update quiz.', 'error');
        }
      } catch {
        addToast('Connection Error', 'Could not sync quiz with server.', 'error');
      }
    } else {
      // CREATE new quiz via POST
      try {
        const res = await client.api.quizzes.$post({
          json: {
            title: previewQuiz.title,
            description: previewQuiz.description,
            tags: previewQuiz.tags || ["Custom"],
            questions: previewQuiz.questions,
          }
        }, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const savedQuiz = await res.json();
          onQuizCreated(savedQuiz);
        } else {
          const errorData = await res.json() as { error?: string };
          addToast("Error", errorData.error || "Failed to save quiz.", "error");
        }
      } catch {
        addToast("Connection Error", "Could not sync quiz with server.", "error");
      }
    }
  };


  const updateQuestionText = (qIdx: number, text: string) => {
    if (!previewQuiz) return;
    const updatedQs = [...previewQuiz.questions];
    updatedQs[qIdx].question = text;
    setPreviewQuiz({ ...previewQuiz, questions: updatedQs });
  };

  const updateOptionText = (qIdx: number, optIdx: number, val: string) => {
    if (!previewQuiz) return;
    const updatedQs = [...previewQuiz.questions];
    const oldOptionValue = updatedQs[qIdx].options[optIdx];
    updatedQs[qIdx].options[optIdx] = val;
    // If the old value was set as answer, update answer to keep it matching
    if (updatedQs[qIdx].answer === oldOptionValue) {
      updatedQs[qIdx].answer = val;
    }
    setPreviewQuiz({ ...previewQuiz, questions: updatedQs });
  };

  const setCorrectAnswer = (qIdx: number, val: string) => {
    if (!previewQuiz) return;
    const updatedQs = [...previewQuiz.questions];
    updatedQs[qIdx].answer = val;
    setPreviewQuiz({ ...previewQuiz, questions: updatedQs });
  };

  const updateExplanation = (qIdx: number, text: string) => {
    if (!previewQuiz) return;
    const updatedQs = [...previewQuiz.questions];
    updatedQs[qIdx].explanation = text;
    setPreviewQuiz({ ...previewQuiz, questions: updatedQs });
  };

  const deleteQuestion = (qIdx: number) => {
    if (!previewQuiz) return;
    const updatedQs = previewQuiz.questions.filter((_, i) => i !== qIdx);
    setPreviewQuiz({ ...previewQuiz, questions: updatedQs });
    addToast(
      lang === 'vi' ? 'Đã xoá câu hỏi' : 'Question deleted',
      lang === 'vi' ? `Đã xoá câu hỏi thứ ${qIdx + 1}` : `Removed question number ${qIdx + 1}`,
      'info'
    );
  };

  const addQuestion = () => {
    if (!previewQuiz) return;
    const newQ: Question = {
      question: '',
      options: ['', '', '', ''],
      answer: '',
      explanation: '',
    };
    setPreviewQuiz({
      ...previewQuiz,
      questions: [...previewQuiz.questions, newQ]
    });
    setShowQuestions(true);
    addToast(
      lang === 'vi' ? 'Đã thêm câu hỏi' : 'Question added',
      lang === 'vi' ? 'Đã tạo thêm một câu hỏi trống ở cuối danh sách.' : 'Created an empty question at the end of the list.',
      'success'
    );
  };

  const modes = [
    { id: 'json' as InputMode, icon: Braces, label: lang === 'vi' ? 'JSON Thủ công' : 'Manual JSON' },
    { id: 'ocr' as InputMode, icon: ScanEye, label: lang === 'vi' ? 'Quét ảnh OCR' : 'Scan Image' },
    { id: 'ai' as InputMode, icon: Sparkles, label: lang === 'vi' ? 'Tạo bằng AI' : 'AI Generate' },
  ];

  if (previewQuiz) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
              {isEditMode
                ? (lang === 'vi' ? 'Chỉnh sửa đề thi' : 'Edit Quiz')
                : (lang === 'vi' ? 'Xem trước & Chỉnh sửa đề thi' : 'Review & Edit Quiz')}
            </h2>
            <p className="text-slate-400 text-sm">
              {isEditMode
                ? (lang === 'vi' ? 'Cập nhật nội dung và câu hỏi cho đề thi hiện có.' : 'Update the content and questions for this existing quiz.')
                : (lang === 'vi' ? 'Kiểm tra lại nội dung, cấu trúc trước khi lưu và bắt đầu thi trắc nghiệm.' : 'Review content and structure before saving and starting the quiz.')}
            </p>
          </div>
          <Button 
            variant="ghost" 
            onClick={isEditMode ? onCancel : () => setPreviewQuiz(null)} 
            className="rounded-xl text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900/50"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>{isEditMode ? (lang === 'vi' ? 'Huỷ chỉnh sửa' : 'Cancel Edit') : (lang === 'vi' ? 'Quay lại bộ tạo' : 'Back to Creator')}</span>
          </Button>
        </div>

        {/* General Info Card */}
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-3xl p-6 space-y-5 shadow-lg backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            <span>{lang === 'vi' ? 'Thông tin cơ bản đề thi' : 'Basic Quiz Details'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                {lang === 'vi' ? 'Tiêu đề đề thi' : 'Quiz Title'}
              </label>
              <input
                type="text"
                value={previewQuiz.title}
                onChange={(e) => setPreviewQuiz({ ...previewQuiz, title: e.target.value })}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
                placeholder={lang === 'vi' ? 'Nhập tiêu đề...' : 'Enter title...'}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                {lang === 'vi' ? 'Chủ đề / Thẻ (phân cách bằng dấu phẩy)' : 'Topic Tags (comma separated)'}
              </label>
              <input
                type="text"
                value={previewQuiz.tags ? previewQuiz.tags.join(', ') : ''}
                onChange={(e) => setPreviewQuiz({
                  ...previewQuiz,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
                placeholder="React, CSS, Frontend..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">
              {lang === 'vi' ? 'Mô tả ngắn đề thi' : 'Short Description'}
            </label>
            <textarea
              value={previewQuiz.description}
              onChange={(e) => setPreviewQuiz({ ...previewQuiz, description: e.target.value })}
              className="w-full h-20 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition resize-none custom-scrollbar"
              placeholder={lang === 'vi' ? 'Mô tả ngắn gọn về nội dung hoặc mục đích của đề thi...' : 'Short description about the quiz content or goals...'}
            />
          </div>
        </div>

        {/* Collapsible Questions Area */}
        <div className="border border-slate-800/80 bg-slate-950/20 rounded-3xl p-5 md:p-6 space-y-4 shadow-inner">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="space-y-1.5 flex-1 min-w-[250px]">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ListPlus className="h-4.5 w-4.5 text-indigo-400" />
                <span>{lang === 'vi' ? 'Chi tiết câu hỏi đề thi' : 'Quiz Questions List'} ({previewQuiz.questions.length})</span>
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'vi' 
                  ? 'Mặc định ẩn câu hỏi để giữ tính khách quan khi tự luyện tập. Nhấn "Hiển thị" để chỉnh sửa câu hỏi.' 
                  : 'Questions are hidden by default to keep practice sessions unbiased. Click "Show" to review or edit.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuestions(!showQuestions)}
                className="rounded-xl border-slate-800 text-slate-300 text-xs h-8.5 font-bold transition hover:bg-slate-900 px-4"
              >
                {showQuestions 
                  ? (lang === 'vi' ? 'Ẩn câu hỏi' : 'Hide Questions') 
                  : (lang === 'vi' ? 'Hiển thị câu hỏi' : 'Show Questions')}
              </Button>
              {showQuestions && (
                <Button 
                  onClick={addQuestion} 
                  size="sm"
                  className="rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs h-8.5 font-bold transition px-4"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>{lang === 'vi' ? 'Thêm câu hỏi' : 'Add Question'}</span>
                </Button>
              )}
            </div>
          </div>

          {showQuestions && (
            <div className="space-y-5 border-t border-slate-900/60 pt-5 animate-in fade-in duration-300">
              {previewQuiz.questions.map((q, qIdx) => (
                <div 
                  key={qIdx} 
                  className="bg-slate-950/20 border border-slate-850 hover:border-slate-800 rounded-3xl p-5 md:p-6 shadow-md transition-all duration-300 relative group space-y-4"
                >
                  {/* Question Index & Delete btn */}
                  <div className="flex justify-between items-center border-b border-slate-900/60 pb-3">
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1">
                      {lang === 'vi' ? `CÂU HỎI ${qIdx + 1}` : `QUESTION ${qIdx + 1}`}
                    </span>
                    <Button 
                      onClick={() => deleteQuestion(qIdx)} 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">
                      {lang === 'vi' ? 'Nội dung câu hỏi' : 'Question Content'}
                    </label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                      className="w-full h-18 bg-slate-950/60 border border-slate-850 focus:border-indigo-500/60 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none transition resize-none custom-scrollbar"
                      placeholder={lang === 'vi' ? 'Nhập nội dung câu hỏi trắc nghiệm...' : 'Enter quiz question content...'}
                    />
                    {q.question.trim() && (
                      <div className="mt-1.5 bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-xs text-slate-350">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Preview:</span>
                        <RichText text={q.question} />
                      </div>
                    )}
                  </div>

                  {/* Options Grid */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-400">
                        {lang === 'vi' ? 'Các lựa chọn (chọn nút chữ cái để cài đặt đáp án đúng)' : 'Choices (click letter badge to set as correct answer)'}
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((option, optIdx) => {
                        const isCorrect = q.answer === option && option !== '';
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div 
                            key={optIdx} 
                            className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                              isCorrect 
                                ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                                : 'bg-slate-950/60 border-slate-850 hover:border-slate-800 text-slate-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setCorrectAnswer(qIdx, option)}
                              className={`h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition ${
                                isCorrect 
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                              }`}
                              title={lang === 'vi' ? 'Đặt làm đáp án đúng' : 'Set as correct answer'}
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              value={option}
                              placeholder={lang === 'vi' ? `Lựa chọn ${letter}...` : `Option ${letter}...`}
                              onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                              className="flex-1 bg-transparent border-none p-0 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-0 focus:ring-offset-0"
                            />
                            {isCorrect && (
                              <CheckCircle className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">
                      {lang === 'vi' ? 'Giải thích đáp án (không bắt buộc)' : 'Explanation (optional)'}
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => updateExplanation(qIdx, e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-855 focus:border-indigo-500/60 rounded-xl px-4 py-2.5 text-xs text-slate-300 placeholder:text-slate-750 focus:outline-none transition"
                      placeholder={lang === 'vi' ? 'Giải thích tại sao lựa chọn này đúng...' : 'Explain why this choice is correct...'}
                    />
                    {q.explanation && q.explanation.trim() && (
                      <div className="mt-1.5 bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-xs text-slate-350">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Preview:</span>
                        <RichText text={q.explanation} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Question — bottom shortcut (always visible when questions list is shown or in edit mode) */}
        {(showQuestions || isEditMode) && (
          <button
            type="button"
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-800 hover:border-indigo-500/40 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all duration-200 text-sm font-semibold group"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90" />
            <span>{lang === 'vi' ? 'Thêm câu hỏi mới' : 'Add New Question'}</span>
          </button>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 items-center justify-end border-t border-slate-900/60 pt-6">
          <Button 
            variant="ghost" 
            onClick={isEditMode ? onCancel : () => setPreviewQuiz(null)}
            className="rounded-xl px-6 py-2.5 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900/40"
          >
            {lang === 'vi' ? 'Huỷ' : 'Cancel'}
          </Button>
          {isEditMode ? (
            <Button
              onClick={() => handleSavePreviewQuiz(false)}
              className="rounded-xl px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 border border-indigo-500 transition"
            >
              <Zap className="h-4 w-4 mr-2" />
              <span>{lang === 'vi' ? 'Lưu thay đổi' : 'Save Changes'}</span>
            </Button>
          ) : (
            <Button 
              onClick={() => handleSavePreviewQuiz(true)}
              className="rounded-xl px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 border border-indigo-500 transition"
            >
              <Zap className="h-4 w-4 mr-2" />
              <span>{lang === 'vi' ? 'Lưu & Bắt đầu chơi' : 'Save & Start Playing'}</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
            {t('createQuiz')}
          </h2>
          <p className="text-slate-400 text-sm">{t('creatorDesc')}</p>
        </div>
        <Button variant="ghost" onClick={onCancel} className="rounded-xl text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>{t('backBtn')}</span>
        </Button>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/60">
        {modes.map(m => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Panel */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/15 p-6 shadow-lg">
        {mode === 'json' && (
          <JsonMode
            jsonText={jsonText}
            onJsonChange={setJsonText}
            onLoadTemplate={handleLoadTemplate}
            onFormatJson={handleFormatJson}
            validateSchema={validateSchema}
            t={t}
            lang={lang}
          />
        )}

        {mode === 'ocr' && (
          <OcrMode
            onScanComplete={handleScanComplete}
            addToast={addToast}
            t={t}
            lang={lang}
          />
        )}

        {mode === 'ai' && (
          <div className="animate-in fade-in duration-200">
            <AIGenerator
              onQuizGenerated={handleAIGenerated}
              addToast={addToast}
              lang={lang}
            />
          </div>
        )}
      </div>

      {/* Validation & Submit (Only show in Manual JSON Mode) */}
      {mode === 'json' && (
        <div className="space-y-3">
          <Alert className={`rounded-2xl border ${isValid ? 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400' : 'border-rose-500/20 bg-rose-950/10 text-rose-400'}`}>
            <div className="flex items-start space-x-2">
              {isValid ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div>
                <AlertTitle className="text-xs font-bold uppercase tracking-wider">
                  {isValid ? 'Ready' : 'Invalid'}
                </AlertTitle>
                <AlertDescription className="text-xs mt-1 text-slate-300 font-medium">{validationMsg}</AlertDescription>
              </div>
            </div>
          </Alert>

          <Button
            onClick={handleGenerate}
            disabled={!isValid || !hasGenerated}
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 border border-indigo-500 transition text-base"
          >
            <Zap className="h-4 w-4 mr-2" />
            <span>{t('parsePlay')}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
