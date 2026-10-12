/**
 * Dark Translate - Content Script (Firefox Manifest V3)
 * Handles text selection, floating trigger icon, Shadow DOM isolation,
 * and translation modal with Google Translate API & Web Speech TTS.
 */

(() => {
  // Prevent duplicate injection
  if (window.__darkTranslateInjected) return;
  window.__darkTranslateInjected = true;

  // Language list mapping
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

  // Extension State
  let currentSelectionText = '';
  let lastSelectionRect = null;
  let activeSourceLang = 'auto';
  let activeTargetLang = 'pt'; // Default Portuguese as requested
  let activeSpeech = null;
  let hostEl = null;
  let shadowRoot = null;
  let triggerBtn = null;
  let modalEl = null;

  // --------------------------------------------------------------------------
  // 1. Shadow DOM Initialization (Style Isolation)
  // --------------------------------------------------------------------------
  function ensureShadowRoot() {
    if (shadowRoot) return shadowRoot;

    hostEl = document.createElement('div');
    hostEl.id = 'dark-translate-host';
    document.documentElement.appendChild(hostEl);

    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    // Link stylesheet
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    const extensionApi = typeof browser !== 'undefined' ? browser : chrome;
    if (extensionApi && extensionApi.runtime && extensionApi.runtime.getURL) {
      styleLink.href = extensionApi.runtime.getURL('styles.css');
    }
    shadowRoot.appendChild(styleLink);

    return shadowRoot;
  }

  // --------------------------------------------------------------------------
  // 2. Selection Event Listeners
  // --------------------------------------------------------------------------
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') removeModal();
  });

  function handleMouseDown(e) {
    // If click is inside our shadow DOM, ignore
    if (e.composedPath && e.composedPath().includes(hostEl)) return;

    // If click is outside, remove trigger button and modal
    removeTrigger();
    removeModal();
  }

  function handleMouseUp(e) {
    // Delay slightly to let the browser finalize selection
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

    // Do not show trigger if user is interacting inside the modal
    if (modalEl) return;

    currentSelectionText = text;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    lastSelectionRect = rect;
    renderFloatingTrigger(rect);
  }

  // --------------------------------------------------------------------------
  // 3. Floating Trigger Button
  // --------------------------------------------------------------------------
  function renderFloatingTrigger(rect) {
    ensureShadowRoot();
    removeTrigger();

    triggerBtn = document.createElement('div');
    triggerBtn.className = 'dt-trigger';
    triggerBtn.setAttribute('title', 'Translate selection');

    // Google Translate styled icon
    triggerBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.11 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="#60a5fa"/>
      </svg>
    `;

    // Position right near text cursor / bottom-right of selection
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    let posX = rect.right + scrollX + 4;
    let posY = rect.bottom + scrollY + 4;

    // Viewport bounds check
    if (posX + 36 > window.innerWidth + scrollX) {
      posX = rect.left + scrollX - 36;
    }
    if (posX < 8) posX = 8;

    triggerBtn.style.left = `${posX}px`;
    triggerBtn.style.top = `${posY}px`;

    // Click handler to open popup
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

  // --------------------------------------------------------------------------
  // 4. Floating Translation Modal / Popup
  // --------------------------------------------------------------------------
  function openModal(text, rect) {
    ensureShadowRoot();
    removeModal();

    modalEl = document.createElement('div');
    modalEl.className = 'dt-modal';

    // Position modal near selection bounds
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    let left = rect.left + scrollX;
    let top = rect.bottom + scrollY + 8;

    // Adjust if overflowing horizontally
    const modalWidth = 360;
    if (left + modalWidth > window.innerWidth + scrollX - 16) {
      left = window.innerWidth + scrollX - modalWidth - 16;
    }
    if (left < scrollX + 16) {
      left = scrollX + 16;
    }

    // Adjust if overflowing vertically bottom
    if (top + 340 > window.innerHeight + scrollY) {
      top = rect.top + scrollY - 350;
      if (top < scrollY + 16) {
        top = scrollY + 16;
      }
    }

    modalEl.style.left = `${left}px`;
    modalEl.style.top = `${top}px`;

    // Render Modal Skeleton & Structure
    modalEl.innerHTML = `
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
            ${LANGUAGES.map(l => `<option value="${l.code}" ${l.code === activeSourceLang ? 'selected' : ''}>${l.name}</option>`).join('')}
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
            ${LANGUAGES.filter(l => l.code !== 'auto').map(l => `<option value="${l.code}" ${l.code === activeTargetLang ? 'selected' : ''}>${l.name}</option>`).join('')}
          </select>
          <svg class="dt-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <div class="dt-content">
        <!-- Source Preview -->
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

        <!-- Target Output -->
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

        <!-- Footer / Copy / External Link -->
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
    `;

    // Wire Up Controls
    const sourceTextEl = modalEl.querySelector('.dt-source-text');
    sourceTextEl.textContent = text;

    const sourceSelect = modalEl.querySelector('.dt-source-select');
    const targetSelect = modalEl.querySelector('.dt-target-select');
    const swapBtn = modalEl.querySelector('.dt-swap-btn');
    const closeBtn = modalEl.querySelector('.dt-close-btn');
    const copyBtn = modalEl.querySelector('.dt-copy-btn');
    const speakSourceBtn = modalEl.querySelector('.dt-speak-source');
    const speakTargetBtn = modalEl.querySelector('.dt-speak-target');
    const googleLink = modalEl.querySelector('.dt-google-link');

    // Close Button
    closeBtn.addEventListener('click', removeModal);

    // Swap Languages
    swapBtn.addEventListener('click', () => {
      const detectedOrSource = activeSourceLang === 'auto' ? 'en' : activeSourceLang;
      const prevTarget = activeTargetLang;
      activeTargetLang = detectedOrSource;
      activeSourceLang = prevTarget;

      sourceSelect.value = activeSourceLang;
      targetSelect.value = activeTargetLang;
      triggerTranslation(text);
    });

    // Language Select Change
    sourceSelect.addEventListener('change', (e) => {
      activeSourceLang = e.target.value;
      triggerTranslation(text);
    });

    targetSelect.addEventListener('change', (e) => {
      activeTargetLang = e.target.value;
      triggerTranslation(text);
    });

    // TTS Buttons
    speakSourceBtn.addEventListener('click', () => {
      speakText(text, activeSourceLang === 'auto' ? 'en' : activeSourceLang);
    });

    // Prevent click events inside modal from bubbling out to page
    modalEl.addEventListener('mousedown', (e) => e.stopPropagation());

    shadowRoot.appendChild(modalEl);

    // Initial Translation Fetch
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

  // --------------------------------------------------------------------------
  // 5. Translation Fetcher (Direct or Background Message)
  // --------------------------------------------------------------------------
  async function triggerTranslation(text) {
    if (!modalEl) return;
    const outputContainer = modalEl.querySelector('.dt-output-container');
    const sourceMetaLabel = modalEl.querySelector('.dt-source-meta-label');
    const copyBtn = modalEl.querySelector('.dt-copy-btn');
    const speakTargetBtn = modalEl.querySelector('.dt-speak-target');
    const googleLink = modalEl.querySelector('.dt-google-link');

    // Show loading skeleton
    outputContainer.innerHTML = `
      <div class="dt-loading-skeleton">
        <div class="dt-skeleton-line"></div>
        <div class="dt-skeleton-line short"></div>
      </div>
    `;

    try {
      const data = await fetchTranslationData(text, activeSourceLang, activeTargetLang);

      // Render Translated Result
      outputContainer.innerHTML = `
        <div class="dt-target-text">${escapeHtml(data.translatedText)}</div>
        ${data.romanization ? `<div class="dt-romanization">${escapeHtml(data.romanization)}</div>` : ''}
        ${renderDictionary(data.dictionary)}
      `;

      // Update Detected Language Label
      if (data.detectedSource && activeSourceLang === 'auto') {
        const detectedName = LANGUAGES.find(l => l.code === data.detectedSource)?.name || data.detectedSource.toUpperCase();
        sourceMetaLabel.textContent = `Source (Detected: ${detectedName})`;
      }

      // External Google Translate Link
      googleLink.href = `https://translate.google.com/?sl=${encodeURIComponent(activeSourceLang)}&tl=${encodeURIComponent(activeTargetLang)}&text=${encodeURIComponent(text)}&op=translate`;

      // Copy Action
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(data.translatedText).then(() => {
          copyBtn.classList.add('active');
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
          `;
          setTimeout(() => {
            copyBtn.classList.remove('active');
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            `;
          }, 1800);
        });
      };

      // TTS Action for Target
      speakTargetBtn.onclick = () => {
        speakText(data.translatedText, activeTargetLang);
      };

    } catch (err) {
      outputContainer.innerHTML = `
        <div class="dt-error-msg">
          Unable to translate. Check connection or try another language.
        </div>
      `;
    }
  }

  async function fetchTranslationData(text, source, target) {
    const extensionApi = typeof browser !== 'undefined' ? browser : chrome;

    // Try background script proxy first (handles strict CSPs on sites like GitHub)
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
        // Fall back to direct fetch if background script not accessible
      }
    }

    // Direct Google Translate GTX fetch
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

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

  // --------------------------------------------------------------------------
  // 6. Speech Synthesis (Audio / TTS)
  // --------------------------------------------------------------------------
  function speakText(text, langCode) {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Map short code to BCP 47 locale
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

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(langCode));
    if (voice) utterance.voice = voice;

    activeSpeech = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // --------------------------------------------------------------------------
  // 7. Helpers
  // --------------------------------------------------------------------------
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
    return `
      <div class="dt-dict">
        ${dict.map(d => `
          <div class="dt-dict-item">
            <span class="dt-dict-pos">${escapeHtml(d.partOfSpeech)}:</span>
            <span class="dt-dict-terms">${escapeHtml(d.terms.join(', '))}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
})();
