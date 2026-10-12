# Dark Translate - Firefox Web Extension (Manifest V3)

A modern, dark-mode glassmorphic Firefox extension inspired by the classic Google Translate floating trigger UX.

## 🚀 Key Features
- **Selection Trigger**: Automatically reveals a floating Google Translate icon right beside selected text anywhere on the page.
- **Floating Glassmorphic Modal**: Dark translucent glassmorphism with `backdrop-filter: blur(16px)` and clean borders.
- **Shadow DOM Isolation**: Attached via `attachShadow({ mode: 'open' })` to completely prevent page CSS bleed and style collisions.
- **Language Controls**: Source language (with Auto-detect) and Target language (defaulting to Portuguese `pt`), plus a one-click Swap button.
- **Google Translate Free GTX Client API**: Real-time translations with romanization and dictionary definitions without requiring API keys or backend servers.
- **Web Speech Audio TTS**: Instant speech synthesis pronunciation for both source and translated text.
- **Cross-Site CSP Protection**: Backed by a Manifest V3 background script handler to bypass strict host CSPs.

---

## 🛠️ How to Load and Test in Firefox (`about:debugging`)

Follow these simple steps to load the extension in Firefox:

1. **Open Firefox**.
2. In the address bar, navigate to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
   *(or simply type `about:debugging` and click **"This Firefox"** in the left sidebar).*
3. Under the **Temporary Extensions** section, click the **"Load Temporary Add-on..."** button.
4. A file picker will appear:
   - Navigate into the `extension/` directory.
   - Select the `manifest.json` file (or any file within the directory, such as `manifest.json`).
5. **Success!** You will see **Dark Translate - Quick Web Translator** listed in the Temporary Extensions list.
6. **Test it immediately**:
   - Open any tab or website (e.g. `https://developer.mozilla.org`, Wikipedia, news sites).
   - Highlight any sentence or paragraph with your mouse.
   - The floating dark icon will appear near the cursor.
   - Click it to see the dark-mode popup translate your text in real time!
   - Test language switching, the Swap button, and the Audio speaker button.

### 🔄 Reloading Changes During Development
- Whenever you make edits to `content.js` or `styles.css`, simply go back to `about:debugging#/runtime/this-firefox` and click the **"Reload"** button next to Dark Translate.
- Refresh your test webpage tab to run the updated script.

---

## 📁 Directory Structure
```text
extension/
├── manifest.json       # Firefox Manifest V3 definition
├── content.js          # Selection listener, Shadow DOM & UI manager
├── styles.css          # Glassmorphic dark styling scoped to Shadow DOM
├── background.js       # MV3 background script for reliable cross-origin queries
├── popup.html          # Toolbar popup interface
├── popup.js            # Toolbar popup logic & settings persistence
├── icons/
│   └── icon-48.svg     # High-resolution extension icon
└── README.md           # Instructions and documentation
```
