import { Buffer } from 'buffer';

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

await import('../src/wallet.ts');
await import('../src/app.ts');

const createElement = document.getElementById('web-pass-create');
const loadElement = document.getElementById('web-pass-load');
const createResult = document.getElementById('create-result');
const loadResult = document.getElementById('load-result');
const connectElement = document.getElementById('web-pass-connect');
const connectResult = document.getElementById('connect-result');
const storageKey = 'web-pass-demo-created';

const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const locatorValue = typeof entry.locator === 'string'
    ? entry.locator
    : (typeof entry.email === 'string' ? entry.email : '');
  const usernameValue = typeof entry.username === 'string'
    ? entry.username
    : (typeof entry.label === 'string' ? entry.label : '');
  const seedValue = typeof entry.seed === 'string'
    ? entry.seed
    : (typeof entry.password === 'string' ? entry.password : '');
  if (!seedValue) {
    return null;
  }
  return {
    ...entry,
    locator: locatorValue,
    username: usernameValue,
    seed: seedValue
  };
};

const logEvent = (message) => {
  if (typeof console !== 'undefined') {
    console.info(message);
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

let nyf = null;
try {
  const module = await import('https://esm.sh/notyourface@1.3.0');
  nyf = module?.default ?? null;
} catch (error) {
  logEvent('notyourface failed to load, using fallback avatar.');
}

const readStoredPass = () => {
  if (!window.localStorage) {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
};

const writeStoredPass = (entry) => {
  if (!window.localStorage) {
    return;
  }
  try {
    if (!entry) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch (error) {
    // Ignore storage failures in the demo.
  }
};

const getInitials = (value) => {
  if (!value) {
    return 'WP';
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join('');
  return initials ? initials.toUpperCase() : 'WP';
};

const createAvatar = (seed, label) => {
  const alt = label ? `${label} avatar` : 'Web Pass avatar';
  if (nyf && typeof nyf.imgEl === 'function') {
    return nyf.imgEl(
      { seed, size: 140, complexity: 5, shapes: ['circle'] },
      {
        class: 'pass-avatar',
        alt,
        decoding: 'async',
        loading: 'lazy'
      }
    );
  }
  const fallback = document.createElement('div');
  fallback.className = 'pass-avatar pass-avatar-fallback';
  fallback.textContent = getInitials(label || '');
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', alt);
  return fallback;
};

const setCardFlipped = (card, isFlipped) => {
  if (!card) {
    return;
  }
  card.classList.toggle('is-flipped', isFlipped);
};

const passResultTemplate = (entry, title, emptyMessage) => {
  if (!entry) {
    return '<div class="pass-placeholder" aria-hidden="true"></div>';
  }

  const passName = entry.username || 'Web Pass';
  const locatorValue = entry.locator || '';
  const safePassName = escapeHtml(passName);
  const safeLocatorValue = escapeHtml(locatorValue);
  const safeSeed = escapeHtml(entry.seed || '');
  const safeSeedWords = typeof entry.seed === 'string'
    ? entry.seed
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => `<span class="pass-seed-word">${escapeHtml(word)}</span>`)
        .join('')
    : '';
  const locatorText = locatorValue ? safeLocatorValue : 'Locator unavailable';
  const locatorDisabled = locatorValue ? '' : ' disabled';

  return `
      <div class="pass-card" data-role="pass-card">
        <div class="pass-card-inner">
          <div class="pass-card-face pass-card-front">
            <div class="pass-card-bar pass-card-top-bar">
              <div class="pass-card-brand">
                <img class="pass-card-logo" src="logo.svg" alt="" aria-hidden="true">
                <span>Web Pass</span>
              </div>
            </div>
            <div class="pass-card-center">
              <div class="pass-avatar-slot" data-role="avatar"></div>
              <p class="pass-name">${safePassName}</p>
            </div>
            <div class="pass-card-bar pass-card-bottom-bar">
              <div class="pass-locator-row">
                <span class="pass-locator">${locatorText}</span>
                <wa-copy-button
                  value="${escapeHtml(locatorValue)}"
                  copy-label="Copy locator"
                  success-label="Locator copied"
                  error-label="Copy failed"
                  class="pass-locator-copy"
                  data-role="copy-locator"${locatorDisabled}
                ></wa-copy-button>
              </div>
              <div class="pass-actions">
                <wa-button
                  type="button"
                  appearance="outlined"
                  variant="brand"
                  size="small"
                  data-role="reveal"
                >
                  Reveal seed
                </wa-button>
              </div>
            </div>
          </div>
          <div class="pass-card-face pass-card-back">
            <div class="pass-card-header">
              <div class="pass-card-title-group">
                <wa-button
                  type="button"
                  appearance="outlined"
                  variant="neutral"
                  size="small"
                  class="pass-hide-button"
                  data-role="hide"
                  aria-label="Hide seed"
                  title="Hide seed"
                >
                  <wa-icon name="arrow-left" aria-hidden="true"></wa-icon>
                </wa-button>
                <span class="pass-card-title">Seed phrase</span>
              </div>
              <div class="pass-actions">
                <wa-copy-button
                  value="${escapeHtml(entry.seed)}"
                  copy-label="Copy seed"
                  success-label="Seed copied"
                  error-label="Copy failed"
                  data-role="copy-seed"
                ></wa-copy-button>
              </div>
            </div>
            <code class="pass-seed" aria-label="${safeSeed}">${safeSeedWords}</code>
            <p class="pass-hint">Anyone with this seed can derive your pass credentials.</p>
          </div>
        </div>
      </div>
    `;
};

const renderPassResult = (container, entry, title, emptyMessage) => {
  if (!container) {
    return;
  }
  container.innerHTML = passResultTemplate(entry, title, emptyMessage);
  container.classList.remove('is-hidden');

  if (!entry) {
    return;
  }

  const passName = entry.username || 'Web Pass';
  const card = container.querySelector('[data-role="pass-card"]');
  const avatarSlot = container.querySelector('[data-role="avatar"]');
  if (avatarSlot) {
    const avatar = createAvatar(entry.seed, passName);
    avatarSlot.replaceWith(avatar);
  }

  const revealButton = container.querySelector('[data-role="reveal"]');
  if (revealButton) {
    revealButton.addEventListener('click', () => setCardFlipped(card, true));
  }
  const hideButton = container.querySelector('[data-role="hide"]');
  if (hideButton) {
    hideButton.addEventListener('click', () => setCardFlipped(card, false));
  }
  const seedCopy = container.querySelector('[data-role="copy-seed"]');
  if (seedCopy) {
    seedCopy.addEventListener('wa-copy', () => logEvent('Seed copied to clipboard.'));
    seedCopy.addEventListener('wa-error', () => logEvent('Failed to copy Seed.'));
  }
  const locatorCopy = container.querySelector('[data-role="copy-locator"]');
  if (locatorCopy && entry.locator) {
    locatorCopy.addEventListener('wa-copy', () => logEvent('Locator copied to clipboard.'));
    locatorCopy.addEventListener('wa-error', () => logEvent('Failed to copy Locator.'));
  }
};

const renderConnectResult = (container, response, title, emptyMessage) => {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  container.classList.remove('is-hidden');
  container.style.display = 'grid';
  container.style.placeItems = '';
  container.style.alignContent = '';

  if (!response) {
    container.style.placeItems = 'center';
    container.style.alignContent = 'center';
    const empty = document.createElement('p');
    empty.className = 'note';
    empty.style.margin = '0';
    empty.style.textAlign = 'center';
    empty.textContent = emptyMessage || 'Waiting for response';
    container.appendChild(empty);
    return;
  }

  const status = document.createElement('p');
  status.className = 'note';
  status.textContent = `Connect result: ${response.result || 'unknown'}.`;
  container.appendChild(status);

  const addRow = (label, value) => {
    if (!value) {
      return;
    }
    const row = document.createElement('div');
    row.className = 'result-row';
    const rowLabel = document.createElement('span');
    rowLabel.textContent = label;
    const rowValue = document.createElement('code');
    rowValue.textContent = value;
    row.append(rowLabel, rowValue);
    container.appendChild(row);
  };

  addRow('Locator', response.locator);
  addRow('Public key', response.publicKey);
  addRow('Signature', response.signature);
  addRow('Auth JWT', response.authJwt || response.authzJwt);
  if (response.locator && connectElement?.authStore?.get) {
    const storedToken = connectElement.authStore.get(response.locator);
    addRow('Stored JWT', storedToken);
  }
  addRow('Error', response.error);
};

createElement?.addEventListener('webpass:create', (event) => {
  const entry = normalizeEntry(event.detail);
  if (!entry) {
    return;
  }
  writeStoredPass({ ...entry, createdOnLoad: true });
  renderPassResult(createResult, entry, 'Created Web Pass', 'No Web Pass created yet.');
  logEvent('Generated Web Pass seed phrase.');
});

createElement?.addEventListener('webpass:error', (event) => {
  const message = event.detail?.message || 'Failed to generate Web Pass.';
  logEvent(message);
});

loadElement?.addEventListener('webpass:load', (event) => {
  const entry = normalizeEntry(event.detail);
  if (!entry) {
    return;
  }
  renderPassResult(loadResult, entry, 'Loaded Web Pass', 'No Web Pass loaded yet.');
  logEvent('Loaded Web Pass seed phrase.');
});

connectElement?.addEventListener('webpass:connect-response', (event) => {
  const response = event.detail;
  if (!response || typeof response !== 'object') {
    return;
  }
  renderConnectResult(connectResult, response, 'Connect Response', 'Waiting for response');
  logEvent(`Connect response: ${response.result || 'unknown'}.`);
});

connectElement?.addEventListener('webpass:connect-error', (event) => {
  const message = event.detail?.message || event.detail?.error || 'Connect failed.';
  renderConnectResult(connectResult, { result: 'error', error: message }, 'Connect Response', 'Waiting for response');
  logEvent(message);
});

await customElements.whenDefined('web-pass-form');
if (typeof createElement?.refreshFromAttributes === 'function') {
  createElement.refreshFromAttributes();
}
if (typeof loadElement?.refreshFromAttributes === 'function') {
  loadElement.refreshFromAttributes();
}
await customElements.whenDefined('web-pass-connect');
if (typeof connectElement?.refreshFromAttributes === 'function') {
  connectElement.refreshFromAttributes();
}

const storedPass = readStoredPass();
if (storedPass && storedPass.createdOnLoad) {
  const entry = normalizeEntry(storedPass);
  if (entry) {
    renderPassResult(createResult, entry, 'Created Web Pass', 'No Web Pass created yet.');
  }
  const nextPass = { ...storedPass };
  delete nextPass.createdOnLoad;
  writeStoredPass(nextPass);
} else if (storedPass) {
  writeStoredPass(null);
}

const createForm = createElement?.form ?? createElement?.querySelector('form');
if (createForm) {
  createForm.addEventListener('submit', (event) => {
    event.preventDefault();
    logEvent('Form submitted to trigger a password manager save prompt.');
  });
}

if (!storedPass || !storedPass.createdOnLoad) {
  renderPassResult(createResult, null, 'Created Web Pass', 'No Web Pass created yet.');
}
renderPassResult(loadResult, null, 'Loaded Web Pass', 'No Web Pass loaded yet.');
renderConnectResult(connectResult, null, 'Connect Response', 'Waiting for response');
logEvent('Demo ready. Create or load a Web Pass to begin.');
