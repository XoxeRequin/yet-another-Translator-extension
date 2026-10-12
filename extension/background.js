/**
 * Dark Translate - Firefox MV3 Background Script
 * Handles cross-origin translation requests and storage synchronization
 */

// Cross-browser compatibility shim (supports both browser.* and chrome.*)
const extensionApi = typeof browser !== 'undefined' ? browser : chrome;

// Listen for messages from content scripts or popup
extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'translate') {
    handleTranslation(message)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
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

/**
 * Fetch translation directly via Google Translate GTX API
 */
async function handleTranslation({ text, source = 'auto', target = 'pt' }) {
  if (!text || !text.trim()) {
    throw new Error('Empty text provided for translation');
  }

  const cleanText = text.trim();
  const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(cleanText)}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Translation API error: HTTP ${response.status}`);
  }

  const raw = await response.json();

  // Parse translated segments
  let translatedText = '';
  let romanization = '';
  
  if (Array.isArray(raw[0])) {
    for (const segment of raw[0]) {
      if (segment && segment[0]) {
        translatedText += segment[0];
      }
      // dt=rm romanization
      if (segment && segment[2]) {
        romanization = segment[2];
      } else if (segment && segment[3]) {
        romanization = segment[3];
      }
    }
  }

  // Detected source language
  const detectedSource = raw[2] || source;

  // Dictionary definitions (for words/short phrases)
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
}
