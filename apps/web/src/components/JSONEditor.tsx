import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  FileJson,
  Code2,
  UploadCloud,
  FileUp,
  Info,
  AlertTriangle,
  CheckCircle,
  Zap,
  Copy,
  Sparkles
} from 'lucide-react';
import type { Quiz } from '../App.tsx';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { hc } from 'hono/client';
import type { AppType } from '@aeroquiz/api';
import { getAuthHeaders } from '@/contexts/AuthContext';
import AIGenerator from './AIGenerator.tsx';

const client = hc<AppType>('/');

// Prefilled templates
const TEMPLATE_VALUE_VI = {
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

const TEMPLATE_VALUE_EN = {
  title: "My Amazing Custom Quiz",
  description: "Can you score a perfect 100% on this topic?",
  questions: [
    {
      question: "Which of the following is NOT a programming language?",
      options: ["Python", "Java", "HTML", "C++"],
      answer: "HTML",
      explanation: "HTML is a markup language used for structural layout, not a logical programming language."
    },
    {
      question: "What is the default port for HTTP traffic?",
      options: ["22", "80", "443", "8080"],
      answer: "80",
      explanation: "Port 80 is the default port designated for unencrypted HTTP web traffic. Port 443 is for secure HTTPS."
    }
  ]
};

const SCHEMA_EXAMPLE_VI = {
  title: "Tiêu đề đề thi trắc nghiệm",
  description: "Mô tả ngắn gọn về đề thi này",
  tags: ["Chủ đề"],
  questions: [
    {
      question: "Nội dung câu hỏi trắc nghiệm số 1?",
      options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      answer: "Đáp án B",
      explanation: "Giải thích ngắn gọn tại sao đáp án B đúng."
    }
  ]
};

const SCHEMA_EXAMPLE_EN = {
  title: "Multiple Choice Quiz Title",
  description: "Short description of this quiz",
  tags: ["Topic Name"],
  questions: [
    {
      question: "Text of question 1?",
      options: ["Choice A", "Choice B", "Choice C", "Choice D"],
      answer: "Choice B",
      explanation: "Short explanation why choice B is correct."
    }
  ]
};

interface JSONEditorProps {
  onQuizCreated: (newQuiz: Quiz) => void;
  onCancel: () => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  t: any;
  lang: 'vi' | 'en';
}

export default function JSONEditor({
  onQuizCreated,
  onCancel,
  addToast,
  t,
  lang
}: JSONEditorProps) {
  const defaultTemplate = lang === 'vi' ? TEMPLATE_VALUE_VI : TEMPLATE_VALUE_EN;
  const [jsonText, setJsonText] = useState(JSON.stringify(defaultTemplate, null, 2));
  
  // Validation status
  const [isValid, setIsValid] = useState(true);
  const [validationMsg, setValidationMsg] = useState(t.jsonValid);

  // Drag and drop / Scanner states
  const [isDragOver, setIsDragOver] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerPreviewUrl, setScannerPreviewUrl] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab and prompt helper states
  const [activeTab, setActiveTab] = useState<'guidelines' | 'prompt' | 'ai'>('ai');
  const [promptType, setPromptType] = useState<'image' | 'topic'>('image');
  const [topic, setTopic] = useState(lang === 'vi' ? "Lập trình React" : "React Programming");
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast(lang === 'vi' ? "Đã sao chép" : "Copied", lang === 'vi' ? "Đã sao chép prompt vào bộ nhớ tạm!" : "Prompt copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const localT = {
    vi: {
      guidelinesTab: "Hướng dẫn cấu trúc",
      promptTab: "Trợ lý Prompt AI",
      promptTypeImage: "Quét ảnh đề thi",
      promptTypeTopic: "Tạo đề theo chủ đề",
      topicLabel: "Nhập chủ đề đề thi:",
      topicPlaceholder: "Ví dụ: Lịch sử lớp 12, Sinh học tế bào...",
      copyPromptBtn: "Sao chép Prompt AI",
      copiedBtn: "Đã sao chép!",
      promptIntro: "Sao chép prompt dưới đây và dán vào ChatGPT hoặc Claude để nhận chuỗi mã JSON chuẩn xác nhất cho AeroQuiz:",
      promptPlaceholder: "Chưa nhập chủ đề..."
    },
    en: {
      guidelinesTab: "Structure Guide",
      promptTab: "AI Prompt Helper",
      promptTypeImage: "From Quiz Image",
      promptTypeTopic: "From Custom Topic",
      topicLabel: "Enter Quiz Topic:",
      topicPlaceholder: "e.g. World History, Cell Biology...",
      copyPromptBtn: "Copy AI Prompt",
      copiedBtn: "Copied!",
      promptIntro: "Copy the prompt below and paste it into ChatGPT/Claude to get the exact JSON code formatted for AeroQuiz:",
      promptPlaceholder: "Enter a topic first..."
    }
  }[lang];

  const exampleSchema = lang === 'vi' ? SCHEMA_EXAMPLE_VI : SCHEMA_EXAMPLE_EN;

  const imagePrompt = lang === 'vi'
    ? `Bạn hãy đóng vai trò là một bộ trích xuất dữ liệu OCR thông minh. Tôi sẽ tải lên hình ảnh một đề kiểm tra trắc nghiệm. Nhiệm vụ của bạn là đọc toàn bộ câu hỏi, các phương án lựa chọn và đáp án đúng. Sau đó, xuất ra dữ liệu chính xác dưới dạng một chuỗi JSON nguyên bản duy nhất (không định dạng mã markdown, không dùng ba dấu nháy ngược, không viết lời dẫn hay giải thích gì thêm ngoài JSON) theo đúng cấu trúc mẫu sau:

${JSON.stringify(exampleSchema, null, 2)}`
    : `Act as an expert data extraction engine. I will upload an image of a multiple-choice quiz. Your task is to scan the text and format it into a clean, valid JSON object. Do not wrap the output in markdown code blocks (do not use triple backticks), do not include any conversational intro/outro text, and return only the raw JSON string matching this schema:

${JSON.stringify(exampleSchema, null, 2)}`;

  const topicPrompt = lang === 'vi'
    ? `Bạn hãy đóng vai trò là một giáo viên chuyên nghiệp. Hãy soạn một đề thi trắc nghiệm gồm 5 câu hỏi chất lượng cao về chủ đề: "${topic || "[Điền chủ đề của bạn vào đây]" }". Hãy xuất kết quả trực tiếp dưới dạng một chuỗi JSON nguyên bản duy nhất (không định dạng mã định dạng markdown, không bao quanh bằng ba dấu nháy ngược, không viết lời mở đầu hay giải thích gì thêm bên ngoài JSON) theo đúng cấu trúc mẫu sau:

${JSON.stringify(exampleSchema, null, 2)}`
    : `Act as an expert educator. Generate a high-quality 5-question multiple-choice quiz on the topic: "${topic || "[Fill your topic here]" }". Return the output directly as a raw JSON string, do not wrap in markdown code blocks (no triple backticks), do not include any intro or outro text, and return only a valid JSON string matching this schema:

${JSON.stringify(exampleSchema, null, 2)}`;

  const compiledPrompt = promptType === 'image' ? imagePrompt : topicPrompt;

  // Core Schema Validator
  const validateSchema = (text: string): Quiz | null => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed.title || typeof parsed.title !== 'string') {
        setIsValid(false);
        setValidationMsg(lang === 'vi' ? "Thiếu hoặc sai kiểu dữ liệu trường 'title'" : "Missing or invalid 'title'");
        return null;
      }
      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        setIsValid(false);
        setValidationMsg(lang === 'vi' ? "Trường 'questions' phải là mảng và không được trống" : "'questions' must be a non-empty array");
        return null;
      }
      
      // Question item check
      for (let i = 0; i < parsed.questions.length; i++) {
        const q = parsed.questions[i];
        if (!q.question || typeof q.question !== 'string') {
          setIsValid(false);
          setValidationMsg(lang === 'vi' ? `Câu số ${i+1}: Thiếu hoặc sai kiểu trường 'question'` : `Question ${i+1}: Missing or invalid 'question'`);
          return null;
        }
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          setIsValid(false);
          setValidationMsg(lang === 'vi' ? `Câu số ${i+1}: Trường 'options' phải là danh sách ít nhất 2 đáp án` : `Question ${i+1}: 'options' must be an array with at least 2 choices`);
          return null;
        }
        if (!q.answer || typeof q.answer !== 'string') {
          setIsValid(false);
          setValidationMsg(lang === 'vi' ? `Câu số ${i+1}: Thiếu hoặc sai kiểu trường 'answer' (đáp án đúng)` : `Question ${i+1}: Missing or invalid 'answer'`);
          return null;
        }
        if (!q.options.includes(q.answer)) {
          setIsValid(false);
          setValidationMsg(lang === 'vi' 
            ? `Câu số ${i+1}: Đáp án đúng '${q.answer}' phải trùng khớp với một trong các lựa chọn` 
            : `Question ${i+1}: Correct answer '${q.answer}' must match one of the choices`);
          return null;
        }
      }

      setIsValid(true);
      setValidationMsg(t.jsonValid);
      return parsed as Quiz;
    } catch (e: any) {
      setIsValid(false);
      setValidationMsg(e.message || t.jsonInvalid);
      return null;
    }
  };

  // Run validation on text change
  useEffect(() => {
    validateSchema(jsonText);
  }, [jsonText]);

  // Load preset template
  const handleLoadTemplate = () => {
    setJsonText(JSON.stringify(defaultTemplate, null, 2));
    addToast(lang === 'vi' ? "Đã tải đề mẫu" : "Template loaded", lang === 'vi' ? "Trình soạn thảo đã được cài đặt về mã mẫu." : "JSON editor reset to defaults.", "info");
  };

  // Auto-format JSON code
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      addToast(lang === 'vi' ? "Định dạng thành công" : "Formatted successfully", lang === 'vi' ? "Mã JSON đã được căn lề chuẩn xác." : "JSON structured correctly.", "success");
    } catch (e) {
      addToast("JSON Error", lang === 'vi' ? "Không thể định dạng mã JSON bị lỗi cú pháp." : "Could not format invalid JSON.", "error");
    }
  };

  // Submit and Play Quiz
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
        const errorData = await res.json();
        addToast("Error", errorData.error || "Failed to save quiz.", "error");
      }
    } catch (e) {
      addToast("Connection Error", "Could not sync quiz with server.", "error");
    }
  };

  // File Upload OCR scan simulator
  const handleScanFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast("Invalid File Type", lang === 'vi' ? "Vui lòng tải lên file hình ảnh trắc nghiệm." : "Please upload a valid image file.", "warning");
      return;
    }

    setIsScanning(true);
    setScannerStatus(lang === 'vi' ? "Đang tải ảnh lên máy chủ..." : "Uploading image to server...");
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setScannerPreviewUrl(e.target.result as string);
    };
    reader.readAsDataURL(file);

    // Dynamic scanning progress steps
    const timers = [
      setTimeout(() => setScannerStatus(lang === 'vi' ? "Nhận diện bố cục dòng cột..." : "Analyzing question layout..."), 900),
      setTimeout(() => setScannerStatus(lang === 'vi' ? "Đọc nội dung chữ bằng OCR..." : "Reading text using OCR engine..."), 1800),
      setTimeout(() => setScannerStatus(lang === 'vi' ? "Khớp đáp án và phân tích biểu mẫu..." : "Resolving answers and schema..."), 2700)
    ];

    try {
      const res = await client.api.quizzes.scan.$post({
        form: {
          file: file
        }
      });

      if (res.ok) {
        const scannedQuiz = await res.json();
        setJsonText(JSON.stringify(scannedQuiz, null, 2));
        addToast(t.scanSuccess, lang === 'vi' ? "Nhấp 'Bắt đầu làm bài' bên trái để bắt đầu!" : "Click 'Parse & Play' to start!", "success");
      } else {
        addToast("OCR Error", t.scanError, "error");
      }
    } catch (err) {
      addToast("Connection Error", "Network failure during scan.", "error");
    } finally {
      setIsScanning(false);
      timers.forEach(t => clearTimeout(t));
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleScanFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header back navigation */}
      <div className="flex items-center space-x-3">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onCancel}
          className="rounded-xl border-slate-800 hover:bg-slate-800 hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">{t.createQuiz}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{t.creatorDesc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left Section: Text Editor */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5 shadow-lg backdrop-blur-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-300 flex items-center space-x-2">
                <FileJson className="h-4 w-4 text-indigo-400" />
                <span>{t.editorTitle}</span>
              </h3>
              
              <div className="flex space-x-2">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={handleLoadTemplate}
                  className="rounded-xl border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-8"
                >
                  {t.loadTemplate}
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={handleFormatJson}
                  className="rounded-xl border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-8"
                >
                  {t.formatJson}
                </Button>
              </div>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-[400px] bg-slate-950/80 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-indigo-200 focus:outline-none focus:border-indigo-500/50 transition resize-none custom-scrollbar"
              spellCheck="false"
            />

            {/* Validation Banner */}
            <Alert className={`rounded-2xl border ${isValid ? 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400' : 'border-rose-500/20 bg-rose-950/10 text-rose-400'}`}>
              <div className="flex items-start space-x-2">
                {isValid ? (
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <div>
                  <AlertTitle className="text-xs font-bold uppercase tracking-wider">
                    {isValid ? "Schema Verified" : "Syntax Alert"}
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1 text-slate-300 font-medium">
                    {validationMsg}
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Start CTA Button */}
            <Button
              onClick={handleGenerate}
              disabled={!isValid}
              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 border border-indigo-500 transition"
            >
              <Zap className="h-4 w-4 mr-2" />
              <span>{t.parsePlay}</span>
            </Button>
          </div>
        </div>

        {/* Right Section: OCR Scanner Image Dropper */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dropzone Container */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border border-dashed p-8 text-center cursor-pointer transition duration-300 flex flex-col items-center justify-center min-h-[300px] overflow-hidden group shadow-lg ${
              isDragOver 
                ? 'border-indigo-400 bg-indigo-950/20' 
                : 'border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-900/10'
            }`}
          >
            {/* Embedded scanned preview image */}
            {scannerPreviewUrl && (
              <img 
                src={scannerPreviewUrl} 
                className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-[1px] pointer-events-none transition group-hover:scale-105 duration-700" 
                alt="Scanner Preview" 
              />
            )}

            {/* Running scan effect lines */}
            {isScanning && (
              <div className="absolute inset-x-0 h-0.5 bg-indigo-500/80 shadow-[0_0_12px_#6366f1] animate-scan pointer-events-none z-10" />
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleScanFile(e.target.files[0]);
                }
              }}
            />

            {isScanning ? (
              <div className="space-y-4 animate-pulse z-20">
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                  <FileUp className="h-8 w-8 animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-sm text-slate-200">{t.scanning}</h4>
                  <p className="text-xs text-indigo-400/80 font-mono tracking-tight">{scannerStatus}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 z-20">
                <div className="p-4 bg-slate-900/60 border border-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/25 group-hover:bg-indigo-500/5 rounded-full w-16 h-16 flex items-center justify-center mx-auto transition duration-300">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div className="space-y-1 max-w-[240px] mx-auto">
                  <h4 className="font-bold text-sm text-slate-200 group-hover:text-indigo-300 transition duration-300">{t.scanZone}</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">{t.scanSupport}</p>
                </div>
              </div>
            )}
          </div>

          {/* Helper Tabs Container */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/20 p-5 space-y-4 shadow-lg text-left">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-900 pb-2 space-x-2">
              <button
                onClick={() => setActiveTab('ai')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition duration-200 flex items-center space-x-1.5 ${
                  activeTab === 'ai'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{lang === 'vi' ? 'Tạo bằng AI' : 'AI Generate'}</span>
              </button>
              <button
                onClick={() => setActiveTab('guidelines')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition duration-200 ${
                  activeTab === 'guidelines'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {localT.guidelinesTab}
              </button>
              <button
                onClick={() => setActiveTab('prompt')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition duration-200 ${
                  activeTab === 'prompt'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {localT.promptTab}
              </button>
            </div>

            {/* Tab: AI Generator */}
            {activeTab === 'ai' && (
              <div className="animate-in fade-in duration-200">
                <AIGenerator
                  onQuizGenerated={(quiz) => {
                    setJsonText(JSON.stringify({
                      title: quiz.title,
                      description: quiz.description,
                      tags: quiz.tags,
                      questions: quiz.questions,
                    }, null, 2));
                    addToast(
                      lang === 'vi' ? 'AI đã tạo đề thi!' : 'AI generated quiz!',
                      lang === 'vi' ? "Nhấn 'Bắt đầu làm bài' để chơi ngay!" : "Click 'Parse & Play' to start!",
                      'success'
                    );
                  }}
                  addToast={addToast}
                  lang={lang}
                />
              </div>
            )}

            {/* Tab: Guidelines */}
            {activeTab === 'guidelines' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5 uppercase tracking-wider">
                  <Code2 className="h-4 w-4 text-indigo-400" />
                  <span>Guidelines</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.schemaHelp}
                </p>
                <div className="flex items-start space-x-2 text-[10px] text-slate-500 leading-normal bg-slate-950/50 p-3 rounded-2xl border border-slate-850">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-400" />
                  <span>
                    {lang === 'vi' 
                      ? "Tính năng Scan mô phỏng tải lên hình ảnh trắc nghiệm, giải mã cấu trúc đề thi qua OCR và phân tích định dạng tự động thành JSON trắc nghiệm trong 3.5 giây."
                      : "The Scan feature simulates uploading custom screenshots, reads question items, and structures the playable template block inside the text editor in 3.5s."}
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2 Content: AI Prompt Helper */}
            {activeTab === 'prompt' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Segment Selector for Prompt Type */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-850">
                  <button
                    onClick={() => setPromptType('image')}
                    className={`text-[10px] font-bold py-1.5 px-2 rounded-lg text-center transition duration-200 ${
                      promptType === 'image'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {localT.promptTypeImage}
                  </button>
                  <button
                    onClick={() => setPromptType('topic')}
                    className={`text-[10px] font-bold py-1.5 px-2 rounded-lg text-center transition duration-200 ${
                      promptType === 'topic'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {localT.promptTypeTopic}
                  </button>
                </div>

                {/* Topic Input if topic mode selected */}
                {promptType === 'topic' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{localT.topicLabel}</label>
                    <input 
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={localT.topicPlaceholder}
                      className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-slate-200 transition"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 leading-normal">{localT.promptIntro}</p>
                  
                  <textarea
                    readOnly
                    value={compiledPrompt}
                    className="w-full h-[160px] bg-slate-950/80 border border-slate-850 rounded-xl p-3 font-mono text-[10px] text-indigo-300 focus:outline-none resize-none custom-scrollbar"
                  />
                </div>

                <Button
                  onClick={() => handleCopyPrompt(compiledPrompt)}
                  className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 transition flex items-center justify-center space-x-1.5"
                >
                  <Copy className="h-4 w-4" />
                  <span>{copied ? localT.copiedBtn : localT.copyPromptBtn}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}