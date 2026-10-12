/**
 * Dark Translate - Popup Logic
 */
const extensionApi = typeof browser !== 'undefined' ? browser : chrome;

const targetLangSelect = document.getElementById('targetLang');
const quickText = document.getElementById('quickText');
const translateBtn = document.getElementById('translateBtn');
const quickOutput = document.getElementById('quickOutput');

// Load stored target language
if (extensionApi && extensionApi.storage && extensionApi.storage.sync) {
  extensionApi.storage.sync.get(['targetLang'], (result) => {
    if (result.targetLang) {
      targetLangSelect.value = result.targetLang;
    }
  });

  targetLangSelect.addEventListener('change', () => {
    extensionApi.storage.sync.set({ targetLang: targetLangSelect.value });
  });
}

// Quick translate action
translateBtn.addEventListener('click', async () => {
  const text = quickText.value.trim();
  if (!text) return;

  const target = targetLangSelect.value;
  quickOutput.style.display = 'block';
  quickOutput.textContent = 'Translating...';

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    let result = '';
    if (Array.isArray(data[0])) {
      for (const seg of data[0]) {
        if (seg && seg[0]) result += seg[0];
      }
    }
    quickOutput.textContent = result || 'No translation received.';
  } catch (err) {
    quickOutput.textContent = 'Translation failed: ' + err.message;
  }
});
