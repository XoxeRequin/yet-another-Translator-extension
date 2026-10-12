/**
 * Complete, production-ready source code for Dark Translate Firefox Extension
 */

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    name: 'manifest.json',
    path: 'extension/manifest.json',
    language: 'json',
    description: 'Firefox Manifest V3 configuration with permissions, content scripts, and Gecko ID.',
    content: `{
  "manifest_version": 3,
  "name": "Dark Translate - Quick Web Translator",
  "version": "1.0.0",
  "description": "Modern dark glassmorphic inline translator for Firefox. Highlight text on any page for instant translation, dictionary definitions, and pronunciation.",
  "author": "Dark Translate Extension",
  "browser_specific_settings": {
    "gecko": {
      "id": "dark-translate@firefox.extension",
      "strict_min_version": "109.0"
    }
  },
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://translate.googleapis.com/*",
    "<all_urls>"
  ],
  "background": {
    "scripts": ["background.js"]
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "styles.css",
        "icons/icon-48.svg"
      ],
      "matches": ["<all_urls>"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Dark Translate Settings",
    "default_icon": {
      "48": "icons/icon-48.svg"
    }
  },
  "icons": {
    "48": "icons/icon-48.svg",
    "96": "icons/icon-48.svg"
  }
}`
  },
  {
    name: 'content.js',
    path: 'extension/content.js',
    language: 'javascript',
    description: 'Selection listener, floating trigger icon, Shadow DOM isolation, translation API caller, and Web Speech audio TTS.',
    content: `/**
 * Dark Translate - Content Script (Firefox Manifest V3)
 * Handles text selection, floating trigger icon, Shadow DOM isolation,
 * and translation modal with Google Translate API & Web Speech TTS.
 */

(() => {
  if (window.__darkTranslateInjected) return;
  window.__darkTranslateInjected = true;

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

  let currentSelectionText = '';
  let lastSelectionRect = null;
  let activeSourceLang = 'auto';
  let activeTargetLang = 'pt';
  let activeSpeech = null;
  let hostEl = null;
  let shadowRoot = null;
  let triggerBtn = null;
  let modalEl = null;

  function ensureShadowRoot() {
    if (shadowRoot) return shadowRoot;

    hostEl = document.createElement('div');
    hostEl.id = 'dark-translate-host';
    document.documentElement.appendChild(hostEl);

    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    const extensionApi = typeof browser !== 'undefined' ? browser : chrome;
    if (extensionApi && extensionApi.runtime && extensionApi.runtime.getURL) {
      styleLink.href = extensionApi.runtime.getURL('styles.css');
    }
    shadowRoot.appendChild(styleLink);

    return shadowRoot;
  }

  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') removeModal();
  });

  function handleMouseDown(e) {
    if (e.composedPath && e.composedPath().includes(hostEl)) return;
    removeTrigger();
    removeModal();
  }

  function handleMouseUp() {
    setTimeout(checkSelection, 10);
  }

  function handleKeyUp(e) {
    if (e.key.startsWith('Arrow') || e.key === 'Shift') {
      setTimeout(checkSelection, 10);
    }
  }

  function checkSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      removeTrigger();
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length === 0 || text.length > 5000) {
      removeTrigger();
      return;
    }

    if (modalEl) return;

    currentSelectionText = text;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    lastSelectionRect = rect;
    renderFloatingTrigger(rect);
  }

  function renderFloatingTrigger(rect) {
    ensureShadowRoot();
    removeTrigger();

    triggerBtn = document.createElement('div');
    triggerBtn.className = 'dt-trigger';
    triggerBtn.setAttribute('title', 'Translate selection');

    triggerBtn.innerHTML = \`
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.11 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="#60a5fa"/>
      </svg>
    \`;

    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    let posX = rect.right + scrollX + 4;
    let posY = rect.bottom + scrollY + 4;

    if (posX + 36 > window.innerWidth + scrollX) {
      posX = rect.left + scrollX - 36;
    }
    if (posX < 8) posX = 8;

    triggerBtn.style.left = \`\${posX}px\`;
    triggerBtn.style.top = \`\${posY}px\`;

    triggerBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal(currentSelectionText, lastSelectionRect);
      removeTrigger();
    });

    shadowRoot.appendChild(triggerBtn);
  }

  function removeTrigger() {
    if (triggerBtn && triggerBtn.parentNode) {
      triggerBtn.parentNode.removeChild(triggerBtn);
    }
    triggerBtn = null;
  }

  function openModal(text, rect) {
    ensureShadowRoot();
    removeModal();

    modalEl = document.createElement('div');
    modalEl.className = 'dt-modal';

    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    let left = rect.left + scrollX;
    let top = rect.bottom + scrollY + 8;

    const modalWidth = 360;
    if (left + modalWidth > window.innerWidth + scrollX - 16) {
      left = window.innerWidth + scrollX - modalWidth - 16;
    }
    if (left < scrollX + 16) {
      left = scrollX + 16;
    }

    if (top + 340 > window.innerHeight + scrollY) {
      top = rect.top + scrollY - 350;
      if (top < scrollY + 16) top = scrollY + 16;
    }

    modalEl.style.left = \`\${left}px\`;
    modalEl.style.top = \`\${top}px\`;

    modalEl.innerHTML = \`
      <div class="dt-header">
        <div class="dt-brand">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.11 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="#60a5fa"/>
          </svg>
          <span>Dark Translate</span>
        </div>
        <div class="dt-header-actions">
          <button class="dt-icon-btn dt-close-btn" title="Close (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="dt-lang-bar">
        <div class="dt-select-wrapper">
          <select class="dt-select dt-source-select">
            \${LANGUAGES.map(l => \`<option value="\${l.code}" \${l.code === activeSourceLang ? 'selected' : ''}>\${l.name}</option>\`).join('')}
          </select>
          <svg class="dt-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <button class="dt-swap-btn" title="Swap Languages">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 3 21 8 16 13"></polyline>
            <line x1="21" y1="8" x2="9" y2="8"></line>
            <polyline points="8 21 3 16 8 11"></polyline>
            <line x1="3" y1="16" x2="15" y2="16"></line>
          </svg>
        </button>

        <div class="dt-select-wrapper">
          <select class="dt-select dt-target-select">
            \${LANGUAGES.filter(l => l.code !== 'auto').map(l => \`<option value="\${l.code}" \${l.code === activeTargetLang ? 'selected' : ''}>\${l.name}</option>\`).join('')}
          </select>
          <svg class="dt-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <div class="dt-content">
        <div class="dt-source-box">
          <div class="dt-box-meta">
            <span class="dt-meta-label dt-source-meta-label">Source</span>
            <div class="dt-meta-actions">
              <button class="dt-icon-btn dt-speak-source" title="Listen (Original)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="dt-source-text"></div>
        </div>

        <div class="dt-divider"></div>

        <div class="dt-target-box">
          <div class="dt-box-meta">
            <span class="dt-meta-label">Translation</span>
            <div class="dt-meta-actions">
              <button class="dt-icon-btn dt-speak-target" title="Listen (Translation)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="dt-output-container">
            <div class="dt-loading-skeleton">
              <div class="dt-skeleton-line"></div>
              <div class="dt-skeleton-line short"></div>
            </div>
          </div>
        </div>

        <div class="dt-footer">
          <div class="dt-footer-actions">
            <button class="dt-action-btn dt-copy-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <a href="#" target="_blank" class="dt-google-link">
            <span>Google Translate</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    \`;

    const sourceTextEl = modalEl.querySelector('.dt-source-text');
    sourceTextEl.textContent = text;

    const sourceSelect = modalEl.querySelector('.dt-source-select');
    const targetSelect = modalEl.querySelector('.dt-target-select');
    const swapBtn = modalEl.querySelector('.dt-swap-btn');
    const closeBtn = modalEl.querySelector('.dt-close-btn');
    const speakSourceBtn = modalEl.querySelector('.dt-speak-source');

    closeBtn.addEventListener('click', removeModal);

    swapBtn.addEventListener('click', () => {
      const detectedOrSource = activeSourceLang === 'auto' ? 'en' : activeSourceLang;
      const prevTarget = activeTargetLang;
      activeTargetLang = detectedOrSource;
      activeSourceLang = prevTarget;

      sourceSelect.value = activeSourceLang;
      targetSelect.value = activeTargetLang;
      triggerTranslation(text);
    });

    sourceSelect.addEventListener('change', (e) => {
      activeSourceLang = e.target.value;
      triggerTranslation(text);
    });

    targetSelect.addEventListener('change', (e) => {
      activeTargetLang = e.target.value;
      triggerTranslation(text);
    });

    speakSourceBtn.addEventListener('click', () => {
      speakText(text, activeSourceLang === 'auto' ? 'en' : activeSourceLang);
    });

    modalEl.addEventListener('mousedown', (e) => e.stopPropagation());

    shadowRoot.appendChild(modalEl);
    triggerTranslation(text);
  }

  function removeModal() {
    if (activeSpeech) {
      window.speechSynthesis.cancel();
      activeSpeech = null;
    }
    if (modalEl && modalEl.parentNode) {
      modalEl.parentNode.removeChild(modalEl);
    }
    modalEl = null;
  }

  async function triggerTranslation(text) {
    if (!modalEl) return;
    const outputContainer = modalEl.querySelector('.dt-output-container');
    const sourceMetaLabel = modalEl.querySelector('.dt-source-meta-label');
    const copyBtn = modalEl.querySelector('.dt-copy-btn');
    const speakTargetBtn = modalEl.querySelector('.dt-speak-target');
    const googleLink = modalEl.querySelector('.dt-google-link');

    outputContainer.innerHTML = \`
      <div class="dt-loading-skeleton">
        <div class="dt-skeleton-line"></div>
        <div class="dt-skeleton-line short"></div>
      </div>
    \`;

    try {
      const data = await fetchTranslationData(text, activeSourceLang, activeTargetLang);

      outputContainer.innerHTML = \`
        <div class="dt-target-text">\${escapeHtml(data.translatedText)}</div>
        \${data.romanization ? \`<div class="dt-romanization">\${escapeHtml(data.romanization)}</div>\` : ''}
        \${renderDictionary(data.dictionary)}
      \`;

      if (data.detectedSource && activeSourceLang === 'auto') {
        const detectedName = LANGUAGES.find(l => l.code === data.detectedSource)?.name || data.detectedSource.toUpperCase();
        sourceMetaLabel.textContent = \`Source (Detected: \${detectedName})\`;
      }

      googleLink.href = \`https://translate.google.com/?sl=\${encodeURIComponent(activeSourceLang)}&tl=\${encodeURIComponent(activeTargetLang)}&text=\${encodeURIComponent(text)}&op=translate\`;

      copyBtn.onclick = () => {
        navigator.clipboard.writeText(data.translatedText).then(() => {
          copyBtn.classList.add('active');
          copyBtn.innerHTML = \`
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
          \`;
          setTimeout(() => {
            copyBtn.classList.remove('active');
            copyBtn.innerHTML = \`
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            \`;
          }, 1800);
        });
      };

      speakTargetBtn.onclick = () => {
        speakText(data.translatedText, activeTargetLang);
      };

    } catch (err) {
      outputContainer.innerHTML = \`
        <div class="dt-error-msg">
          Unable to translate. Check connection or try another language.
        </div>
      \`;
    }
  }

  async function fetchTranslationData(text, source, target) {
    const extensionApi = typeof browser !== 'undefined' ? browser : chrome;

    if (extensionApi && extensionApi.runtime && extensionApi.runtime.sendMessage) {
      try {
        const response = await extensionApi.runtime.sendMessage({
          action: 'translate',
          text,
          source,
          target
        });
        if (response && response.success && response.data) {
          return response.data;
        }
      } catch (e) {
        // Fall back to direct fetch
      }
    }

    const url = \`https://translate.googleapis.com/translate_a/single?client=gtx&sl=\${encodeURIComponent(source)}&tl=\${encodeURIComponent(target)}&dt=t&dt=bd&dt=rm&q=\${encodeURIComponent(text.trim())}\`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(\`HTTP error \${res.status}\`);

    const raw = await res.json();
    let translatedText = '';
    let romanization = '';

    if (Array.isArray(raw[0])) {
      for (const segment of raw[0]) {
        if (segment && segment[0]) translatedText += segment[0];
        if (segment && segment[2]) romanization = segment[2];
        else if (segment && segment[3]) romanization = segment[3];
      }
    }

    const detectedSource = raw[2] || source;
    let dictionary = [];
    if (Array.isArray(raw[1])) {
      dictionary = raw[1].map(item => ({
        partOfSpeech: item[0],
        terms: Array.isArray(item[1]) ? item[1].slice(0, 4) : []
      }));
    }

    return {
      originalText: text,
      translatedText: translatedText.trim(),
      romanization: romanization ? romanization.trim() : null,
      detectedSource,
      dictionary
    };
  }

  function speakText(text, langCode) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const localeMap = {
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
    activeSpeech = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderDictionary(dict) {
    if (!dict || !dict.length) return '';
    return \`
      <div class="dt-dict">
        \${dict.map(d => \`
          <div class="dt-dict-item">
            <span class="dt-dict-pos">\${escapeHtml(d.partOfSpeech)}:</span>
            <span class="dt-dict-terms">\${escapeHtml(d.terms.join(', '))}</span>
          </div>
        \`).join('')}
      </div>
    \`;
  }
})();`
  },
  {
    name: 'styles.css',
    path: 'extension/styles.css',
    language: 'css',
    description: 'Modern glassmorphic dark theme styles scoped to Shadow DOM with blur and animations.',
    content: `/* ==========================================================================
   Dark Translate - Modern Glassmorphic Extension Styles
   Scoped entirely within Open Shadow DOM root
   ========================================================================== */

:host {
  all: initial;
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.dt-trigger {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(20, 20, 26, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2147483647;
  transform-origin: center;
  animation: dt-pop-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
}

.dt-trigger:hover {
  transform: scale(1.12);
  background: rgba(28, 30, 40, 0.98);
  border-color: rgba(96, 165, 250, 0.6);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(59, 130, 246, 0.5);
}

.dt-trigger svg {
  width: 17px;
  height: 17px;
  display: block;
}

.dt-modal {
  position: absolute;
  width: 360px;
  max-width: calc(100vw - 32px);
  background: rgba(20, 20, 26, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  z-index: 2147483647;
  overflow: hidden;
  animation: dt-modal-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform-origin: top left;
  user-select: text;
}

.dt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dt-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #93c5fd;
  letter-spacing: 0.2px;
}

.dt-brand svg {
  width: 15px;
  height: 15px;
}

.dt-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dt-icon-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dt-icon-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.1);
}

.dt-icon-btn svg {
  width: 14px;
  height: 14px;
}

.dt-lang-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dt-select-wrapper {
  position: relative;
  flex: 1;
}

.dt-select {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  padding: 6px 22px 6px 9px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}

.dt-select:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.dt-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.dt-select option {
  background: #181920;
  color: #e2e8f0;
}

.dt-select-arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #64748b;
  width: 10px;
  height: 10px;
}

.dt-swap-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dt-swap-btn:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: #93c5fd;
  transform: rotate(180deg);
}

.dt-swap-btn svg {
  width: 13px;
  height: 13px;
}

.dt-content {
  padding: 12px 14px;
  max-height: 380px;
  overflow-y: auto;
}

.dt-source-box {
  margin-bottom: 12px;
}

.dt-box-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.dt-meta-label {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dt-meta-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dt-source-text {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.55;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 10px;
  border-radius: 8px;
  max-height: 90px;
  overflow-y: auto;
  word-break: break-word;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.dt-divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02));
  margin: 10px 0 12px 0;
}

.dt-target-text {
  font-size: 14.5px;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
  margin-bottom: 8px;
}

.dt-romanization {
  font-size: 12px;
  color: #93c5fd;
  font-style: italic;
  margin-bottom: 8px;
  padding: 3px 6px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  display: inline-block;
}

.dt-dict {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.dt-dict-item {
  margin-bottom: 6px;
}

.dt-dict-pos {
  font-size: 11px;
  font-weight: 600;
  color: #38bdf8;
  font-style: italic;
}

.dt-dict-terms {
  font-size: 12px;
  color: #cbd5e1;
  margin-left: 6px;
}

.dt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.dt-footer-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dt-action-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dt-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.dt-action-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: #93c5fd;
}

.dt-google-link {
  color: #64748b;
  text-decoration: none;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.dt-google-link:hover {
  color: #94a3b8;
}

.dt-loading-skeleton {
  padding: 6px 0;
}

.dt-skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: dt-shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

.dt-skeleton-line.short {
  width: 60%;
}

.dt-error-msg {
  color: #f87171;
  font-size: 12px;
  padding: 8px 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
}

@keyframes dt-pop-in {
  0% { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes dt-modal-in {
  0% { opacity: 0; transform: translateY(4px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes dt-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`
  },
  {
    name: 'background.js',
    path: 'extension/background.js',
    language: 'javascript',
    description: 'Firefox MV3 background service listener for cross-origin API fetch and CSP protection.',
    content: `/**
 * Dark Translate - Firefox MV3 Background Script
 * Handles cross-origin translation requests and storage synchronization
 */

const extensionApi = typeof browser !== 'undefined' ? browser : chrome;

extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'translate') {
    handleTranslation(message)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'getSettings') {
    extensionApi.storage.sync.get({
      targetLang: 'pt',
      sourceLang: 'auto',
      autoTranslate: false,
      enableTTS: true,
      theme: 'dark'
    }).then(settings => sendResponse(settings))
      .catch(() => sendResponse({ targetLang: 'pt', sourceLang: 'auto' }));
    return true;
  }
});

async function handleTranslation({ text, source = 'auto', target = 'pt' }) {
  if (!text || !text.trim()) {
    throw new Error('Empty text provided for translation');
  }

  const cleanText = text.trim();
  const endpoint = \`https://translate.googleapis.com/translate_a/single?client=gtx&sl=\${encodeURIComponent(source)}&tl=\${encodeURIComponent(target)}&dt=t&dt=bd&dt=rm&q=\${encodeURIComponent(cleanText)}\`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(\`Translation API error: HTTP \${response.status}\`);
  }

  const raw = await response.json();
  let translatedText = '';
  let romanization = '';
  
  if (Array.isArray(raw[0])) {
    for (const segment of raw[0]) {
      if (segment && segment[0]) translatedText += segment[0];
      if (segment && segment[2]) romanization = segment[2];
      else if (segment && segment[3]) romanization = segment[3];
    }
  }

  const detectedSource = raw[2] || source;
  let dictionary = [];
  if (Array.isArray(raw[1])) {
    dictionary = raw[1].map(item => ({
      partOfSpeech: item[0],
      terms: Array.isArray(item[1]) ? item[1].slice(0, 5) : []
    }));
  }

  return {
    originalText: cleanText,
    translatedText: translatedText.trim(),
    romanization: romanization ? romanization.trim() : null,
    detectedSource: detectedSource,
    sourceLang: source,
    targetLang: target,
    dictionary: dictionary
  };
}`
  },
  {
    name: 'popup.html',
    path: 'extension/popup.html',
    language: 'html',
    description: 'Firefox browser action popup interface for direct translation and user settings.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dark Translate</title>
  <style>
    :root {
      --bg: #0f1015;
      --surface: #181922;
      --border: rgba(255, 255, 255, 0.1);
      --accent: #3b82f6;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 320px;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      padding: 14px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .header h1 { font-size: 14px; font-weight: 600; color: #93c5fd; }
    .control-group { margin-bottom: 10px; }
    label {
      display: block; font-size: 11px; font-weight: 500;
      color: var(--text-muted); margin-bottom: 4px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    select, textarea {
      width: 100%; background: var(--surface);
      border: 1px solid var(--border); color: var(--text);
      border-radius: 8px; padding: 8px; font-size: 12px; outline: none;
    }
    select:focus, textarea:focus { border-color: var(--accent); }
    textarea { resize: vertical; min-height: 60px; }
    .btn {
      width: 100%; background: var(--accent); color: white;
      border: none; border-radius: 8px; padding: 8px;
      font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 8px;
    }
    .btn:hover { background: #2563eb; }
    .output {
      margin-top: 10px; background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border); border-radius: 8px;
      padding: 10px; font-size: 13px; min-height: 48px;
      word-break: break-word; display: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Dark Translate</h1>
  </div>
  <div class="control-group">
    <label for="targetLang">Default Target Language</label>
    <select id="targetLang">
      <option value="pt" selected>Portuguese (Português)</option>
      <option value="en">English</option>
      <option value="es">Spanish (Español)</option>
      <option value="fr">French (Français)</option>
      <option value="de">German (Deutsch)</option>
      <option value="it">Italian (Italiano)</option>
    </select>
  </div>
  <div class="control-group">
    <label for="quickText">Quick Translate Text</label>
    <textarea id="quickText" placeholder="Type or paste text to translate..."></textarea>
    <button class="btn" id="translateBtn">Translate</button>
  </div>
  <div id="quickOutput" class="output"></div>
  <script src="popup.js"></script>
</body>
</html>`
  },
  {
    name: 'README.md',
    path: 'extension/README.md',
    language: 'markdown',
    description: 'Step-by-step instructions for loading in Firefox about:debugging.',
    content: `# Dark Translate - Firefox Web Extension (Manifest V3)

A modern, dark-mode glassmorphic Firefox extension inspired by the classic Google Translate floating trigger UX.

## 🛠️ How to Load and Test in Firefox (\`about:debugging\`)

1. **Open Firefox**.
2. Navigate to \`about:debugging#/runtime/this-firefox\` (or type \`about:debugging\` and click **"This Firefox"**).
3. Click the **"Load Temporary Add-on..."** button.
4. Select the \`manifest.json\` file located inside this extracted \`extension/\` folder.
5. Open any webpage, highlight text, and click the floating translation button!`
  }
];
