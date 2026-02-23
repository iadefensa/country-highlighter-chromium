// Country Highlighter—Content Script
// Scans page for country names/flags and highlights them based on user preferences
// NOTE: HIGHLIGHT_STYLES is defined in config/styles.js (loaded before this script in manifest.json)

// State
let countries = [];
let enabledCountryCodes = new Set();
let highlightLevel = 'normal';
let platforms = [];
let isEnabled = false;
let pageHighlighted = false;
let currentUrl = window.location.href;
let liveRegion = null;
let viewportBorder = null;

// Optimized search patterns
let primaryPatterns = [];
let aliasPatterns = [];

// Initialize extension
async function init() {
  try {
    // Load configurations
    const [countriesResponse, platformsResponse] = await Promise.all([
      fetch(chrome.runtime.getURL('config/countries.json')),
      fetch(chrome.runtime.getURL('config/platforms.json'))
    ]);

    countries = await countriesResponse.json();
    const platformsData = await platformsResponse.json();

    // Parse platforms into a flat array of domains
    platforms = [];
    Object.keys(platformsData).forEach(key => {
      const value = platformsData[key];
      if (Array.isArray(value)) {
        // Mastodon instances
        platforms.push(...value);
      } else {
        // Regular platform domain
        platforms.push(value);
      }
    });

    // Check if current platform is enabled
    const currentHostname = window.location.hostname;
    const isPlatformEnabled = platforms.some(platform =>
      currentHostname.includes(platform)
    );

    if (!isPlatformEnabled) {
      // console.log('Country Highlighter: Platform not enabled');
      return;
    }

    // Load user settings
    const settings = await chrome.storage.sync.get({
      enabledCountries: countries.map(c => c.code),
      highlightLevel: 'normal',
      extensionEnabled: true
    });

    enabledCountryCodes = new Set(settings.enabledCountries);
    highlightLevel = settings.highlightLevel;
    isEnabled = settings.extensionEnabled;

    // console.log('Country Highlighter: Enabled countries:', enabledCountryCodes.size);
    // console.log('Country Highlighter: Highlight level:', highlightLevel);

    if (!isEnabled) {
      console.log('Country Highlighter: Extension disabled');
      return;
    }

    // Build optimized search patterns
    buildSearchPatterns();

    // console.log('Country Highlighter: Built patterns—flags:', primaryPatterns.length, 'aliases:', aliasPatterns.length);

    // Initial scan
    scanPage();

    // Watch for dynamic content with debouncing
    setupMutationObserver();

    // Watch for URL changes in SPAs (Mastodon, X, etc.)
    setupNavigationDetection();

    // Fibonacci-based re-scans to catch late-loading content (especially for SPAs like X)
    // Social media sites often load content in waves
    const fibonacciDelays = [1000, 2000, 3000, 5000, 8000, 13000, 21000, 34000, 55000, 89000, 144000];
    fibonacciDelays.forEach(delay => {
      setTimeout(() => {
        // console.log(`Country Highlighter: Running re-scan after ${delay}ms`);
        scanPage();
      }, delay);
    });

    // Periodic re-scans for long-lived pages with continuous updates
    setInterval(() => {
      // console.log('Country Highlighter: Running periodic re-scan');
      scanPage();
    }, 600000); // Every 10 minutes

    // console.log('Country Highlighter: Initialized successfully');

  } catch (error) {
    console.error('Country Highlighter initialization failed:', error);
  }
}

// Create ARIA live region for screen reader announcements
function createLiveRegion() {
  if (liveRegion) {
    return; // Already exists
  }

  liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', highlightLevel === 'assertive' ? 'assertive' : 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'country-highlighter-live-region';

  // Visually hidden but accessible to screen readers
  applyStyles(liveRegion, {
    position: 'absolute',
    left: '-10000px',
    width: '1px',
    height: '1px',
    overflow: 'hidden'
  });

  document.body.appendChild(liveRegion);
}

// Announce matches to screen readers
function announceMatches(count, countriesFound) {
  if (!liveRegion) {
    createLiveRegion();
  }

  if (count === 0) {
    liveRegion.textContent = '';
    return;
  }

  // Build country list (max 3)
  const countryArray = Array.from(countriesFound);
  const displayedCountries = countryArray.slice(0, 3);
  const remainingCount = countryArray.length - displayedCountries.length;

  let message = '';
  if (count === 1) {
    message = `Country Highlighter found 1 country mention: ${displayedCountries[0]}`;
  } else {
    const countryList = displayedCountries.join(', ');
    if (remainingCount > 0) {
      message = `Country Highlighter found ${count} country mentions: ${countryList}, and ${remainingCount} more`;
    } else {
      message = `Country Highlighter found ${count} country mentions: ${countryList}`;
    }
  }

  liveRegion.textContent = message;
}

// Build optimized search patterns
function buildSearchPatterns() {
  primaryPatterns = [];
  aliasPatterns = [];

  countries.forEach(country => {
    if (!enabledCountryCodes.has(country.code)) {
      return;
    }

    // Primary pattern: flag emoji
    if (country.flag) {
      primaryPatterns.push({
        pattern: country.flag,
        country: country.name,
        type: 'flag'
      });
    }

    // Alias patterns: text
    country.aliases.forEach(alias => {
      const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
      aliasPatterns.push({
        pattern,
        text: alias,
        country: country.name,
        type: 'alias'
      });
    });
  });
}

// Escape special regex characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Apply styles with !important
function applyStyles(element, styles) {
  Object.entries(styles).forEach(([property, value]) => {
    const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    element.style.setProperty(cssProperty, value, 'important');
  });
}

// Scan entire page for matches
function scanPage() {
  const textNodes = getTextNodes(document.body);
  let matchCount = 0;
  const countriesFound = new Set();

  // console.log('Country Highlighter: Scanning', textNodes.length, 'text nodes');
  // if (textNodes.length > 0) {
  //   // Log first few samples
  //   textNodes.slice(0, 5).forEach(node => {
  //     const sample = node.textContent.trim().substring(0, 100);
  //     if (sample) console.log('  Sample:', sample);
  //   });
  // }

  textNodes.forEach(node => {
    const text = node.textContent;

    // First pass: Check for flags
    for (const { pattern, country } of primaryPatterns) {
      if (text.includes(pattern)) {
        const highlighted = highlightMatch(node, pattern, country, 'flag');
        if (highlighted) {
          matchCount++;
          countriesFound.add(country);
        }
        return; // Don't check aliases if flag matched
      }
    }

    // Second pass: Check for text aliases
    for (const { pattern, text: searchText, country } of aliasPatterns) {
      if (pattern.test(text)) {
        const highlighted = highlightMatch(node, searchText, country, 'alias');
        if (highlighted) {
          matchCount++;
          countriesFound.add(country);
        }
        return; // Stop after first match per node
      }
    }
  });

  // Announce matches to screen readers
  announceMatches(matchCount, countriesFound);

  // console.log('Country Highlighter: Found', matchCount, 'matches on page');
}

// Get all text nodes
function getTextNodes(root) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.classList.contains('country-highlighter-text')) {
          return NodeFilter.FILTER_REJECT;
        }

        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  return textNodes;
}

// Highlight a matched text node
// Returns true if highlighting was successful, false otherwise
function highlightMatch(textNode, searchPattern, countryName, matchType) {
  const parent = textNode.parentElement;
  if (!parent || parent.classList.contains('country-highlighter-text')) {
    return false;
  }

  const text = textNode.textContent;
  let regex;

  if (matchType === 'flag') {
    regex = new RegExp(escapeRegex(searchPattern), 'g');
  } else {
    regex = new RegExp(`\\b${escapeRegex(searchPattern)}\\b`, 'gi');
  }

  const matches = text.match(regex);
  if (!matches) {
    return false;
  }

  // console.log('Country Highlighter: Highlighting', countryName, 'in:', text.substring(0, 50));

  // Create highlighted version
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  text.replace(regex, (match, index) => {
    if (index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.substring(lastIndex, index))
      );
    }

    const span = document.createElement('span');
    span.className = 'country-highlighter-text';
    span.setAttribute('data-country', countryName);
    span.setAttribute('data-match-type', matchType);
    span.textContent = match;

    const textStyle = HIGHLIGHT_STYLES[highlightLevel].text;
    applyStyles(span, textStyle);

    fragment.appendChild(span);

    lastIndex = index + match.length;
  });

  if (lastIndex < text.length) {
    fragment.appendChild(
      document.createTextNode(text.substring(lastIndex))
    );
  }

  parent.replaceChild(fragment, textNode);

  applyPageBorder();

  return true;
}

// Apply page-level border
function applyPageBorder() {
  if (pageHighlighted || viewportBorder) {
    return;
  }

  const pageStyle = HIGHLIGHT_STYLES[highlightLevel].page;
  if (pageStyle) {
    // Create fixed viewport border element
    viewportBorder = document.createElement('div');
    viewportBorder.className = 'country-highlighter-viewport-border';

    // Apply configurable border style plus fixed positioning
    const fixedStyles = {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      pointerEvents: 'none',
      zIndex: '2147483647',
      ...pageStyle
    };

    applyStyles(viewportBorder, fixedStyles);
    document.body.appendChild(viewportBorder);
    pageHighlighted = true;
  }
}

// Detect navigation in SPAs and reset highlighting state
function setupNavigationDetection() {
  // Check for URL changes periodically (SPAs don't trigger page reload)
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;

      // Reset page highlighting state
      if (viewportBorder && pageHighlighted) {
        // Remove viewport border element
        viewportBorder.remove();
        viewportBorder = null;
        pageHighlighted = false;
      }

      // Re-scan new page content after a delay
      setTimeout(() => {
        scanPage();
      }, 1000);
    }
  }, 500); // Check every 500ms
}

// Setup mutation observer with debouncing
function setupMutationObserver() {
  let debounceTimer;

  const observer = new MutationObserver((mutations) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const addedNodes = [];
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            addedNodes.push(node);
          }
        });
      });

      // if (addedNodes.length > 0) {
      //   console.log('Country Highlighter: Processing', addedNodes.length, 'new nodes');
      // }

      addedNodes.forEach(node => {
        const textNodes = getTextNodes(node);

        // if (textNodes.length > 0) {
        //   console.log('Country Highlighter: Found', textNodes.length, 'text nodes to scan');
        //   // Log first few text samples
        //   textNodes.slice(0, 3).forEach(tn => {
        //     const sample = tn.textContent.trim().substring(0, 100);
        //     if (sample) console.log('  Sample text:', sample);
        //   });
        // }

        textNodes.forEach(textNode => {
          const text = textNode.textContent;

          for (const { pattern, country } of primaryPatterns) {
            if (text.includes(pattern)) {
              highlightMatch(textNode, pattern, country, 'flag');
              return;
            }
          }

          for (const { pattern, text: searchText, country } of aliasPatterns) {
            if (pattern.test(text)) {
              highlightMatch(textNode, searchText, country, 'alias');
              return;
            }
          }
        });
      });
    }, 300);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    location.reload();
  }
});

// Start extension
init();