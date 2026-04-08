import { secp256k1 } from '@noble/curves/secp256k1.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base64url } from '@scure/base';
import { entropyToMnemonic } from 'bip39';
import type {
  WebPassAction,
  WebPassConnectReady,
  WebPassConnectRequest,
  WebPassConnectResponse,
  WebPassConnectState,
  WebPassCreateOptions,
  WebPassEntry,
  WebPassFlow,
  WebPassKeyPair,
  WebPassSeedOptions
} from './declarations.js';
import { fireEvent, formatLocator, parseLocator } from './utils.js';

export type {
  WebPassAction,
  WebPassConnectRequest,
  WebPassConnectResponse,
  WebPassCreateOptions,
  WebPassEntry,
  WebPassFlow,
  WebPassOptions,
  WebPassSeedEncoding,
  WebPassSeedOptions
} from './declarations.js';
export { formatLocator } from './utils.js';

function createConnectState(): WebPassConnectState {
  return {
    requestSent: false,
    responseSent: false
  };
}

const DEFAULT_SEED_BYTES = 16;
const DEFAULT_SEED_ENCODING = 'bip39';
const DEFAULT_USERNAME = 'Web Pass';
const DEFAULT_FLOW: WebPassFlow = 'create';
const DEFAULT_ACTION: WebPassAction = 'login';
const DEFAULT_KEY_TYPE = 'secp256k1';
const SUPPORTED_SEED_BYTES = new Set([16, 32]);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generateSeed(options: WebPassSeedOptions = {}): string {
  const bytes = options.bytes ?? DEFAULT_SEED_BYTES;
  if (!SUPPORTED_SEED_BYTES.has(bytes)) {
    throw new Error('Web Pass seeds must use 16 or 32 bytes of entropy (128-bit or 256-bit).');
  }
  const encoding = options.encoding ?? DEFAULT_SEED_ENCODING;
  if (encoding !== 'bip39') {
    throw new Error('Web Pass seeds must use BIP-39 mnemonics.');
  }

  const entropy = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(entropy);

  return entropyToMnemonic(bytesToHex(entropy));
}

function normalizeSeedPhrase(seed: string): string {
  return seed
    .trim()
    .normalize('NFKD')
    .split(/\s+/)
    .join(' ');
}

function toUtf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function derivePrivateKey(
  hash: Uint8Array,
  utils: { hashToPrivateKey?: (bytes: Uint8Array) => Uint8Array; isValidPrivateKey?: (bytes: Uint8Array) => boolean }
): Uint8Array {
  if (typeof utils.hashToPrivateKey === 'function') {
    return utils.hashToPrivateKey(hash);
  }
  if (typeof utils.isValidPrivateKey === 'function' && !utils.isValidPrivateKey(hash)) {
    return sha256(hash);
  }
  return hash;
}

export function deriveKeyPair(seed: string, keyType: string): WebPassKeyPair {
  const normalizedSeed = normalizeSeedPhrase(seed);
  if (!normalizedSeed) {
    throw new Error('Web Pass seed phrase is required.');
  }
  const hash = sha256(toUtf8Bytes(normalizedSeed));
  const normalized = keyType.toLowerCase();
  if (normalized === 'ed25519') {
    const privateKey = derivePrivateKey(hash, ed25519.utils as { hashToPrivateKey?: (bytes: Uint8Array) => Uint8Array });
    const publicKey = ed25519.getPublicKey(privateKey);
    return { privateKey, publicKey, curve: 'ed25519' };
  }
  const privateKey = derivePrivateKey(hash, secp256k1.utils as { hashToPrivateKey?: (bytes: Uint8Array) => Uint8Array; isValidPrivateKey?: (bytes: Uint8Array) => boolean });
  const publicKey = secp256k1.getPublicKey(privateKey, true);
  return { privateKey, publicKey, curve: 'secp256k1' };
}

function encodeBytes(value: Uint8Array): string {
  return base64url.encode(value);
}

function createPromptText(action: WebPassAction, origin: string): string {
  const host = (() => {
    try {
      return new URL(origin).host || origin;
    } catch {
      return origin;
    }
  })();
  switch (action) {
    case 'sign':
      return `${host} is requesting a signature from your Web Pass.`;
    case 'login':
    default:
      return `${host} is requesting that you log in with your Web Pass.`;
  }
}

function signPayload(payload: string, keyPair: WebPassKeyPair): string {
  const message = toUtf8Bytes(payload);
  if (keyPair.curve === 'secp256k1') {
    const signature = secp256k1.sign(message, keyPair.privateKey);
    return encodeBytes(signature);
  }
  const signature = ed25519.sign(message, keyPair.privateKey);
  return encodeBytes(signature);
}

function resolveElement<T extends Element>(
  value: T | string | undefined,
  label: string
): T | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return value;
  }
  if (typeof document === 'undefined') {
    throw new Error(`Cannot resolve ${label} selector without a document.`);
  }
  const element = document.querySelector(value);
  if (!element) {
    throw new Error(`Could not find ${label} element for selector "${value}".`);
  }
  return element as T;
}

function getRequiredInput(
  form: HTMLFormElement,
  selectors: string[],
  label: string
): HTMLInputElement {
  const element = form.querySelector(selectors.join(', '));
  if (!element) {
    throw new Error(
      `Web Pass requires a ${label} input inside the form.`
    );
  }
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Web Pass ${label} input must be an <input> element.`);
  }
  return element;
}

function updateInputValue(input: HTMLInputElement, value: string): void {
  const proto = Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  descriptor?.set?.call(input, value);
  if (!descriptor?.set) {
    input.value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function parseNumberAttribute(value: string | null): number | undefined {
  if (value === null || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class WebPassCreate {
  public options: WebPassCreateOptions;
  public readonly createdPasses: WebPassEntry[] = [];
  public form: HTMLFormElement;
  public usernameInput: HTMLInputElement;
  public seedInput: HTMLInputElement;
  public locatorInput: HTMLInputElement;

  get passes(): WebPassEntry[] {
    return this.createdPasses;
  }

  constructor(options: WebPassCreateOptions) {
    this.options = { ...options };
    const form = resolveElement(options.form, 'form');
    if (!form) {
      throw new Error('Web Pass requires a form element.');
    }
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Web Pass form selector must resolve to a <form> element.');
    }
    this.form = form;
    this.usernameInput = getRequiredInput(
      form,
      ['input[data-role="username"]', 'input[name="username"]', 'input[autocomplete="username"]'],
      'username'
    );
    // this.usernameInput.readOnly = true;
    this.seedInput = getRequiredInput(
      form,
      ['input[name="password"]', 'input[autocomplete="new-password"]'],
      'seed phrase'
    );
    this.seedInput.readOnly = true;
    this.locatorInput = getRequiredInput(
      form,
      ['input[name="email"]', 'input[autocomplete="email"]'],
      'locator'
    );
    this.locatorInput.readOnly = true;
  }

  updateOptions(next: Partial<WebPassCreateOptions>): void {
    this.options = { ...this.options, ...next };
  }

  previewLocator(domainOverride?: string): string {
    const source = domainOverride ?? this.options.locatorDomain ?? this.options.origin;
    return formatLocator(source);
  }

  prepare(): void {
    const locator = this.previewLocator();
    updateInputValue(this.locatorInput, locator);
    if (!this.seedInput.value.trim()) {
      const seed = generateSeed(this.options);
      updateInputValue(this.seedInput, seed);
    }
  }

  createPass(): WebPassEntry {
    this.prepare();
    const seed = normalizeSeedPhrase(this.seedInput.value);
    if (!seed) {
      throw new Error('Web Pass seed phrase is required.');
    }
    const locator = this.locatorInput.value.trim() || this.previewLocator();
    const origin =
      this.options.origin ??
      (typeof location !== 'undefined' ? location.origin : '');
    const rawUsername = this.usernameInput.value.trim();
    const username = rawUsername || DEFAULT_USERNAME;
    if (!rawUsername) {
      updateInputValue(this.usernameInput, username);
    }
    const entry: WebPassEntry = {
      username,
      seed,
      locator,
      origin
    };
    this.createdPasses.push(entry);
    this.fill(entry);
    this.options.onCreate?.(entry);
    return entry;
  }

  fill(entry: WebPassEntry): void {
    updateInputValue(this.usernameInput, entry.username);
    updateInputValue(this.seedInput, entry.seed);
    updateInputValue(this.locatorInput, entry.locator);
  }

  clearInputs(): void {
    updateInputValue(this.seedInput, '');
    updateInputValue(this.locatorInput, this.previewLocator());
  }

  listCreatedPasses(): WebPassEntry[] {
    return [...this.createdPasses];
  }

  listPasses(): WebPassEntry[] {
    return this.listCreatedPasses();
  }
}

const HTMLElementBase = (typeof HTMLElement === 'undefined'
  ? class {}
  : HTMLElement) as typeof HTMLElement;

export const WEB_PASS_FORM_TAG = 'web-pass-form';

export class WebPassFormElement extends HTMLElementBase {
  public createFlow?: WebPassCreate;
  public form?: HTMLFormElement;
  public usernameInput?: HTMLInputElement;
  public seedInput?: HTMLInputElement;
  public locatorInput?: HTMLInputElement;
  public connectUsernameInput?: HTMLInputElement;
  public connectSeedInput?: HTMLInputElement;
  public connectPrompt?: HTMLElement;
  public connectConfirmButton?: HTMLButtonElement;
  public connectDenyButton?: HTMLButtonElement;

  private flow: WebPassFlow = DEFAULT_FLOW;
  private action: WebPassAction = DEFAULT_ACTION;
  private keyType = DEFAULT_KEY_TYPE;
  private challenge?: string;
  private actionPayload?: string;
  private connect = createConnectState();
  private initialized = false;
  private delegatesAttached = false;
  private isPopupContext = false;
  private connectMessageHandler?: (event: MessageEvent) => void;

  connectedCallback(): void {
    if (this.initialized || typeof document === 'undefined') {
      return;
    }
    this.initialized = true;
    this.flow = this.readFlowAttribute();
    this.isPopupContext = this.flow === 'connect' && typeof window !== 'undefined' && !!window.opener;
    this.render();
    if (this.flow === 'create') {
      this.setupCreateFlow();
    }
    this.refreshFromAttributes();
    this.attachDelegates();
    this.attachMessageHandlers();
    fireEvent(this, 'webpass:ready', { flow: this.flow, webPass: this.createFlow });
  }

  disconnectedCallback(): void {
    if (this.connectMessageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.connectMessageHandler);
      this.connectMessageHandler = undefined;
    }
  }

  createPass(): WebPassEntry {
    if (!this.createFlow) {
      throw new Error('Web Pass create flow is not ready yet.');
    }
    this.syncCreateOptions();
    const entry = this.createFlow.createPass();
    fireEvent(this, 'webpass:create', entry);
    return entry;
  }

  clear(): void {
    this.createFlow?.clearInputs();
  }

  refreshFromAttributes(): void {
    this.flow = this.readFlowAttribute();
    if (this.flow === 'create') {
      this.applyFormAttributes();
      this.syncCreateOptions();
      this.refreshLocatorPreview();
    } else if (this.flow === 'load') {
      this.applyFormAttributes();
    } else {
      this.syncConnectOptions();
    }
  }

  private readFlowAttribute(): WebPassFlow {
    const flow = this.getAttribute('flow');
    if (flow === 'connect') {
      return 'connect';
    }
    if (flow === 'load') {
      return 'load';
    }
    return 'create';
  }

  private render(): void {
    this.createFlow = undefined;
    this.form = undefined;
    this.usernameInput = undefined;
    this.seedInput = undefined;
    this.locatorInput = undefined;
    this.connectUsernameInput = undefined;
    this.connectSeedInput = undefined;
    this.connectPrompt = undefined;
    this.connectConfirmButton = undefined;
    this.connectDenyButton = undefined;

    if (this.flow === 'create') {
      this.renderCreateForm();
      return;
    }
    if (this.flow === 'load') {
      this.renderLoadForm();
      return;
    }
    this.renderConnectPopup();
  }

  private renderCreateForm(): void {
    this.innerHTML = `
      <form class="form web-pass-form" autocomplete="off" novalidate method="post">
        <label class="web-pass-field">
          Web Pass name
          <div class="web-pass-input-stack" style="position: relative;">
            <input data-role="username" type="text" name="webpass-name" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Name your Web Pass" style="position: relative; z-index: 1; width: 100%; display: block; box-sizing: border-box;">
            <input data-role="seed" type="password" name="password" autocomplete="new-password" placeholder="Generated seed phrase appears here" style="position: absolute; inset: 0; z-index: 0; border: 0; background: transparent;">
            <input data-role="locator" type="email" name="email" autocomplete="email" placeholder="pass@origin" style="position: absolute; inset: 0; z-index: 0; border: 0; background: transparent;">
          </div>
        </label>
        <div class="buttons web-pass-actions">
          <button data-role="submit" type="submit" class="primary">Save Web Pass</button>
        </div>
      </form>
    `;

    const form = this.querySelector('form');
    const usernameInput = this.querySelector('input[data-role="username"]');
    const locatorInput = this.querySelector('input[data-role="locator"]');
    const seedInput = this.querySelector('input[data-role="seed"]');

    if (
      !(form instanceof HTMLFormElement) ||
      !(usernameInput instanceof HTMLInputElement) ||
      !(locatorInput instanceof HTMLInputElement) ||
      !(seedInput instanceof HTMLInputElement)
    ) {
      return;
    }

    this.form = form;
    this.usernameInput = usernameInput;
    this.seedInput = seedInput;
    this.locatorInput = locatorInput;
  }

  private renderLoadForm(): void {
    this.innerHTML = `
      <form class="form web-pass-form" autocomplete="on" novalidate method="post">
        <label class="web-pass-field">
          Web Pass name
          <input data-role="username" type="text" name="username" autocomplete="username" placeholder="Search for your Web Pass">
        </label>
        <label class="web-pass-field">
          Seed phrase
          <input data-role="seed" type="password" name="password" autocomplete="current-password" placeholder="Select from your password manager">
        </label>
      </form>
    `;

    const form = this.querySelector('form');
    const usernameInput = this.querySelector('input[data-role="username"]');
    const seedInput = this.querySelector('input[data-role="seed"]');

    if (
      !(form instanceof HTMLFormElement) ||
      !(usernameInput instanceof HTMLInputElement) ||
      !(seedInput instanceof HTMLInputElement)
    ) {
      return;
    }

    this.form = form;
    this.usernameInput = usernameInput;
    this.seedInput = seedInput;
  }

  private renderConnectPopup(): void {
    this.innerHTML = `
      <form class="form web-pass-form" autocomplete="on" novalidate method="post">
        <label class="web-pass-field">
          Web Pass username
          <div class="web-pass-input-stack" style="position: relative;">
            <input data-role="username" type="text" name="username" autocomplete="username">
            <input data-role="seed" type="password" name="password" autocomplete="current-password" style="position: absolute; inset: 0; opacity: 0; pointer-events: none;">
          </div>
        </label>
        <p class="web-pass-note" data-role="prompt">Waiting for a Web Pass request...</p>
        <div class="buttons web-pass-actions">
          <button data-role="confirm" type="button" class="primary" style="background: #1f7a4a; color: #fff;" disabled>Confirm</button>
          <button data-role="deny" type="button" class="secondary" style="background: #c0392b; color: #fff;">Deny</button>
        </div>
      </form>
    `;

    const form = this.querySelector('form');
    const usernameInput = this.querySelector('input[data-role="username"]');
    const seedInput = this.querySelector('input[data-role="seed"]');
    const prompt = this.querySelector('[data-role="prompt"]');
    const confirmButton = this.querySelector('[data-role="confirm"]');
    const denyButton = this.querySelector('[data-role="deny"]');

    if (
      !(form instanceof HTMLFormElement) ||
      !(usernameInput instanceof HTMLInputElement) ||
      !(seedInput instanceof HTMLInputElement) ||
      !(confirmButton instanceof HTMLButtonElement) ||
      !(denyButton instanceof HTMLButtonElement) ||
      !(prompt instanceof HTMLElement)
    ) {
      return;
    }

    this.form = form;
    this.connectUsernameInput = usernameInput;
    this.connectSeedInput = seedInput;
    this.connectPrompt = prompt;
    this.connectConfirmButton = confirmButton;
    this.connectDenyButton = denyButton;
  }

  private setupCreateFlow(): void {
    if (!this.form) {
      return;
    }
    this.createFlow = new WebPassCreate({
      form: this.form
    });
    this.usernameInput = this.createFlow.usernameInput;
    this.seedInput = this.createFlow.seedInput;
    this.locatorInput = this.createFlow.locatorInput;
    this.prepareCreateFlow();
  }

  private prepareCreateFlow(): void {
    if (!this.createFlow) {
      return;
    }
    try {
      this.createFlow.prepare();
    } catch (error) {
      fireEvent(this, 'webpass:error', {
        error,
        message: error instanceof Error ? error.message : 'Failed to prepare Web Pass.'
      });
    }
  }

  private syncCreateOptions(): void {
    if (!this.createFlow) {
      return;
    }
    const options = this.readCreateOptionsFromAttributes();
    this.createFlow.updateOptions(options);
    this.prepareCreateFlow();
  }

  private readCreateOptionsFromAttributes(): Partial<WebPassCreateOptions> {
    const options: Partial<WebPassCreateOptions> = {};
    const encoding = this.getAttribute('seed-encoding');
    if (encoding === 'bip39') {
      options.encoding = encoding;
    }
    const bytes = parseNumberAttribute(this.getAttribute('seed-bytes'));
    if (bytes !== undefined) {
      options.bytes = bytes;
    }
    const origin = this.getAttribute('origin');
    if (origin) {
      options.origin = origin;
    }
    const locatorDomain = this.getAttribute('locator-domain');
    if (locatorDomain) {
      options.locatorDomain = locatorDomain;
    }
    return options;
  }

  private refreshLocatorPreview(): void {
    if (!this.createFlow || !this.locatorInput) {
      return;
    }
    try {
      const nextPreview = this.createFlow.previewLocator();
      updateInputValue(this.locatorInput, nextPreview);
    } catch (error) {
      updateInputValue(this.locatorInput, '');
    }
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
  }

  private applyFormAttributes(): void {
    if (!this.form) {
      return;
    }
    const formAction = this.getAttribute('form-action') ?? this.getAttribute('action');
    if (formAction && !['login', 'sign'].includes(formAction)) {
      this.form.action = formAction;
    }
    const method = this.getAttribute('method');
    if (method) {
      this.form.method = method;
    }
    const autocomplete = this.getAttribute('autocomplete');
    this.form.autocomplete = autocomplete === 'on' ? 'on' : 'off';
  }

  private attachDelegates(): void {
    if (this.delegatesAttached) {
      return;
    }
    this.delegatesAttached = true;

    if (this.flow === 'create') {
      this.attachCreateDelegates();
    } else if (this.flow === 'load') {
      this.attachLoadDelegates();
    } else {
      this.attachConnectDelegates();
    }
  }

  private attachCreateDelegates(): void {
    if (!this.form) {
      return;
    }
    this.form.addEventListener('submit', () => {
      try {
        this.createPass();
      } catch (error) {
        fireEvent(this, 'webpass:error', {
          error,
          message: error instanceof Error ? error.message : 'Failed to generate Web Pass.'
        });
      }
    });
  }

  private attachLoadDelegates(): void {
    if (!this.seedInput) {
      return;
    }
    const handleLoad = () => {
      const seed = normalizeSeedPhrase(this.seedInput?.value ?? '');
      if (!seed) {
        return;
      }
      const username = this.usernameInput?.value.trim() ?? '';
      const origin =
        this.getAttribute('origin') ??
        (typeof location !== 'undefined' ? location.origin : '');
      let locator = '';
      try {
        const locatorDomain = this.getAttribute('locator-domain') ?? this.getAttribute('origin') ?? undefined;
        locator = formatLocator(locatorDomain ?? undefined);
      } catch (error) {
        locator = '';
      }
      const entry: WebPassEntry = {
        username,
        seed,
        locator,
        origin
      };
      fireEvent(this, 'webpass:load', entry);
    };
    this.seedInput.addEventListener('input', handleLoad);
    this.seedInput.addEventListener('change', handleLoad);
  }

  private attachConnectDelegates(): void {
    if (!this.isPopupContext) {
      if (this.connectPrompt) {
        this.connectPrompt.textContent = 'Open this page from an app to approve a Web Pass request.';
      }
      if (this.connectConfirmButton) {
        this.connectConfirmButton.disabled = true;
      }
      return;
    }

    if (this.connectSeedInput) {
      this.connectSeedInput.addEventListener('input', () => {
        this.handleSeedInput();
      });
    }
    this.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }
      if (target.closest('[data-role="confirm"]')) {
        void this.confirmConnect();
        return;
      }
      if (target.closest('[data-role="deny"]')) {
        this.denyConnect();
      }
    });
  }

  private attachMessageHandlers(): void {
    if (this.flow !== 'connect' || typeof window === 'undefined') {
      return;
    }
    this.connectMessageHandler = (event: MessageEvent) => {
      this.handleMessage(event);
    };
    window.addEventListener('message', this.connectMessageHandler);
    if (this.isPopupContext && window.opener) {
      const ready: WebPassConnectReady = { source: 'web-pass', type: 'webpass:ready' };
      window.opener.postMessage(ready, '*');
    }
  }

  private handleMessage(event: MessageEvent): void {
    const data = event.data as WebPassConnectRequest | null;
    if (!data || typeof data !== 'object' || data.source !== 'web-pass') {
      return;
    }
    if (this.isPopupContext && data.type === 'webpass:request') {
      this.handleConnectRequest(event, data);
    }
  }

  private handleConnectRequest(event: MessageEvent, request: WebPassConnectRequest): void {
    if (!this.isPopupContext || typeof window === 'undefined') {
      return;
    }
    if (window.opener && event.source !== window.opener) {
      return;
    }
    this.connect = createConnectState();
    this.connect.request = request;
    this.connect.requestOrigin = event.origin;
    this.action = request.action;
    this.keyType = request.keyType || DEFAULT_KEY_TYPE;
    this.challenge = request.challenge;
    this.actionPayload = request.actionPayload;
    if (!parseLocator(request.locator)) {
      this.sendConnectError('Invalid Web Pass locator received from the requesting site.');
      return;
    }
    if (this.connectPrompt) {
      this.connectPrompt.textContent = createPromptText(this.action, event.origin);
    }
    if (this.connectConfirmButton) {
      this.connectConfirmButton.disabled = true;
    }
    this.handleSeedInput();
  }

  private handleSeedInput(): void {
    if (!this.connectSeedInput) {
      return;
    }
    const seed = normalizeSeedPhrase(this.connectSeedInput.value);
    if (!seed) {
      return;
    }
    if (!this.connect.request) {
      this.connect.seed = seed;
      return;
    }
    this.connect.seed = seed;
    try {
      this.connect.keyPair = deriveKeyPair(seed, this.keyType);
    } catch (error) {
      this.sendConnectError('Failed to derive key material.');
      return;
    }
    if (this.connectConfirmButton) {
      this.connectConfirmButton.disabled = false;
    }
  }

  private async confirmConnect(): Promise<void> {
    if (this.connect.responseSent) {
      return;
    }
    if (!this.connect.request) {
      this.sendConnectError('No Web Pass request is available.');
      return;
    }
    const seed = normalizeSeedPhrase(this.connect.seed ?? this.connectSeedInput?.value ?? '');
    if (!seed) {
      this.sendConnectError('Web Pass seed was not provided.');
      return;
    }
    this.connect.seed = seed;
    const keyPair = this.connect.keyPair ?? deriveKeyPair(seed, this.keyType);
    this.connect.keyPair = keyPair;
    const response: WebPassConnectResponse = {
      source: 'web-pass',
      type: 'webpass:response',
      requestId: this.connect.request.requestId,
      locator: this.connect.request.locator,
      action: this.connect.request.action,
      keyType: this.connect.request.keyType,
      result: 'confirm',
      publicKey: encodeBytes(keyPair.publicKey)
    };
    try {
      if (this.connect.request.action === 'login') {
        const challenge = this.connect.request.challenge;
        if (!challenge) {
          throw new Error('Login challenge is required.');
        }
        response.signature = signPayload(challenge, keyPair);
      } else if (this.connect.request.action === 'sign') {
        const payload = this.connect.request.actionPayload ?? this.actionPayload ?? this.connect.request.challenge ?? this.challenge;
        if (!payload) {
          throw new Error('Signature payload is required.');
        }
        response.signature = signPayload(payload, keyPair);
      }
      const authJwt = this.readAuthJwt();
      if (authJwt) {
        response.authJwt = authJwt;
      }
      this.sendConnectResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fulfill Web Pass request.';
      this.sendConnectError(message);
    }
  }

  private readAuthJwt(): string | undefined {
    const token = this.getAttribute('auth-jwt') ?? this.getAttribute('authz-jwt');
    const trimmed = token?.trim();
    return trimmed ? trimmed : undefined;
  }

  private denyConnect(): void {
    if (!this.connect.request) {
      this.sendConnectError('No Web Pass request is available.');
      return;
    }
    const response: WebPassConnectResponse = {
      source: 'web-pass',
      type: 'webpass:response',
      requestId: this.connect.request.requestId,
      locator: this.connect.request.locator,
      action: this.connect.request.action,
      keyType: this.connect.request.keyType,
      result: 'deny',
      error: 'User denied the request.'
    };
    this.sendConnectResponse(response);
  }

  private sendConnectResponse(response: WebPassConnectResponse): void {
    if (this.connect.responseSent) {
      return;
    }
    this.connect.responseSent = true;
    if (typeof window !== 'undefined' && window.opener) {
      const targetOrigin = this.connect.requestOrigin ?? '*';
      window.opener.postMessage(response, targetOrigin);
    }
    if (typeof window !== 'undefined') {
      window.setTimeout(() => window.close(), 0);
    }
  }

  private sendConnectError(message: string): void {
    if (!this.connect.request) {
      this.dispatchConnectError(message);
      return;
    }
    const response: WebPassConnectResponse = {
      source: 'web-pass',
      type: 'webpass:response',
      requestId: this.connect.request.requestId,
      locator: this.connect.request.locator,
      action: this.connect.request.action,
      keyType: this.connect.request.keyType,
      result: 'error',
      error: message
    };
    this.sendConnectResponse(response);
  }

  private dispatchConnectError(message: string, error?: unknown): void {
    fireEvent(this, 'webpass:connect-error', { message, error });
    fireEvent(this, 'webpass:error', { message, error });
  }

  private clearConnectState(): void {
    this.connect = createConnectState();
  }
}

export function defineWebPassFormElement(tagName = WEB_PASS_FORM_TAG): void {
  if (typeof globalThis === 'undefined') {
    return;
  }
  const registry = globalThis.customElements;
  if (!registry || registry.get(tagName)) {
    return;
  }
  registry.define(tagName, WebPassFormElement);
}

if (typeof globalThis !== 'undefined' && globalThis.customElements) {
  defineWebPassFormElement();
}

declare global {
  interface HTMLElementTagNameMap {
    'web-pass-form': WebPassFormElement;
  }
}

export { WebPassCreate as WebPass };
export default WebPassCreate;
