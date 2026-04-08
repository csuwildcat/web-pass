import type {
  WebPassAction,
  WebPassConnectChallengeDetail,
  WebPassConnectRequest,
  WebPassConnectResponse,
  WebPassConnectReady,
  WebPassConnectState,
  WebPassAuthStoreOptions
} from './declarations.js';
import {
  DEFAULT_POPUP_PATH,
  buildOriginFromDomain,
  createRequestId,
  fireEvent,
  formatLocator,
  normalizePopupPath,
  parseLocator
} from './utils.js';

export type {
  WebPassAction,
  WebPassAuthStoreOptions,
  WebPassConnectChallengeDetail,
  WebPassConnectRequest,
  WebPassConnectResponse,
  WebPassConnectReady,
  WebPassConnectState
} from './declarations.js';
export { formatLocator } from './utils.js';

const DEFAULT_ACTION: WebPassAction = 'login';
const DEFAULT_KEY_TYPE = 'secp256k1';
const DEFAULT_CONNECT_WINDOW_FEATURES = 'popup=yes,width=420,height=640';
const DEFAULT_CONNECT_READY_TIMEOUT = 8000;
const DEFAULT_CHALLENGE_TIMEOUT = 8000;
const DEFAULT_AUTH_STORAGE_KEY = 'web-pass:authz';

function createConnectState(): WebPassConnectState {
  return {
    requestSent: false,
    responseSent: false
  };
}

function normalizeLocatorKey(locator: string): string | null {
  const parsed = parseLocator(locator);
  if (parsed) {
    return `${parsed.tag}@${parsed.domain}`;
  }
  const trimmed = locator.trim();
  return trimmed ? trimmed : null;
}

function resolveStorage(storage?: Storage): Storage | undefined {
  if (storage) {
    return storage;
  }
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export class WebPassAuthStore {
  private storage: Storage | undefined;
  private storageKey: string;

  constructor(options: WebPassAuthStoreOptions = {}) {
    this.storageKey = options.storageKey ?? DEFAULT_AUTH_STORAGE_KEY;
    this.storage = resolveStorage(options.storage);
  }

  set(locator: string, token: string): void {
    const key = normalizeLocatorKey(locator);
    if (!key || !this.storage) {
      return;
    }
    const data = this.readAll();
    data[key] = token;
    this.writeAll(data);
  }

  get(locator: string): string | null {
    const key = normalizeLocatorKey(locator);
    if (!key || !this.storage) {
      return null;
    }
    const data = this.readAll();
    return data[key] ?? null;
  }

  remove(locator: string): void {
    const key = normalizeLocatorKey(locator);
    if (!key || !this.storage) {
      return;
    }
    const data = this.readAll();
    if (!(key in data)) {
      return;
    }
    delete data[key];
    this.writeAll(data);
  }

  clear(): void {
    if (!this.storage) {
      return;
    }
    this.storage.removeItem(this.storageKey);
  }

  list(): Record<string, string> {
    return { ...this.readAll() };
  }

  private readAll(): Record<string, string> {
    if (!this.storage) {
      return {};
    }
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      return parsed as Record<string, string>;
    } catch {
      return {};
    }
  }

  private writeAll(data: Record<string, string>): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Ignore storage failures.
    }
  }
}

const HTMLElementBase = (typeof HTMLElement === 'undefined'
  ? class {}
  : HTMLElement) as typeof HTMLElement;

export const WEB_PASS_CONNECT_TAG = 'web-pass-connect';

export class WebPassConnectElement extends HTMLElementBase {
  public form?: HTMLFormElement;
  public locatorInput?: HTMLInputElement;
  public connectButton?: HTMLButtonElement;
  public authStore: WebPassAuthStore;

  private action: WebPassAction = DEFAULT_ACTION;
  private keyType = DEFAULT_KEY_TYPE;
  private challenge?: string;
  private actionPayload?: string;
  private popupPath = DEFAULT_POPUP_PATH;
  private authStorageKey = DEFAULT_AUTH_STORAGE_KEY;
  private connectState = createConnectState();
  private connectReadyTimeoutId?: number;
  private initialized = false;
  private delegatesAttached = false;
  private connectMessageHandler?: (event: MessageEvent) => void;

  constructor() {
    super();
    this.authStore = new WebPassAuthStore();
  }

  connectedCallback(): void {
    if (this.initialized || typeof document === 'undefined') {
      return;
    }
    this.initialized = true;
    this.render();
    this.refreshFromAttributes();
    this.attachDelegates();
    this.attachMessageHandlers();
    fireEvent(this, 'webpass:ready', { flow: 'connect' });
  }

  disconnectedCallback(): void {
    if (this.connectMessageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.connectMessageHandler);
      this.connectMessageHandler = undefined;
    }
    if (this.connectReadyTimeoutId && typeof window !== 'undefined') {
      window.clearTimeout(this.connectReadyTimeoutId);
      this.connectReadyTimeoutId = undefined;
    }
  }

  refreshFromAttributes(): void {
    this.syncConnectOptions();
    this.refreshLocator();
  }

  connect(locator?: string): void {
    const value = locator ?? this.locatorInput?.value ?? '';
    this.handleLocatorSelection(value);
  }

  private render(): void {
    this.form = undefined;
    this.locatorInput = undefined;
    this.connectButton = undefined;

    this.innerHTML = `
      <style>
        .web-pass-connect-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .web-pass-connect-row input {
          flex: 1 1 auto;
          min-width: 0;
        }

        .web-pass-connect-button[disabled] {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }
      </style>
      <form class="form web-pass-form" autocomplete="on" novalidate method="post">
        <label class="web-pass-field">
          Web Pass locator
          <span class="web-pass-connect-row">
            <input data-role="locator" type="email" name="email" autocomplete="email" placeholder="pass@origin">
            <button data-role="connect" type="button" class="primary web-pass-connect-button" disabled>Connect</button>
          </span>
        </label>
      </form>
    `;

    const form = this.querySelector('form');
    const locatorInput = this.querySelector('input[data-role="locator"]');
    const connectButton = this.querySelector('button[data-role="connect"]');

    if (
      !(form instanceof HTMLFormElement) ||
      !(locatorInput instanceof HTMLInputElement) ||
      !(connectButton instanceof HTMLButtonElement)
    ) {
      return;
    }

    this.form = form;
    this.locatorInput = locatorInput;
    this.connectButton = connectButton;
  }

  private syncConnectOptions(): void {
    const action = this.getAttribute('action');
    if (action === 'login' || action === 'sign') {
      this.action = action;
    } else {
      this.action = DEFAULT_ACTION;
    }

    const keyType = this.getAttribute('key-type');
    this.keyType = keyType && keyType.trim() ? keyType.trim() : DEFAULT_KEY_TYPE;

    const challenge = this.getAttribute('challenge');
    this.challenge = challenge && challenge.trim() ? challenge : undefined;

    const actionPayload = this.getAttribute('action-payload');
    this.actionPayload = actionPayload && actionPayload.trim() ? actionPayload : undefined;

    const popupPath = this.getAttribute('popup-path');
    this.popupPath = normalizePopupPath(popupPath ?? undefined);

    const authStorageKey = this.getAttribute('auth-storage-key');
    this.authStorageKey = authStorageKey && authStorageKey.trim()
      ? authStorageKey.trim()
      : DEFAULT_AUTH_STORAGE_KEY;
    this.authStore = new WebPassAuthStore({ storageKey: this.authStorageKey });
  }

  private refreshLocator(): void {
    if (!this.locatorInput) {
      return;
    }
    try {
      const locatorOverride = this.getAttribute('locator');
      const locatorDomain = this.getAttribute('locator-domain') ?? this.getAttribute('origin') ?? undefined;
      const nextLocator = locatorOverride
        ? formatLocator(locatorOverride)
        : formatLocator(locatorDomain ?? undefined);
      this.locatorInput.value = nextLocator;
    } catch {
      this.locatorInput.value = '';
    }
    this.updateConnectButtonState();
  }

  private attachDelegates(): void {
    if (this.delegatesAttached) {
      return;
    }
    this.delegatesAttached = true;

    if (this.locatorInput) {
      this.locatorInput.addEventListener('input', () => {
        this.updateConnectButtonState();
      });
      this.locatorInput.addEventListener('change', () => {
        this.updateConnectButtonState();
      });
    }

    if (this.connectButton) {
      this.connectButton.addEventListener('click', () => {
        this.handleLocatorSelection();
      });
    }
  }

  private updateConnectButtonState(): void {
    if (!this.locatorInput || !this.connectButton) {
      return;
    }
    const locator = this.locatorInput.value.trim();
    const isValid = !!parseLocator(locator);
    this.connectButton.disabled = !isValid;
    this.connectButton.setAttribute('aria-disabled', isValid ? 'false' : 'true');
  }

  private handleLocatorSelection(locatorOverride?: string): void {
    const locator = locatorOverride?.trim() || this.locatorInput?.value.trim();
    if (!locator) {
      return;
    }
    if (this.connectState.request && this.connectState.request.locator === locator && this.connectState.popup && !this.connectState.popup.closed) {
      this.connectState.popup.focus?.();
      return;
    }
    const parsed = parseLocator(locator);
    if (!parsed) {
      this.dispatchConnectError('Invalid Web Pass locator.');
      return;
    }
    this.openConnectPopup(locator, parsed);
  }

  private openConnectPopup(locator: string, parsed: { domain: string }): void {
    if (typeof window === 'undefined') {
      return;
    }
    const protocol = typeof location !== 'undefined' && location.protocol ? location.protocol : 'https:';
    const origin = buildOriginFromDomain(parsed.domain, protocol);
    const popupUrl = new URL(this.popupPath, origin);
    const popup = window.open(popupUrl.toString(), 'web-pass-connect', DEFAULT_CONNECT_WINDOW_FEATURES);
    if (!popup) {
      this.dispatchConnectError('Popup was blocked. Allow popups to connect a Web Pass.');
      return;
    }
    popup.focus?.();
    this.connectState = createConnectState();
    this.connectState.popup = popup;
    this.connectState.requestOrigin = origin;
    this.connectState.request = {
      source: 'web-pass',
      type: 'webpass:request',
      requestId: createRequestId(),
      locator,
      action: this.action,
      keyType: this.keyType,
      challenge: this.challenge,
      actionPayload: this.actionPayload
    };

    if (typeof window !== 'undefined') {
      this.connectReadyTimeoutId = window.setTimeout(() => {
        this.dispatchConnectError('Web Pass popup did not respond in time.');
        if (this.connectState.popup && !this.connectState.popup.closed) {
          this.connectState.popup.close();
        }
        this.clearConnectState();
      }, DEFAULT_CONNECT_READY_TIMEOUT);
    }
  }

  private attachMessageHandlers(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.connectMessageHandler = (event: MessageEvent) => {
      this.handleMessage(event);
    };
    window.addEventListener('message', this.connectMessageHandler);
  }

  private handleMessage(event: MessageEvent): void {
    const data = event.data as WebPassConnectRequest | WebPassConnectResponse | WebPassConnectReady | null;
    if (!data || typeof data !== 'object' || data.source !== 'web-pass') {
      return;
    }
    if (data.type === 'webpass:ready') {
      this.handleConnectReady(event);
      return;
    }
    if (data.type === 'webpass:response') {
      this.handleConnectResponse(event, data);
    }
  }

  private handleConnectReady(event: MessageEvent): void {
    if (!this.connectState.popup || event.source !== this.connectState.popup) {
      return;
    }
    if (this.connectState.requestOrigin && event.origin !== this.connectState.requestOrigin) {
      return;
    }
    if (this.connectReadyTimeoutId && typeof window !== 'undefined') {
      window.clearTimeout(this.connectReadyTimeoutId);
      this.connectReadyTimeoutId = undefined;
    }
    this.connectState.requestSent = false;
    void this.sendConnectRequest(event.origin);
  }

  private handleConnectResponse(event: MessageEvent, response: WebPassConnectResponse): void {
    if (!this.connectState.request || response.requestId !== this.connectState.request.requestId) {
      return;
    }
    if (this.connectState.popup && event.source !== this.connectState.popup) {
      return;
    }
    if (this.connectState.requestOrigin && event.origin !== this.connectState.requestOrigin) {
      return;
    }
    fireEvent(this, 'webpass:connect-response', response);
    const eventName = response.result === 'confirm' ? 'webpass:connect' : 'webpass:connect-error';
    fireEvent(this, eventName, response);

    if (response.result === 'confirm') {
      const token = response.authJwt ?? response.authzJwt;
      if (token) {
        this.authStore.set(response.locator, token);
      }
    }

    if (this.connectState.popup && !this.connectState.popup.closed) {
      this.connectState.popup.close();
    }
    this.clearConnectState();
  }

  private async sendConnectRequest(targetOrigin: string): Promise<void> {
    if (this.connectState.requestSent || !this.connectState.popup || !this.connectState.request) {
      return;
    }
    this.connectState.requestSent = true;
    if (this.connectState.request.action === 'login') {
      try {
        const challenge = await this.requestLoginChallenge();
        if (!this.connectState.request) {
          return;
        }
        this.connectState.request.challenge = challenge;
      } catch (error) {
        this.connectState.requestSent = false;
        const message = error instanceof Error ? error.message : 'Web Pass challenge was not provided.';
        this.dispatchConnectError(message, error);
        if (this.connectState.popup && !this.connectState.popup.closed) {
          this.connectState.popup.close();
        }
        this.clearConnectState();
        return;
      }
    }
    try {
      this.connectState.popup.postMessage(this.connectState.request, targetOrigin);
      fireEvent(this, 'webpass:connect-request', this.connectState.request);
    } catch (error) {
      this.dispatchConnectError('Failed to send Web Pass request.', error);
    }
  }

  private requestLoginChallenge(): Promise<string> {
    if (!this.connectState.request) {
      return Promise.reject(new Error('No Web Pass request is available.'));
    }
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Web Pass challenge cannot be requested without a window.'));
    }
    if (this.challenge) {
      return Promise.resolve(this.challenge);
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error('Web Pass challenge timed out.'));
      }, DEFAULT_CHALLENGE_TIMEOUT);
      const detail: WebPassConnectChallengeDetail = {
        request: this.connectState.request as WebPassConnectRequest,
        defaultChallenge: this.challenge,
        setChallenge: (challenge: string) => {
          if (settled) {
            return;
          }
          const trimmed = challenge?.trim();
          if (!trimmed) {
            settled = true;
            window.clearTimeout(timeoutId);
            reject(new Error('Web Pass challenge must be a non-empty string.'));
            return;
          }
          settled = true;
          window.clearTimeout(timeoutId);
          resolve(trimmed);
        },
        setError: (message: string) => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timeoutId);
          reject(new Error(message));
        }
      };
      fireEvent(this, 'webpass:connect-challenge', detail);
    });
  }

  private dispatchConnectError(message: string, error?: unknown): void {
    fireEvent(this, 'webpass:connect-error', { message, error });
    fireEvent(this, 'webpass:error', { message, error });
  }

  private clearConnectState(): void {
    this.connectState = createConnectState();
    if (this.connectReadyTimeoutId && typeof window !== 'undefined') {
      window.clearTimeout(this.connectReadyTimeoutId);
      this.connectReadyTimeoutId = undefined;
    }
  }
}

export function defineWebPassConnectElement(tagName = WEB_PASS_CONNECT_TAG): void {
  if (typeof globalThis === 'undefined') {
    return;
  }
  const registry = globalThis.customElements;
  if (!registry || registry.get(tagName)) {
    return;
  }
  registry.define(tagName, WebPassConnectElement);
}

if (typeof globalThis !== 'undefined' && globalThis.customElements) {
  defineWebPassConnectElement();
}

declare global {
  interface HTMLElementTagNameMap {
    'web-pass-connect': WebPassConnectElement;
  }
}
