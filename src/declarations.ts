export type WebPassSeedEncoding = 'bip39';
export type WebPassFlow = 'create' | 'load' | 'connect';
export type WebPassAction = 'login' | 'sign';

export interface WebPassSeedOptions {
  bytes?: number;
  encoding?: WebPassSeedEncoding;
}

export interface WebPassConnectOptions {
  action?: WebPassAction;
  keyType?: string;
  challenge?: string;
  actionPayload?: string;
  popupPath?: string;
}

export interface WebPassCreateOptions extends WebPassSeedOptions {
  form: HTMLFormElement | string;
  origin?: string;
  locatorDomain?: string;
  onCreate?: (entry: WebPassEntry) => void;
}

export interface WebPassOptions extends WebPassCreateOptions, WebPassConnectOptions {}

export interface WebPassEntry {
  username: string;
  seed: string;
  locator: string;
  origin: string;
}

export interface WebPassConnectRequest {
  source: 'web-pass';
  type: 'webpass:request';
  requestId: string;
  locator: string;
  action: WebPassAction;
  keyType: string;
  challenge?: string;
  actionPayload?: string;
}

export interface WebPassConnectResponse {
  source: 'web-pass';
  type: 'webpass:response';
  requestId: string;
  locator: string;
  action: WebPassAction;
  keyType: string;
  result: 'confirm' | 'deny' | 'error';
  publicKey?: string;
  signature?: string;
  ciphertext?: string;
  iv?: string;
  authJwt?: string;
  authzJwt?: string;
  error?: string;
}

export interface WebPassConnectReady {
  source: 'web-pass';
  type: 'webpass:ready';
}

export interface WebPassConnectChallengeDetail {
  request: WebPassConnectRequest;
  defaultChallenge?: string;
  setChallenge: (challenge: string) => void;
  setError: (message: string) => void;
}

export type WebPassKeyPair = {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  curve: 'secp256k1' | 'ed25519';
};

export type WebPassConnectState = {
  request?: WebPassConnectRequest;
  requestOrigin?: string;
  popup?: Window | null;
  requestSent: boolean;
  responseSent: boolean;
  seed?: string;
  keyPair?: WebPassKeyPair;
};

export interface WebPassAuthStoreOptions {
  storage?: Storage;
  storageKey?: string;
}
