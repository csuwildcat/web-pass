# Web Pass

Web Pass is a cryptographic credential system for the web that enables secure authentication and signing through BIP-39 seed phrases and elliptic curve cryptography. It provides a bridge between web applications and wallet-like credential management, enabling passwordless authentication flows with public-key infrastructure.

## Status

- Core API under active development and refinement
- Foundation-level implementation stable for experimental use
- Browser custom elements (`<web-pass-form>`, `<web-pass-connect>`) production-ready for demos
- Security model and threat model documentation in progress

## Architecture

Web Pass is built around three main components:

1. **Wallet-side (`src/wallet.ts`)**: Manages credential generation, storage, and signing using BIP-39 mnemonics and elliptic curve keys (secp256k1/ed25519)
2. **App-side (`src/app.ts`)**: Handles authentication flows through a secure popup interface with postMessage-based protocol
3. **Shared utilities (`src/utils.ts`)**: Locator formatting, key derivation, and cross-origin communication helpers

## Key Features

- **BIP-39 Mnemonic Seeds**: Credentials are derived from 128-bit or 256-bit BIP-39 seed phrases for human-readable backup
- **Elliptic Curve Cryptography**: Native secp256k1 and ed25519 support via `@noble/curves` for signing operations
- **Web Custom Elements**: Framework-agnostic `<web-pass-form>` and `<web-pass-connect>` elements for UI integration
- **Cross-origin Communication**: Secure popup-based authentication flow with origin validation and request isolation
- **Derivable Key Material**: Deterministic key pair generation from seed phrases supporting multiple curves
- **WebAuthn-adjacent**: Provides passwordless authentication patterns compatible with server challenge-response flows

## Installation

```bash
npm install web-pass
```

### TypeScript Setup

Requires Node.js 20.19+ and TypeScript 5.9+. The package ships with full type definitions.

## Usage

### Create a Web Pass (Wallet)

Generate a new credential with BIP-39 seed:

```typescript
import { WebPass, generateSeed } from 'web-pass/wallet';

const seed = generateSeed(); // "abandon ability able about above absent..." 
const webPass = new WebPass({ form: '#web-pass-form' });
const entry = webPass.createPass();

// entry = {
//   username: 'My Web Pass',
//   seed: 'abandon ability able about above absent...',
//   locator: 'mypass@example.com',
//   origin: 'https://example.com'
// }
```

### Use Web Pass Form Element

The `<web-pass-form>` custom element handles credential creation UI:

```html
<web-pass-form></web-pass-form>
```

```typescript
import 'web-pass/wallet';

const element = document.querySelector('web-pass-form');
element.addEventListener('webpass:create', (event) => {
  console.log('Web Pass created:', event.detail);
});
```

### Request Authentication (App)

Apps request Web Pass authentication through the `<web-pass-connect>` element:

```html
<web-pass-connect
  action="login"
  key-type="secp256k1"
  challenge="server-generated-nonce"
></web-pass-connect>
```

```typescript
import 'web-pass/app';

const element = document.querySelector('web-pass-connect');
element.addEventListener('webpass:connect', (event) => {
  // event.detail contains signature and public key
  const { signature, publicKey } = event.detail;
  // Verify server-side using the public key
});
```

### Host Wallet Popup

The wallet's `/.well-known/web-pass` endpoint hosts the popup UI:

```html
<!-- /.well-known/web-pass -->
<web-pass-form flow="connect"></web-pass-form>
<script type="module">
  import 'web-pass/wallet';
</script>
```

### Key Pair Derivation

Derive cryptographic key material from seed phrases:

```typescript
import { deriveKeyPair } from 'web-pass/wallet';

const seed = 'abandon ability able about above absent...';
const keyPair = deriveKeyPair(seed, 'secp256k1');

// keyPair = {
//   privateKey: Uint8Array(32),
//   publicKey: Uint8Array(33),
//   curve: 'secp256k1'
// }
```

## Authentication Flow

1. **App initiates**: `<web-pass-connect>` opens popup to wallet origin
2. **Popup renders**: Wallet displays `<web-pass-form flow="connect">` with credential selector
3. **User approves**: Selects Web Pass from password manager and confirms action
4. **Signature created**: Wallet derives key material from seed and signs server challenge
5. **Response sent**: Popup returns signed challenge, public key, and optional auth token via postMessage
6. **Server verifies**: App backend verifies signature using returned public key

## API Reference

### Wallet API

- **`generateSeed(options?)`**: Generate a random BIP-39 seed phrase
  - `options.bytes`: 16 or 32 (default: 16 for 128-bit entropy)
  - `options.encoding`: Only 'bip39' supported
  - Returns: String with 12 or 24 words

- **`deriveKeyPair(seed, keyType)`**: Derive key pair from seed
  - `keyType`: 'secp256k1' or 'ed25519'
  - Returns: `{ privateKey, publicKey, curve }`

- **`WebPass` class**: Manages credential creation and storage
  - `createPass()`: Generate and store new credential
  - `listPasses()`: List all created credentials
  - `clear()`: Clear form inputs

- **`WebPassFormElement`** (`<web-pass-form>`): Custom element for credential UI
  - Flows: 'create' (default), 'load', 'connect'
  - Events: `webpass:create`, `webpass:load`, `webpass:error`, `webpass:ready`

### App API

- **`WebPassConnectElement`** (`<web-pass-connect>`): Custom element for authentication
  - Attributes: `action`, `key-type`, `challenge`, `action-payload`, `popup-path`, `locator-domain`
  - Events: `webpass:connect`, `webpass:connect-error`, `webpass:connect-challenge`
  - Methods: `connect(locator?)`

- **`WebPassAuthStore`** class: Persist and retrieve auth tokens
  - `set(locator, token)`: Store auth token
  - `get(locator)`: Retrieve token
  - `remove(locator)`: Clear token
  - `list()`: List all stored tokens

## Development

### Quick commands

```bash
npm run build      # Compile TypeScript + browser ESM bundles
npm run dev        # Watch package TypeScript compilation
npm run dev:demo   # Start Vite demo server (http://localhost:5330)
npm run typecheck  # Type-check without emitting
npm test           # Run unit tests
npm test:watch    # Run tests in watch mode
```

### Build Output

- `dist/index.js` + `.d.ts`: Aggregated exports
- `dist/wallet.js` + `.d.ts`: Wallet-side custom element and credential API
- `dist/app.js` + `.d.ts`: App-side authentication element and store
- Browser bundles are ESM with secp256k1 and ed25519 libraries inlined

### Project Structure

```
web-pass/
├── src/
│   ├── wallet.ts           # Credential generation, storage, signing
│   ├── app.ts              # App authentication element, auth store
│   ├── declarations.ts     # TypeScript type definitions
│   ├── utils.ts            # Locator parsing, key derivation helpers
│   ├── index.ts            # Entry point aggregation
│   └── tests/
│       └── web-pass.test.ts
├── dist/                   # Compiled output (JS + types)
├── demo/
│   ├── index.html          # Demo app shell
│   └── main.js             # Demo entry point
├── scripts/
│   └── buffer-shim.js      # Buffer polyfill for browser builds
├── package.json
├── tsconfig.json
└── vite.demo.config.js
```

## Cryptography

- **Seed derivation**: SHA-256 hash of NFKD-normalized BIP-39 mnemonic
- **Key pair generation**: secp256k1 or ed25519 from seed hash
- **Signing**: Native elliptic curve signatures (deterministic)
- **Encoding**: base64url for public keys and signatures in JSON

## Dependencies

- **`@noble/curves`**: Elliptic curve operations (secp256k1, ed25519)
- **`@noble/hashes`**: SHA-256 hashing
- **`@scure/base`**: base64url encoding
- **`bip39`**: BIP-39 mnemonic generation and normalization
- **`cbor-x`**: CBOR serialization (optional, for future extensions)

## Security Considerations

Web Pass is **experimental and pre-release**. Before production use:

- ✅ Review the [SECURITY.md](./SECURITY.md) documentation
- ✅ Audit dependencies (`@noble/curves`, `@noble/hashes` are high-quality libraries)
- ✅ Test threat model against your threat actors
- ✅ Use in controlled environments initially (internal tools, research)
- ❌ **Do not** use with real high-value secrets until threat model is published
- ❌ **Do not** assume web custom elements are tamper-proof in all environments

### Publishing

```bash
npm version patch  # or minor, major
npm run build
npm publish --access public
```

Releases are published to npm with full type definitions and ESM bundles.

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Hands-on usage and local development
- [SECURITY.md](./SECURITY.md) - Security model and best practices
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

## License

MIT

---

**Learn more**: [Homepage](https://backalleycoder.com/web-pass/) | Author: Daniel Buchner
