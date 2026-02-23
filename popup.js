// Popup script

async function init() {
  try {
    // Load settings
    const settings = await chrome.storage.sync.get({
      extensionEnabled: true,
      enabledCountries: []
    });

    // Set toggle state
    const toggle = document.getElementById('extensionEnabled');
    toggle.checked = settings.extensionEnabled;

    // Update status
    updateStatus(settings.extensionEnabled, settings.enabledCountries.length);

    // Setup listeners
    toggle.addEventListener('change', async (e) => {
      await chrome.storage.sync.set({ extensionEnabled: e.target.checked });
      updateStatus(e.target.checked, settings.enabledCountries.length);
    });

    document.getElementById('openOptions').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
}

function updateStatus(enabled, countryCount) {
  const status = document.getElementById('status');

  if (enabled) {
    status.className = 'status active';
    status.textContent = `Active • ${countryCount} countries`;
  } else {
    status.className = 'status inactive';
    status.textContent = 'Disabled';
  }
}

init();
