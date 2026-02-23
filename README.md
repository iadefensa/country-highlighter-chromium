# Country Highlighter

[![Steady](https://badgen.net/static/support/this%20project/black)](https://steady.page/en/meiert) [![Buy Me a Coffee](https://badgen.net/static/support/this%20project/pink?icon=buymeacoffee)](https://buymeacoffee.com/meiert)

A Chromium browser extension that highlights people and organizations as well as content from and about specific countries on social media platforms.

## Features

* **All countries included:** Pre-configured with all countries
* **Multi-language support:** Detects country names in English, German, French, Spanish, and other languages (more translations welcome)
* **Flag detection:** Automatically recognizes country flag emoji (🇩🇪, 🇺🇸, etc.)
* **Configurable highlighting:** Choose from three highlight levels:
  - **Subtle:** Underline matched terms
  - **Normal:** Yellow background on matched text (screen readers: polite announcement)
  - **Assertive:** Yellow background and page border (screen readers: assertive announcement)
* **Platform support:** Works on Twitter/X, Instagram, Facebook, LinkedIn, GitHub, Bluesky, and many Mastodon instances
* **Performance optimized:** Uses MutationObserver with debouncing for efficient dynamic content scanning

## Installation

### From the Chrome Web Store

1. **Go to the [County Highlighter extension page](https://chromewebstore.google.com/detail/country-highlighter/jjhldkllehdfgipblabnojkpfoohcogi)**

2. **Click “Add to Chrome” (or whatever your Chromium browser)**

### Locally

1. **Clone or download this repository**

2. **Open extensions page, e.g.:**

   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

3. **Enable developer mode:**

   - Toggle “Developer mode” switch in the top-right corner

4. **Load the extension:**

   - Click “Load unpacked”
   - Select the `country-highlighter` directory

5. **Verify installation:**

   - Extension icon should appear in your browser toolbar
   - Click icon to see quick toggle
   - Right-click icon → “Options” to configure settings

## Usage

### Quick Start

1. Click the extension icon in your toolbar
2. Ensure the toggle is enabled
3. Click “Open settings” to configure

### Configuration

**Options page** (right-click icon → “Options”):

* **Enable/disable extension:** Master on/off switch
* **Highlight style:** Choose subtle, normal, or assertive highlighting
* **Countries:** Select which countries to highlight (all enabled by default)
* **Platforms:** Choose which social media platforms to monitor

### Default Settings

* All countries enabled
* All platforms enabled
* Normal highlighting (yellow background)
* Extension enabled

## Supported Platforms

A selection (easily extensible via config/platforms.json):

* x.com, twitter.com
* instagram.com, facebook.com, threads.com
* linkedin.com, github.com
* bsky.app
* mastodon.social, mastodon.world, mastodon.online, mstdn.social, fosstodon.org, mas.to, techhub.social, indieweb.social, …

## How It Works

1. **Primary matching (fast):** Scans for flag emoji first
2. **Alias matching (thorough):** Then checks for country names in multiple languages
3. **Word boundary detection:** Avoids false positives (e.g., “Germany” won’t match “many”)
4. **Dynamic content:** Monitors page changes with MutationObserver (300 ms debounce)
5. **Performance:** Only scans visible text nodes, skips scripts/styles

### Browser Compatibility

* Chrome 88+
* Edge 88+
* Brave (Chromium-based)
* Opera (Chromium-based)

Requires Manifest V3 support.

### Privacy

* **No data collection:** Extension operates entirely locally
* **No network requests:** All configuration files are bundled
* **Chrome sync only:** Settings synced via Chrome’s built-in sync (optional)

## Customization for Developers

### File Structure

```
country-highlighter/
├── manifest.json          # Extension configuration
├── content.js             # Main highlighting logic
├── styles.css             # Content script styles
├── options.html           # Settings page UI
├── options.js             # Settings page logic
├── popup.html             # Toolbar popup UI
├── popup.js               # Toolbar popup logic
├── config/
│   ├── countries.json     # Country definitions
│   ├── platforms.json     # Platform list
│   └── styles.js          # Style configuration
└── images/                # Extension icons (16px, 48px, 128px)
    ├── icon-16.png
    ├── icon-48.png
    ├── icon-128.png
    └── icon.xcf           # Source file (GIMP)
```

### Adding Countries

Edit config/countries.json:

```json
{
  "name": "Country Name",
  "code": "XX",
  "flag": "🇽🇽",
  "aliases": ["English Name", "Native Name", "French Name", "German Name", "Spanish Name"]
}
```

### Adding Platforms

Edit config/platforms.json:

```json
[
  "example.com",
  "social.example.com"
]
```

Platform matching uses simple string inclusion (e.g., “linkedin.com” matches “www.linkedin.com”).

### Customizing Highlight Styles

Edit config/styles.js:

```javascript
export const HIGHLIGHT_STYLES = {
  subtle: {
    text: { /* CSS properties */ },
    page: null
  },
  normal: {
    text: { /* CSS properties */ },
    page: null
  },
  assertive: {
    text: { /* CSS properties */ },
    page: { /* CSS properties */ }
  }
};
```

Changes require extension reload (visit `chrome://extensions/` and click reload icon).

### Adjusting Profile Detection

Edit `PROFILE_CONTAINER_SELECTORS` in config/styles.js to improve per-profile border detection for specific platforms.

### Performance Notes

* **Optimized scanning:** Checks flags first (fast), then aliases (slower)
* **Debounced observer:** Waits 300 ms after DOM changes before scanning
* **Selective scanning:** Only processes visible text nodes
* **Cached patterns:** Compiles regex patterns once at initialization

Expected performance impact: <100ms on initial page load, negligible during scrolling.

### Troubleshooting

**Highlighting not working:**

1. Check extension is enabled (click toolbar icon)
2. Verify current site is in platform list (“Options” → “Platforms”)
3. Ensure at least one country is selected (“Options” → “Countries”)
4. Try refreshing the page

**Performance issues:**

1. Reduce number of enabled countries
2. Switch to “subtle” highlighting mode
3. Disable on platforms you don’t use

**Settings not saving:**

1. Check Chrome/Edge sync is enabled
2. Try clearing extension storage (“Reset to defaults”)
3. Reload extension from `chrome://extensions/`