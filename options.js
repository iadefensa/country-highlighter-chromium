// Options page script

let countries = [];
let platforms = [];

// Load configurations and populate UI
async function init() {
  try {
    // Load country and platform configs
    const [countriesResponse, platformsResponse] = await Promise.all([
      fetch(chrome.runtime.getURL('config/countries.json')),
      fetch(chrome.runtime.getURL('config/platforms.json'))
    ]);

    countries = await countriesResponse.json();
    platforms = await platformsResponse.json();

    // Sort alphabetically
    countries.sort((a, b) => a.name.localeCompare(b.name));

    // Flatten platforms into array of all domains
    const allPlatformDomains = [];
    Object.values(platforms).forEach(value => {
      if (Array.isArray(value)) {
        allPlatformDomains.push(...value);
      } else {
        allPlatformDomains.push(value);
      }
    });

    // Load saved settings
    const settings = await chrome.storage.sync.get({
      enabledCountries: countries.map(c => c.code), // All enabled by default
      enabledPlatforms: allPlatformDomains, // All enabled by default
      highlightLevel: 'normal',
      extensionEnabled: true
    });

    // Populate UI
    populateCountries(settings.enabledCountries);
    populatePlatforms(settings.enabledPlatforms);
    setHighlightLevel(settings.highlightLevel);
    setExtensionEnabled(settings.extensionEnabled);

    // Setup event listeners
    setupEventListeners();

  } catch (error) {
    console.error('Failed to initialize options page:', error);
  }
}

// Populate countries checkboxes
function populateCountries(enabledCountries) {
  const container = document.getElementById('countriesList');
  const enabledSet = new Set(enabledCountries);

  countries.forEach(country => {
    const item = document.createElement('div');
    item.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `country-${country.code}`;
    checkbox.className = 'input';
    checkbox.value = country.code;
    checkbox.checked = enabledSet.has(country.code);

    const label = document.createElement('label');
    label.htmlFor = `country-${country.code}`;
    label.className = 'label';
    label.textContent = `${country.flag} ${country.name}`;

    item.appendChild(checkbox);
    item.appendChild(label);
    container.appendChild(item);
  });
}

// Populate platforms checkboxes
function populatePlatforms(enabledPlatforms) {
  const container = document.getElementById('platformsList');
  const enabledSet = new Set(enabledPlatforms);

  // Separate single platforms from groups (arrays)
  const singlePlatforms = [];
  const platformGroups = [];

  Object.keys(platforms).forEach(name => {
    const value = platforms[name];
    if (Array.isArray(value)) {
      platformGroups.push({ name, domains: value });
    } else {
      singlePlatforms.push({ name, domain: value });
    }
  });

  // Sort single platforms alphabetically
  singlePlatforms.sort((a, b) => a.name.localeCompare(b.name));

  // Sort platform groups alphabetically
  platformGroups.sort((a, b) => a.name.localeCompare(b.name));

  // Render single platforms first
  singlePlatforms.forEach(platform => {
    const item = document.createElement('div');
    item.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `platform-${platform.domain}`;
    checkbox.className = 'input';
    checkbox.value = platform.domain;
    checkbox.checked = enabledSet.has(platform.domain);

    const label = document.createElement('label');
    label.htmlFor = `platform-${platform.domain}`;
    label.className = 'label';
    label.textContent = platform.name;

    item.appendChild(checkbox);
    item.appendChild(label);
    container.appendChild(item);
  });

  // Render platform groups
  platformGroups.forEach(group => {
    // Add group label as a simple element (no checkbox)
    const headerItem = document.createElement('div');
    headerItem.style.gridColumn = '1 / -1'; // Span full width of grid
    headerItem.style.fontWeight = 'bold';
    headerItem.style.fontSize = '0.9375rem';
    headerItem.style.padding = '0.5rem';
    headerItem.textContent = `${group.name}:`;
    container.appendChild(headerItem);

    // Sort and add group instances
    const sortedInstances = [...group.domains].sort((a, b) => a.localeCompare(b));
    sortedInstances.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `platform-${domain}`;
      checkbox.className = 'input';
      checkbox.value = domain;
      checkbox.checked = enabledSet.has(domain);

      const label = document.createElement('label');
      label.htmlFor = `platform-${domain}`;
      label.className = 'label';
      label.textContent = domain;

      item.appendChild(checkbox);
      item.appendChild(label);
      container.appendChild(item);
    });
  });
}

// Set highlight level radio button
function setHighlightLevel(level) {
  const element = document.getElementById(level);
  if (element) {
    element.checked = true;
  } else {
    // Fallback to “normal” if the saved level is invalid
    const normalElement = document.getElementById('normal');
    if (normalElement) {
      normalElement.checked = true;
    }
  }
}

// Set extension enabled toggle
function setExtensionEnabled(enabled) {
  const element = document.getElementById('extensionEnabled');
  if (element) {
    element.checked = enabled;
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetSettings);

  // Bulk select/deselect countries
  document.getElementById('selectAllCountries').addEventListener('click', () => {
    toggleAllCheckboxes('countriesList', true);
  });

  document.getElementById('deselectAllCountries').addEventListener('click', () => {
    toggleAllCheckboxes('countriesList', false);
  });

  // Bulk select/deselect platforms
  document.getElementById('selectAllPlatforms').addEventListener('click', () => {
    toggleAllCheckboxes('platformsList', true);
  });

  document.getElementById('deselectAllPlatforms').addEventListener('click', () => {
    toggleAllCheckboxes('platformsList', false);
  });
}

// Toggle all checkboxes in a container
function toggleAllCheckboxes(containerId, checked) {
  const container = document.getElementById(containerId);
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = checked);
}

// Save settings
async function saveSettings() {
  try {
    // Get selected countries
    const countryCheckboxes = document.querySelectorAll('#countriesList input[type="checkbox"]');
    const enabledCountries = Array.from(countryCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    // Get selected platforms
    const platformCheckboxes = document.querySelectorAll('#platformsList input[type="checkbox"]');
    const enabledPlatforms = Array.from(platformCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    // Get highlight level
    const highlightLevel = document.querySelector('input[name="highlightLevel"]:checked').value;

    // Get extension enabled state
    const extensionEnabled = document.getElementById('extensionEnabled').checked;

    // Save to storage
    await chrome.storage.sync.set({
      enabledCountries,
      enabledPlatforms,
      highlightLevel,
      extensionEnabled
    });

    // Show success message
    showStatusMessage();

  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('Failed to save settings. Please try again.');
  }
}

// Reset to default settings
async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) {
    return;
  }

  try {
    // Clear storage
    await chrome.storage.sync.clear();

    // Reload page to show defaults
    location.reload();

  } catch (error) {
    console.error('Failed to reset settings:', error);
    alert('Failed to reset settings. Please try again.');
  }
}

// Show success message
function showStatusMessage() {
  const message = document.getElementById('statusMessage');
  message.classList.add('show');

  setTimeout(() => {
    message.classList.remove('show');
  }, 3000);
}

// Initialize on load
init();