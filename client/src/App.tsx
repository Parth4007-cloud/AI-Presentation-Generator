import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Info, Sparkles, Loader2, Download, Trash2, LayoutDashboard, Plus, Home, Sun, Moon, FileText } from 'lucide-react';
import pptxgen from "pptxgenjs";
import { Presentation, Slide, PresentationListItem } from './types';
import { getPresentations, getPresentation, generatePresentation, deletePresentation } from './services/api';

// --- Color schemes for slides ---
const SLIDE_COLORS = [
  '#1e3a5f', // Navy blue
  '#14532d', // Green
  '#581c87', // Purple
  '#b45309', // Orange
  '#be123c', // Pink
  '#0f766e', // Cyan
  '#3f6212', // Olive
  '#7c2d12', // Red
  '#374151', // Gray
  '#1e3a5f', // Navy blue (repeat)
];

const getSlideColor = (index: number) => SLIDE_COLORS[index % SLIDE_COLORS.length];

// --- Sub-Components ---

const ThemeToggle: React.FC<{ isDark: boolean; toggle: () => void }> = ({ isDark, toggle }) => (
  <button
    onClick={toggle}
    className="p-2 rounded-full bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors backdrop-blur-sm"
    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
  >
    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
  </button>
);

const SlideCard: React.FC<{
  slide: Slide;
  isActive: boolean;
  index: number;
}> = ({ slide, isActive, index }) => {
  const color = getSlideColor(index);

  return (
    <div
      className="slide-preview rounded-xl overflow-hidden shadow-lg transition-all duration-300 relative"
      style={{ backgroundColor: color }}
    >
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
        </div>
        <p className="text-white/90 text-sm font-medium tracking-wide uppercase mb-2">
          {slide.subtitle}
        </p>
        <h3 className="text-white text-2xl md:text-3xl font-bold line-clamp-2 leading-tight">
          {slide.title}
        </h3>
      </div>

      {/* Slide number badge */}
      <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
        <span className="text-white text-sm font-medium">{slide.slideNumber}</span>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  // --- Global State ---
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Theme State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('slide-ai-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // --- Navigation State ---
  const [view, setView] = useState<'dashboard' | 'create' | 'presentation'>('dashboard');
  const [activePresentation, setActivePresentation] = useState<Presentation | null>(null);

  // --- Form State ---
  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- Export State ---
  const [isExporting, setIsExporting] = useState(false);

  // --- Load presentations on mount ---
  useEffect(() => {
    loadPresentations();
  }, []);

  // --- Theme Effect ---
  useEffect(() => {
    localStorage.setItem('slide-ai-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const loadPresentations = async () => {
    setIsLoading(true);
    try {
      const data = await getPresentations();
      setPresentations(data);
    } catch (error) {
      console.error("Failed to load presentations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const presentation = await generatePresentation({ prompt, slideCount });
      setPresentations(prev => [
        {
          id: presentation.id,
          prompt: presentation.prompt,
          slideCount: presentation.slideCount,
          createdAt: presentation.createdAt,
        },
        ...prev,
      ]);
      setActivePresentation(presentation);
      setCurrentSlide(0);
      setView('presentation');
      setPrompt('');
    } catch (error) {
      console.error("Failed to generate presentation:", error);
      alert("Failed to generate presentation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenPresentation = async (id: string) => {
    setIsLoading(true);
    try {
      const presentation = await getPresentation(id);
      setActivePresentation(presentation);
      setCurrentSlide(0);
      setView('presentation');
    } catch (error) {
      console.error("Failed to load presentation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePresentation = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this presentation?")) {
      try {
        await deletePresentation(id);
        setPresentations(prev => prev.filter(p => p.id !== id));
        if (activePresentation?.id === id) {
          setActivePresentation(null);
          setView('dashboard');
        }
      } catch (error) {
        console.error("Failed to delete presentation:", error);
      }
    }
  };

  const handleExportToPPT = async () => {
    if (!activePresentation || activePresentation.slides.length === 0) return;
    setIsExporting(true);
    try {
      const pres = new pptxgen();
      pres.layout = 'LAYOUT_16x9';

      // Title Slide
      const titleSlide = pres.addSlide();
      titleSlide.background = { color: '1e3a5f' };
      titleSlide.addText(activePresentation.prompt.toUpperCase(), {
        x: 0.5, y: '40%', w: '90%', h: 1,
        fontSize: 44, color: 'FFFFFF', bold: true, align: 'center'
      });

      activePresentation.slides.forEach((slide, index) => {
        const pptSlide = pres.addSlide();

        // Use colored background from SLIDE_COLORS
        const bgColor = getSlideColor(index);
        pptSlide.background = { color: bgColor.replace('#', '') };

        // Add decorative shape in corner
        pptSlide.addShape(pres.ShapeType.rect, {
          x: '85%', y: 0, w: '15%', h: '20%',
          fill: { color: 'FFFFFF', transparency: 85 }
        });

        // Add slide number
        pptSlide.addText(`${index + 1}`, {
          x: '92%', y: '3%', w: '5%',
          fontSize: 16, color: 'FFFFFF', bold: true, align: 'center'
        });

        // Add Subtitle at top
        pptSlide.addText(slide.subtitle.toUpperCase(), {
          x: 0.5, y: '8%', w: '80%',
          fontSize: 10, color: 'FFFFFF', bold: true, charSpacing: 2
        });

        // Add Title in center
        pptSlide.addText(slide.title, {
          x: 0.5, y: '20%', w: '85%',
          fontSize: 36, color: 'FFFFFF', bold: true, fontFace: 'Arial', align: 'center'
        });

        // Add semi-transparent box for description
        pptSlide.addShape(pres.ShapeType.rect, {
          x: 0.5, y: '50%', w: '90%', h: '40%',
          fill: { color: '000000', transparency: 30 },
          line: { type: 'none' }
        });

        // Add Description
        pptSlide.addText(slide.description, {
          x: 1, y: '55%', w: '80%',
          fontSize: 14, color: 'F3F4F6', align: 'left'
        });
      });

      await pres.writeFile({ fileName: `AI_Presentation_${activePresentation.prompt.replace(/\s+/g, '_')}.pptx` });
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export PowerPoint.");
    } finally {
      setIsExporting(false);
    }
  };

  const nextSlide = useCallback(() => {
    if (!activePresentation) return;
    setCurrentSlide(curr => (curr === activePresentation.slides.length - 1 ? 0 : curr + 1));
  }, [activePresentation]);

  const prevSlide = useCallback(() => {
    if (!activePresentation) return;
    setCurrentSlide(curr => (curr === 0 ? activePresentation.slides.length - 1 : curr - 1));
  }, [activePresentation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePresentation || activePresentation.slides.length === 0) return;
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePresentation, nextSlide, prevSlide]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      document.exitFullscreen();
    }
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-500">
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle isDark={isDarkMode} toggle={toggleTheme} />
      </div>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-8 md:pt-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-green-600 dark:text-green-400" />
              Your Presentations
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              AI-powered presentation decks
            </p>
          </div>
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-3 rounded-lg font-medium transition-all shadow-lg shadow-green-900/20 dark:shadow-black/20"
          >
            <Plus className="w-5 h-5" /> Create New
          </button>
        </div>

        {presentations.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-24 h-24 text-green-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No presentations yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Create your first AI-powered presentation
            </p>
            <button
              onClick={() => setView('create')}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Sparkles className="w-5 h-5" /> Create Presentation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentations.map((presentation) => (
              <div
                key={presentation.id}
                onClick={() => handleOpenPresentation(presentation.id)}
                className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-green-500/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePresentation(presentation.id); }}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
                    title="Delete presentation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                      <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {presentation.slideCount} slides
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {presentation.prompt}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(presentation.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle isDark={isDarkMode} toggle={toggleTheme} />
      </div>
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-green-400/10 dark:bg-green-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-emerald-400/10 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {presentations.length > 0 && (
        <button
          onClick={() => setView('dashboard')}
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors z-20"
        >
          <ChevronLeft className="w-5 h-5" /> Back to Dashboard
        </button>
      )}

      <div className="max-w-2xl w-full z-10 text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-white dark:bg-slate-800/50 rounded-2xl mb-4 ring-1 ring-slate-200 dark:ring-slate-700 shadow-lg backdrop-blur-sm">
            <Sparkles className="w-10 h-10 text-green-500 dark:text-green-400" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold gradient-text pb-2">
            Slide AI
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl">
            Enter any topic and generate a stunning presentation with AI
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                What's your presentation about?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., The future of renewable energy, Introduction to machine learning, Marketing strategies 2024..."
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3 ring-1 ring-slate-200 dark:ring-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Number of slides
              </label>
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3 ring-1 ring-slate-200 dark:ring-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value={3}>3 slides</option>
                <option value={5}>5 slides</option>
                <option value={7}>7 slides</option>
                <option value={10}>10 slides</option>
              </select>
            </div>

            <button
              onClick={handleGeneratePresentation}
              disabled={!prompt.trim() || isGenerating}
              className="w-full bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-lg font-bold transition-all shadow-lg shadow-green-900/20 dark:shadow-black/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Presentation...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Presentation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPresentation = () => {
    if (!activePresentation) return null;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setActivePresentation(null); setView('dashboard'); }}
                className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Home className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">
                  {activePresentation.prompt}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {activePresentation.slides.length} slides
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportToPPT}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export PPT
              </button>
              <ThemeToggle isDark={isDarkMode} toggle={toggleTheme} />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Current Slide */}
          <div className="mb-8">
            <SlideCard slide={activePresentation.slides[currentSlide]} isActive={true} index={currentSlide} />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={prevSlide}
              className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              {activePresentation.slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    currentSlide === index
                      ? 'bg-green-500 scale-125'
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Slide Description */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {activePresentation.slides[currentSlide].title}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {activePresentation.slides[currentSlide].description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render Logic ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (view === 'dashboard') {
    return renderDashboard();
  }

  if (view === 'create') {
    return renderCreate();
  }

  if (view === 'presentation') {
    return renderPresentation();
  }

  return renderDashboard();
};

export default App;
