const DEFAULT_LOCATOR_TAG = 'pass';
const LOCATOR_PATTERN = new RegExp(`^${DEFAULT_LOCATOR_TAG}@([^@\\s]+)$`, 'i');

export const DEFAULT_POPUP_PATH = '/.well-known/web-pass';

export function fireEvent(
  target: EventTarget,
  name: string,
  detail?: unknown
): void {
  const options: CustomEventInit = { bubbles: true, composed: true };
  if (detail !== undefined) {
    options.detail = detail;
  }
  target.dispatchEvent(new CustomEvent(name, options));
}

function normalizeLocatorDomain(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.includes('://')) {
    try {
      return new URL(trimmed).host.toLowerCase();
    } catch {
      return trimmed.replace(/^https?:\/\//i, '').toLowerCase();
    }
  }
  return trimmed.toLowerCase();
}

function getDefaultLocatorDomain(): string {
  if (typeof location !== 'undefined') {
    if (location.host) {
      return location.host;
    }
    if (location.hostname) {
      return location.hostname;
    }
  }
  return 'localhost';
}

export function formatLocator(
  domainOrLocator?: string
): string {
  const trimmed = domainOrLocator?.trim();
  if (trimmed) {
    const existing = parseLocator(trimmed);
    if (existing) {
      return `${DEFAULT_LOCATOR_TAG}@${normalizeLocatorDomain(existing.domain)}`;
    }
    if (trimmed.includes('@')) {
      throw new Error('Web Pass locator must be formatted as pass@domain.');
    }
    const normalizedDomain = normalizeLocatorDomain(trimmed);
    if (normalizedDomain) {
      return `${DEFAULT_LOCATOR_TAG}@${normalizedDomain}`;
    }
  }
  const locatorDomain = normalizeLocatorDomain(getDefaultLocatorDomain());
  if (!locatorDomain) {
    throw new Error('Locator domain is required to build the locator.');
  }
  return `${DEFAULT_LOCATOR_TAG}@${locatorDomain}`;
}

export function parseLocator(
  locator: string
): { tag: string; domain: string; local: string } | null {
  const trimmed = locator.trim();
  const match = trimmed.match(LOCATOR_PATTERN);
  if (!match) {
    return null;
  }
  const domain = normalizeLocatorDomain(match[1]);
  if (!domain) {
    return null;
  }
  const local = DEFAULT_LOCATOR_TAG;
  return { tag: DEFAULT_LOCATOR_TAG, domain, local };
}

export function createRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildOriginFromDomain(domain: string, fallbackProtocol: string): string {
  if (domain.includes('://')) {
    try {
      return new URL(domain).origin;
    } catch {
      return `${fallbackProtocol}//${domain}`;
    }
  }
  return `${fallbackProtocol}//${domain}`;
}

export function normalizePopupPath(path: string | undefined): string {
  if (!path) {
    return DEFAULT_POPUP_PATH;
  }
  const trimmed = path.trim();
  return trimmed || DEFAULT_POPUP_PATH;
}
