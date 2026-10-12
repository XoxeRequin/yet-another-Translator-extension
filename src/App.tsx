/**
 * Dark Translate - Firefox Manifest V3 Extension Hub & Interactive Simulator
 */

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  Download,
  Copy,
  Check,
  Volume2,
  ArrowRightLeft,
  X,
  ExternalLink,
  Code2,
  Play,
  HelpCircle,
  FileCode,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { EXTENSION_FILES, ExtensionFile } from './extensionFiles';

// Supported Languages
const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' }
];

// Sample Articles for the Live Simulator
const SAMPLE_ARTICLES = [
  {
    id: 'en',
    flag: '🇺🇸',
    title: 'Quantum Computing and Modern Cryptography',
    category: 'Technology',
    source: 'Tech Horizons',
    date: 'March 2026',
    text: `Quantum computing represents a fundamental paradigm shift in computational architecture. By harnessing quantum mechanical phenomena such as superposition and entanglement, qubits process vast combinatoric possibilities simultaneously. This unprecedented speed promises transformative breakthroughs in molecular simulation and artificial intelligence, while necessitating a swift transition toward post-quantum cryptography to safeguard decentralized protocols worldwide.`
  },
  {
    id: 'es',
    flag: '🇪🇸',
    title: 'La Evolución del Diseño y la Tipografía Web',
    category: 'Diseño',
    source: 'Cultura Visual',
    date: 'Febrero 2026',
    text: `El diseño web moderno ha trascendido las limitaciones estéticas del pasado. La incorporación del modo oscuro y el efecto glassmorphism permite crear interfaces visualmente inmersivas y ergonómicas. La tipografía refinada, combinada con sombras sutiles y bordes translúcidos, genera una experiencia de usuario distinguida donde la legibilidad y la elegancia convergen en perfecta armonía.`
  },
  {
    id: 'fr',
    flag: '🇫🇷',
    title: "L'art de l'architecture logicielle modulaire",
    category: 'Ingénierie',
    source: 'Revue Polytechnique',
    date: 'Janvier 2026',
    text: `L'isolation stricte des composants via le Shadow DOM garantit qu'aucun conflit de style ne vienne perturber l'expérience utilisateur sur les plateformes hôtes. Les extensions modernes de navigateurs doivent adopter cette discipline architecturale pour offrir des outils fiables, légers et élégants sans altérer le code source des pages consultées.`
  },
  {
    id: 'de',
    flag: '🇩🇪',
    title: 'Die Geheimnisse der modernen Astronomie',
    category: 'Wissenschaft',
    source: 'Kosmos Journal',
    date: 'März 2026',
    text: `Die neuesten Weltraumteleskope erforschen die entferntesten Galaxien des beobachtbaren Universums. Durch hochauflösende Spektroskopie können Wissenschaftler die chemische Zusammensetzung ferner Exoplaneten entschlüsseln und neue Erkenntnisse über die Entstehung interstellarer Materie gewinnen.`
  },
  {
    id: 'custom',
    flag: '✏️',
    title: 'Custom Text Sandbox',
    category: 'Interactive',
    source: 'User Input',
    date: 'Live Editor',
    text: `Type or paste any paragraph in any language here, then select any phrase or sentence to test the floating Dark Translate extension trigger!`
  }
];

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'firefox' | 'quick'>('simulator');

  // Simulator State
  const [selectedArticleId, setSelectedArticleId] = useState('en');
  const [customArticleText, setCustomArticleText] = useState(SAMPLE_ARTICLES[4].text);
  const [simulatorSelectedText, setSimulatorSelectedText] = useState('');
  
  // Floating trigger button coordinates
  const [triggerPos, setTriggerPos] = useState<{ x: number; y: number } | null>(null);

  // Floating modal state
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSourceText, setModalSourceText] = useState('');
  const [modalSourceLang, setModalSourceLang] = useState('auto');
  const [modalTargetLang, setModalTargetLang] = useState('pt'); // Default Portuguese
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTranslatedText, setModalTranslatedText] = useState('');
  const [modalRomanization, setModalRomanization] = useState<string | null>(null);
  const [modalDetectedSource, setModalDetectedSource] = useState<string | null>(null);
  const [modalDictionary, setModalDictionary] = useState<Array<{ partOfSpeech: string; terms: string[] }>>([]);
  const [copiedModal, setCopiedModal] = useState(false);

  // Code Inspector State
  const [activeCodeFile, setActiveCodeFile] = useState<ExtensionFile>(EXTENSION_FILES[0]);
  const [codeCopied, setCodeCopied] = useState(false);
  const [zipDownloading, setZipDownloading] = useState(false);

  // Quick Translator State
  const [quickInput, setQuickInput] = useState('Hello world, welcome to the modern Dark Translate extension for Firefox!');
  const [quickSource, setQuickSource] = useState('auto');
  const [quickTarget, setQuickTarget] = useState('pt');
  const [quickOutput, setQuickOutput] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickCopied, setQuickCopied] = useState(false);

  // Simulator container ref
  const articleContentRef = useRef<HTMLDivElement>(null);
  const simulatorCardRef = useRef<HTMLDivElement>(null);

  // Handle selection inside simulated article
  const handleArticleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (!modalOpen) {
        setTriggerPos(null);
      }
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length === 0) {
      if (!modalOpen) setTriggerPos(null);
      return;
    }

    // Only handle if inside the article container
    if (!articleContentRef.current || !simulatorCardRef.current) return;
    const anchorNode = selection.anchorNode;
    if (!anchorNode || !articleContentRef.current.contains(anchorNode)) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = simulatorCardRef.current.getBoundingClientRect();

    // Position relative to simulator card
    const x = Math.min(containerRect.width - 44, Math.max(12, rect.right - containerRect.left + 4));
    const y = rect.bottom - containerRect.top + 4;

    setSimulatorSelectedText(text);
    setTriggerPos({ x, y });
  };

  // Open the simulated translation popup modal
  const handleOpenModal = (textToTranslate?: string, explicitPos?: { x: number; y: number }) => {
    const targetText = textToTranslate || simulatorSelectedText;
    if (!targetText) return;

    const pos = explicitPos || triggerPos || { x: 120, y: 150 };
    
    // Calculate smart positioning within simulator card
    let posX = Math.max(12, pos.x - 20);
    let posY = pos.y + 8;
    if (simulatorCardRef.current) {
      const cardWidth = simulatorCardRef.current.clientWidth;
      if (posX + 360 > cardWidth) {
        posX = Math.max(12, cardWidth - 376);
      }
    }

    setModalPos({ x: posX, y: posY });
    setModalSourceText(targetText);
    setModalOpen(true);
    setTriggerPos(null);

    // Fetch translation immediately
    fetchTranslation(targetText, modalSourceLang, modalTargetLang);
  };

  // Execute translation via Google Translate GTX API
  const fetchTranslation = async (text: string, source: string, target: string) => {
    if (!text.trim()) return;
    setModalLoading(true);

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(text.trim())}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const raw = await res.json();

      let translated = '';
      let romanization: string | null = null;

      if (Array.isArray(raw[0])) {
        for (const segment of raw[0]) {
          if (segment && segment[0]) translated += segment[0];
          if (segment && (segment[2] || segment[3])) {
            romanization = segment[2] || segment[3];
          }
        }
      }

      const detected = raw[2] || source;
      let dict: Array<{ partOfSpeech: string; terms: string[] }> = [];
      if (Array.isArray(raw[1])) {
        dict = raw[1].map((item: [string, string[]]) => ({
          partOfSpeech: item[0],
          terms: Array.isArray(item[1]) ? item[1].slice(0, 4) : []
        }));
      }

      setModalTranslatedText(translated.trim());
      setModalRomanization(romanization);
      setModalDetectedSource(detected);
      setModalDictionary(dict);
    } catch {
      setModalTranslatedText('Translation unavailable. Please check network connection.');
      setModalRomanization(null);
      setModalDictionary([]);
    } finally {
      setModalLoading(false);
    }
  };

  // Swap modal languages
  const handleSwapModalLanguages = () => {
    const nextTarget = modalSourceLang === 'auto' ? (modalDetectedSource || 'en') : modalSourceLang;
    const nextSource = modalTargetLang;
    setModalSourceLang(nextSource);
    setModalTargetLang(nextTarget);
    fetchTranslation(modalSourceText, nextSource, nextTarget);
  };

  // Web Speech Synthesis
  const handleSpeak = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const localeMap: Record<string, string> = {
      pt: 'pt-PT',
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      ja: 'ja-JP',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      ko: 'ko-KR',
      ru: 'ru-RU',
      ar: 'ar-SA',
      hi: 'hi-IN',
      nl: 'nl-NL'
    };
    utterance.lang = localeMap[langCode] || langCode;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // One-click quick test phrase highlight
  const testPresetHighlight = (phrase: string) => {
    setSimulatorSelectedText(phrase);
    handleOpenModal(phrase, { x: 140, y: 160 });
  };

  // Download entire extension package as a real .zip
  const handleDownloadZip = async () => {
    setZipDownloading(true);
    try {
      const zip = new JSZip();

      // Add extension files
      zip.file('manifest.json', EXTENSION_FILES.find(f => f.name === 'manifest.json')?.content || '');
      zip.file('content.js', EXTENSION_FILES.find(f => f.name === 'content.js')?.content || '');
      zip.file('styles.css', EXTENSION_FILES.find(f => f.name === 'styles.css')?.content || '');
      zip.file('background.js', EXTENSION_FILES.find(f => f.name === 'background.js')?.content || '');
      zip.file('popup.html', EXTENSION_FILES.find(f => f.name === 'popup.html')?.content || '');

      // Add popup.js
      const popupJs = `/** Dark Translate Popup */
const ext = typeof browser !== 'undefined' ? browser : chrome;
document.getElementById('translateBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('quickText')?.value;
  const target = document.getElementById('targetLang')?.value || 'pt';
  const out = document.getElementById('quickOutput');
  if (!text || !out) return;
  out.style.display = 'block';
  out.textContent = 'Translating...';
  try {
    const res = await fetch(\`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=\${target}&dt=t&q=\${encodeURIComponent(text)}\`);
    const data = await res.json();
    let r = '';
    if (Array.isArray(data[0])) { for (const s of data[0]) if (s[0]) r += s[0]; }
    out.textContent = r;
  } catch(e) { out.textContent = 'Error: ' + e.message; }
});`;
      zip.file('popup.js', popupJs);

      // Add icons
      const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="#141824" stroke="rgba(255,255,255,0.15)"/>
  <rect x="8" y="10" width="22" height="22" rx="6" fill="#1e2640"/>
  <text x="14" y="26" font-family="sans-serif" font-size="14" font-weight="bold" fill="#93c5fd">A</text>
  <rect x="18" y="16" width="22" height="22" rx="6" fill="#3b82f6"/>
  <text x="25" y="32" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff">文</text>
</svg>`;
      zip.file('icons/icon-48.svg', iconSvg);
      zip.file('README.md', EXTENSION_FILES.find(f => f.name === 'README.md')?.content || '');

      // Generate blob & download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dark-translate-firefox-mv3.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setZipDownloading(false);
    }
  };

  // Copy code file content
  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCodeFile.content).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  // Download single file
  const handleDownloadSingleFile = (file: ExtensionFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Quick Translator trigger
  const handleRunQuickTranslate = async () => {
    if (!quickInput.trim()) return;
    setQuickLoading(true);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(quickSource)}&tl=${encodeURIComponent(quickTarget)}&dt=t&q=${encodeURIComponent(quickInput.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      let result = '';
      if (Array.isArray(data[0])) {
        for (const seg of data[0]) {
          if (seg && seg[0]) result += seg[0];
        }
      }
      setQuickOutput(result.trim());
    } catch {
      setQuickOutput('Translation error. Please check network.');
    } finally {
      setQuickLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'quick') {
      handleRunQuickTranslate();
    }
  }, [quickSource, quickTarget]);

  const currentArticle = SAMPLE_ARTICLES.find(a => a.id === selectedArticleId) || SAMPLE_ARTICLES[0];

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#e2e8f0] flex flex-col selection:bg-blue-600/30 selection:text-blue-100">
      
      {/* =========================================================================
          Top Bar Contract (1 Row, 3 Zones separated by gap-8)
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#0c0e14]/90 backdrop-blur-md border-b border-white/[0.08] px-6 lg:px-12 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.11 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Dark Translate
            </span>
          </div>

          {/* Zone 2: Navigation Links (Single line, whitespace-nowrap) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
                activeTab === 'simulator' ? 'text-blue-400 font-semibold' : ''
              }`}
            >
              Live Simulator
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
                activeTab === 'code' ? 'text-blue-400 font-semibold' : ''
              }`}
            >
              Extension Code
            </button>
            <button
              onClick={() => setActiveTab('firefox')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
                activeTab === 'firefox' ? 'text-blue-400 font-semibold' : ''
              }`}
            >
              Firefox Setup Guide
            </button>
            <button
              onClick={() => setActiveTab('quick')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
                activeTab === 'quick' ? 'text-blue-400 font-semibold' : ''
              }`}
            >
              Direct Translator
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleDownloadZip}
              disabled={zipDownloading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] rounded-lg transition-all shadow-md shadow-blue-600/25 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{zipDownloading ? 'Packing...' : 'Download .ZIP'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 py-8">
        
        {/* Navigation Tabs (Mobile view & switcher) */}
        <div className="flex md:hidden items-center gap-1.5 p-1 bg-[#13151f] rounded-xl border border-white/[0.08] mb-6 overflow-x-auto">
          {(['simulator', 'code', 'firefox', 'quick'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'simulator' && 'Simulator'}
              {tab === 'code' && 'Code Files'}
              {tab === 'firefox' && 'Firefox Setup'}
              {tab === 'quick' && 'Translator'}
            </button>
          ))}
        </div>

        {/* =====================================================================
            TAB 1: LIVE EXTENSION SIMULATOR
            ===================================================================== */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            
            {/* Context Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Interactive Browser Extension Simulator
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Highlight any text below to trigger the floating Dark Translate icon and test instant translation.
                </p>
              </div>

              {/* Sample Articles Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-[#141724] border border-white/[0.08] rounded-lg overflow-x-auto shrink-0">
                {SAMPLE_ARTICLES.map(article => (
                  <button
                    key={article.id}
                    onClick={() => {
                      setSelectedArticleId(article.id);
                      setSimulatorSelectedText('');
                      setTriggerPos(null);
                      setModalOpen(false);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      selectedArticleId === article.id
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{article.flag}</span>
                    <span className="hidden sm:inline">{article.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick action chips for touch/mobile devices */}
            <div className="flex items-center gap-2 text-xs text-slate-400 overflow-x-auto pb-1">
              <span className="text-slate-500 whitespace-nowrap flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Quick Highlight:
              </span>
              <button
                onClick={() => testPresetHighlight('quantum mechanical phenomena such as superposition')}
                className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded border border-white/[0.06] transition-colors whitespace-nowrap cursor-pointer"
              >
                "quantum mechanical phenomena..."
              </button>
              <button
                onClick={() => testPresetHighlight('El diseño web moderno ha trascendido las limitaciones estéticas')}
                className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded border border-white/[0.06] transition-colors whitespace-nowrap cursor-pointer"
              >
                "El diseño web moderno..."
              </button>
              <button
                onClick={() => testPresetHighlight("L'art de l'architecture logicielle")}
                className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded border border-white/[0.06] transition-colors whitespace-nowrap cursor-pointer"
              >
                "L'art de l'architecture..."
              </button>
            </div>

            {/* Simulated Firefox Browser Frame */}
            <div
              ref={simulatorCardRef}
              className="relative bg-[#11131c] rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden min-h-[520px]"
            >
              {/* Browser Chrome (Address bar + tabs) */}
              <div className="bg-[#181a26] border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>

                {/* Simulated URL bar */}
                <div className="flex-1 max-w-xl mx-auto bg-[#0d0f17] border border-white/[0.08] rounded-lg px-3 py-1 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="truncate">https://developer.mozilla.org/en-US/docs/Web/Extensions/Dark_Translate</span>
                  <span className="text-[10px] text-blue-400 font-sans px-1.5 py-0.5 rounded bg-blue-500/10 ml-2 shrink-0">Firefox MV3</span>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-medium text-slate-400 hidden sm:inline">Extension Active</span>
                  <div className="w-5 h-5 rounded bg-blue-600/30 flex items-center justify-center text-blue-400">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Simulated Webpage Content Area */}
              <div
                ref={articleContentRef}
                onMouseUp={handleArticleMouseUp}
                className="p-6 sm:p-10 max-w-3xl mx-auto select-text min-h-[420px]"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>{currentArticle.source}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentArticle.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentArticle.date}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 tracking-tight leading-snug">
                  {currentArticle.title}
                </h2>

                {selectedArticleId === 'custom' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-400">
                      Editable text area: Type any text below, then select words with your mouse cursor:
                    </p>
                    <textarea
                      value={customArticleText}
                      onChange={(e) => setCustomArticleText(e.target.value)}
                      onMouseUp={handleArticleMouseUp}
                      className="w-full bg-[#181b28] border border-white/10 rounded-xl p-4 text-slate-200 text-base leading-relaxed outline-none focus:border-blue-500 min-h-[160px]"
                    />
                  </div>
                ) : (
                  <div className="space-y-6 text-slate-300 text-base sm:text-lg leading-relaxed">
                    <p>{currentArticle.text}</p>
                    <p className="text-sm text-slate-400 pt-4 border-t border-white/[0.06]">
                      <strong className="text-slate-300">How to test:</strong> Use your mouse cursor to drag and highlight any word or sentence in the text above. Watch the floating Dark Translate icon appear beside your selection!
                    </p>
                  </div>
                )}
              </div>

              {/* -------------------------------------------------------------------
                  FLOATING TRIGGER BUTTON (Isolated styling)
                  ------------------------------------------------------------------- */}
              {triggerPos && !modalOpen && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${triggerPos.x}px`,
                    top: `${triggerPos.y}px`,
                    zIndex: 40
                  }}
                  className="animate-in fade-in zoom-in-75 duration-150"
                >
                  <button
                    onClick={() => handleOpenModal()}
                    title="Click to Translate Selection"
                    className="w-8 h-8 rounded-full bg-[#14141a]/95 backdrop-blur-md border border-white/20 shadow-xl shadow-black/60 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all text-blue-400 hover:text-blue-300 hover:border-blue-400/50 hover:shadow-blue-500/20"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.11 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* -------------------------------------------------------------------
                  FLOATING TRANSLATION MODAL (Dark Mode & Glassmorphism)
                  ------------------------------------------------------------------- */}
              {modalOpen && modalPos && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${modalPos.x}px`,
                    top: `${modalPos.y}px`,
                    zIndex: 50,
                    width: '360px',
                    maxWidth: 'calc(100% - 24px)'
                  }}
                  className="bg-[#14141a]/90 backdrop-blur-xl border border-white/[0.14] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.03] border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.11 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-blue-300">Dark Translate</span>
                    </div>

                    <button
                      onClick={() => setModalOpen(false)}
                      className="w-6 h-6 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Language Controls Bar */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-black/25 border-b border-white/[0.06]">
                    {/* Source Selector */}
                    <div className="flex-1">
                      <select
                        value={modalSourceLang}
                        onChange={(e) => {
                          setModalSourceLang(e.target.value);
                          fetchTranslation(modalSourceText, e.target.value, modalTargetLang);
                        }}
                        className="w-full bg-white/[0.06] hover:bg-white/[0.09] text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 outline-none cursor-pointer"
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code} className="bg-[#181924] text-white">
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Swap Button */}
                    <button
                      onClick={handleSwapModalLanguages}
                      title="Swap Languages"
                      className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer shrink-0"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                    </button>

                    {/* Target Selector */}
                    <div className="flex-1">
                      <select
                        value={modalTargetLang}
                        onChange={(e) => {
                          setModalTargetLang(e.target.value);
                          fetchTranslation(modalSourceText, modalSourceLang, e.target.value);
                        }}
                        className="w-full bg-white/[0.06] hover:bg-white/[0.09] text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 outline-none cursor-pointer"
                      >
                        {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                          <option key={lang.code} value={lang.code} className="bg-[#181924] text-white">
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="p-3.5 space-y-3 max-h-[360px] overflow-y-auto">
                    
                    {/* Source Preview */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
                        <span className="uppercase tracking-wider">
                          Source {modalDetectedSource && modalSourceLang === 'auto' ? `(${modalDetectedSource.toUpperCase()})` : ''}
                        </span>
                        <button
                          onClick={() => handleSpeak(modalSourceText, modalSourceLang === 'auto' ? (modalDetectedSource || 'en') : modalSourceLang)}
                          title="Listen to original"
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-300 bg-black/20 p-2.5 rounded-lg border border-white/[0.04] max-h-20 overflow-y-auto leading-relaxed">
                        {modalSourceText}
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    {/* Translation Output */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
                        <span className="uppercase tracking-wider text-blue-400">Translation</span>
                        <button
                          onClick={() => handleSpeak(modalTranslatedText, modalTargetLang)}
                          title="Listen to translation"
                          className="p-1 text-slate-400 hover:text-blue-300 rounded hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {modalLoading ? (
                        <div className="space-y-2 py-2">
                          <div className="h-4 bg-white/10 rounded animate-pulse w-full"></div>
                          <div className="h-4 bg-white/10 rounded animate-pulse w-2/3"></div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-white leading-relaxed">
                            {modalTranslatedText}
                          </div>

                          {modalRomanization && (
                            <div className="text-xs text-blue-300 italic bg-blue-500/10 px-2 py-1 rounded inline-block">
                              {modalRomanization}
                            </div>
                          )}

                          {/* Dictionary Breakdown */}
                          {modalDictionary.length > 0 && (
                            <div className="pt-2 border-t border-white/[0.06] space-y-1">
                              {modalDictionary.map((item, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-semibold text-sky-400 italic">{item.partOfSpeech}: </span>
                                  <span className="text-slate-300">{item.terms.join(', ')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(modalTranslatedText);
                          setCopiedModal(true);
                          setTimeout(() => setCopiedModal(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedModal ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedModal ? 'Copied!' : 'Copy'}</span>
                      </button>

                      <a
                        href={`https://translate.google.com/?sl=${encodeURIComponent(modalSourceLang)}&tl=${encodeURIComponent(modalTargetLang)}&text=${encodeURIComponent(modalSourceText)}&op=translate`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <span>Google Translate</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: EXTENSION CODE & FILE INSPECTOR
            ===================================================================== */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Production Extension Source Files
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Ready-to-pack Firefox Manifest V3 files featuring Shadow DOM isolation, background script proxy, and glassmorphic styling.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSingleFile(activeCodeFile)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {activeCodeFile.name}</span>
                </button>
                <button
                  onClick={handleDownloadZip}
                  disabled={zipDownloading}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All (.zip)</span>
                </button>
              </div>
            </div>

            {/* File Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#13151f] rounded-xl border border-white/[0.08] overflow-x-auto">
              {EXTENSION_FILES.map(file => (
                <button
                  key={file.name}
                  onClick={() => setActiveCodeFile(file)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    activeCodeFile.name === file.name
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{file.name}</span>
                </button>
              ))}
            </div>

            {/* Code Viewer Card */}
            <div className="bg-[#11131c] rounded-2xl border border-white/[0.08] shadow-xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#161824] border-b border-white/[0.06] flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-semibold text-blue-400">{activeCodeFile.path}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{activeCodeFile.description}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 rounded-lg border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{codeCopied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Code display */}
              <div className="p-4 sm:p-6 overflow-x-auto max-h-[600px] overflow-y-auto bg-[#0d0e14]">
                <pre className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed">
                  <code>{activeCodeFile.content}</code>
                </pre>
              </div>
            </div>

            {/* Architectural Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#141622] border border-white/[0.06]">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" /> Shadow DOM Isolation
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The extension encapsulates its UI inside an Open Shadow Root. Host websites with aggressive CSS (like global reset sheets) cannot alter extension button or font styling.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#141622] border border-white/[0.06]">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" /> Manifest V3 Gecko Config
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Uses Firefox's official Manifest V3 standard with <code className="text-indigo-300">browser_specific_settings.gecko</code>, background scripts, and fine-grained host permissions for instant local loading.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#141622] border border-white/[0.06]">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-sky-400" /> Free Client API Endpoint
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Queries Google Translate's lightweight GTX endpoint directly, parsing segmented phrases, romanization, and dictionary parts of speech without requiring paid API keys.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: FIREFOX ABOUT:DEBUGGING INSTALLATION GUIDE
            ===================================================================== */}
        {activeTab === 'firefox' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                How to Load and Test in Firefox
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Firefox allows direct, instantaneous loading of temporary Manifest V3 add-ons without needing developer accounts or signing.
              </p>
            </div>

            {/* Step-by-Step Interactive Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-[#12141f] border border-white/[0.08] space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-sm flex items-center justify-center">
                  1
                </div>
                <h3 className="text-base font-semibold text-white">
                  Download & Extract the Extension
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Click the <strong>"Download .ZIP"</strong> button in the top navigation bar. Extract the downloaded zip file into a folder on your computer (for instance, <code className="text-slate-300 bg-white/5 px-1.5 py-0.5 rounded">~/Downloads/dark-translate</code>).
                </p>
                <button
                  onClick={handleDownloadZip}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Extension .ZIP</span>
                </button>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-[#12141f] border border-white/[0.08] space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center">
                  2
                </div>
                <h3 className="text-base font-semibold text-white">
                  Navigate to Firefox Debugging
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Open a new tab in Firefox and enter the following address into your URL bar:
                </p>
                <div className="p-3 bg-[#0c0d13] rounded-lg border border-white/10 font-mono text-xs text-blue-300 select-all flex items-center justify-between">
                  <span>about:debugging#/runtime/this-firefox</span>
                  <button
                    onClick={() => navigator.clipboard.writeText('about:debugging#/runtime/this-firefox')}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Alternatively: type <code className="text-slate-400">about:debugging</code> and click <strong>"This Firefox"</strong> in the left sidebar menu.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-[#12141f] border border-white/[0.08] space-y-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-sm flex items-center justify-center">
                  3
                </div>
                <h3 className="text-base font-semibold text-white">
                  Load Temporary Add-on
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  In the <strong>Temporary Extensions</strong> section, click the button labeled <strong>"Load Temporary Add-on..."</strong>.
                </p>
                <div className="p-3 bg-white/[0.04] rounded-lg border border-white/10 text-xs text-slate-300">
                  📁 Navigate inside the extracted folder and select <strong className="text-white">manifest.json</strong>.
                </div>
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Dark Translate will instantly appear active in your extensions list!
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-2xl bg-[#12141f] border border-white/[0.08] space-y-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center">
                  4
                </div>
                <h3 className="text-base font-semibold text-white">
                  Highlight Text on Any Website
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Open any website (such as Wikipedia, BBC, GitHub, or Reddit). Highlight any foreign phrase or sentence with your cursor:
                </p>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Click the floating Google Translate icon.</li>
                  <li>Enjoy instant translation to Portuguese (or chosen language).</li>
                  <li>Click the speaker button to hear native pronunciation.</li>
                </ul>
              </div>
            </div>

            {/* Development Tips */}
            <div className="p-5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <h3 className="text-sm font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> Pro Development Tip: Live Hot Reloading
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When editing <code className="text-white">content.js</code> or <code className="text-white">styles.css</code>, simply click the <strong>"Reload"</strong> button next to Dark Translate in <code className="text-white">about:debugging</code>, then press F5 on your open tab to test changes immediately without reinstalling!
              </p>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: DIRECT TRANSLATOR TEST BENCH
            ===================================================================== */}
        {activeTab === 'quick' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Direct Translation Test Bench
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Test the underlying Google Translate GTX API and Web Speech API directly in your browser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Input Box */}
              <div className="bg-[#11131c] rounded-2xl border border-white/[0.08] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Source Language
                  </label>
                  <select
                    value={quickSource}
                    onChange={(e) => setQuickSource(e.target.value)}
                    className="bg-[#181a28] text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 outline-none cursor-pointer"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Enter text to translate..."
                  className="w-full bg-[#161824] border border-white/10 rounded-xl p-3.5 text-slate-200 text-sm leading-relaxed outline-none focus:border-blue-500 min-h-[140px]"
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleSpeak(quickInput, quickSource === 'auto' ? 'en' : quickSource)}
                    className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </button>

                  <button
                    onClick={handleRunQuickTranslate}
                    disabled={quickLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>{quickLoading ? 'Translating...' : 'Translate'}</span>
                  </button>
                </div>
              </div>

              {/* Output Box */}
              <div className="bg-[#11131c] rounded-2xl border border-white/[0.08] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    Target Language (Default: Portuguese)
                  </label>
                  <select
                    value={quickTarget}
                    onChange={(e) => setQuickTarget(e.target.value)}
                    className="bg-[#181a28] text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 outline-none cursor-pointer"
                  >
                    {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full bg-[#161824] border border-white/10 rounded-xl p-3.5 text-white text-sm leading-relaxed min-h-[140px] flex flex-col justify-between">
                  <div>
                    {quickLoading ? (
                      <div className="space-y-2 py-4">
                        <div className="h-4 bg-white/10 rounded animate-pulse w-full"></div>
                        <div className="h-4 bg-white/10 rounded animate-pulse w-3/4"></div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{quickOutput || 'Translation will appear here...'}</div>
                    )}
                  </div>

                  {quickOutput && (
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] mt-4">
                      <button
                        onClick={() => handleSpeak(quickOutput, quickTarget)}
                        className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(quickOutput);
                          setQuickCopied(true);
                          setTimeout(() => setQuickCopied(false), 2000);
                        }}
                        className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {quickCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{quickCopied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/[0.08] px-6 lg:px-12 py-6 bg-[#0a0b10] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>Dark Translate for Firefox</span>
            <span>·</span>
            <span>Manifest V3</span>
            <span>·</span>
            <span>Shadow DOM Isolated</span>
          </div>
          <div>
            Built with modern Web Extensions API & Google Translate GTX endpoint.
          </div>
        </div>
      </footer>

    </div>
  );
}
