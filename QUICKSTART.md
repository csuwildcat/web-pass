# Quick Start

This guide covers basic usage and local development setup for Web Pass. The API
is still in flux, so the usage section is intentionally minimal.

## Installation

```bash
npm install web-pass
```

## Basic usage

### Custom element (recommended)

```html
<web-pass-form></web-pass-form>
```

Web Pass defaults to BIP-39 words for the stored password seed.

```typescript
import 'web-pass/wallet';

const element = document.querySelector('web-pass-form');
element?.addEventListener('webpass:create', (event) => {
  console.log('Created Web Pass:', event.detail);
});
```

### Bring-your-own form

Your form **must** include a username, password, and locator input with the
correct `name` or `autocomplete` attributes shown below. The locator and
password inputs should be read-only because they are derived from the label and
seed generator.

```html
<form id="web-pass-form" autocomplete="on" method="post">
  <input name="username" autocomplete="username" />
  <input name="email" autocomplete="email" readonly />
  <input name="password" autocomplete="new-password" type="password" readonly />
</form>
```

```typescript
import { WebPass } from 'web-pass/wallet';

const webPass = new WebPass({ form: '#web-pass-form' });
const entry = webPass.createPass();
console.log(entry);
```

### Connect flow (app + popup)

App pages that want to request a Web Pass should render the app-side connect
element and provide the action, key type, and (for login) a challenge string to
sign. For `sign`, set `action-payload` to the string to sign.

```html
<web-pass-connect
  action="login"
  key-type="secp256k1"
  challenge="nonce-from-server"
></web-pass-connect>
```

```typescript
import 'web-pass/app';
```

The Web Pass origin should host a `/.well-known/web-pass` page that includes
the wallet-side element in connect flow to handle the popup confirmation UI:

```html
<web-pass-form flow="connect"></web-pass-form>
```

```typescript
import 'web-pass/wallet';
```

## Browser demo (optional)

```bash
npm install
npm run dev
```

This starts a local server at `http://localhost:5330` with the demo shell. The
demo loads `src/wallet.ts` and `src/app.ts` through Vite, with hot reload during
development. `localhost` gives the app a real origin and is treated as a
trustworthy local context by browsers; opening the HTML over `file://` does
not. Vite also bundles bare package imports such as `buffer` that a browser
cannot load directly.

## Development (if working on this repo)

### Prerequisites

- Node.js 20.19+
- npm or pnpm
- A modern browser

### Setup

```bash
cd /Users/daniel/repos/web-pass
npm install
```

### Build, watch, and test

```bash
# Local browser server with Vite HMR
npm run dev

# Watch source tests
npm run test:watch

# Type-check without emitting files
npm run typecheck

# Run tests once
npm test

# Build the npm package in dist/ and static site in site/
npm run build

# Test the generated site locally
npm run preview
```

Tests live in `src/tests/` and run directly from TypeScript through Vitest, so
the watch command does not depend on compiled files in `dist/`.

The production site uses relative asset paths and includes the
`.well-known/web-pass.html` popup, so the same `site/` directory works at a
domain root or a GitHub Pages project path. Pushes to `main` are deployed by
`.github/workflows/pages-demo.yml` after GitHub Pages is configured to use the
**GitHub Actions** source.

### Project structure

```
web-pass/
├── src/
│   ├── app.ts            # App-side Web Pass entry point
│   ├── wallet.ts         # Wallet-side Web Pass entry point
│   ├── utils.ts          # Shared helpers
│   ├── index.ts          # Aggregated entry point
│   └── tests/
│       └── web-pass.test.ts
├── dist/                 # Compiled output
├── demo/
│   ├── index.html        # Demo shell
│   └── main.js           # Demo bootstrap
├── scripts/
│   └── buffer-shim.js    # Browser Buffer shim for package bundles
├── package.json
├── tsconfig.json
├── vite.config.js        # Dev server + production site build
├── vitest.config.js      # Source test runner
└── [documentation files]
```

## Troubleshooting

- If the demo does not load, run `npm run dev` and use the localhost URL Vite
  prints. Do not open the HTML file directly.
- If builds fail, run `npm run build` to see compiler errors.

## Next steps

- Read the [full documentation](./README.md)
- Review [security considerations](./SECURITY.md)
- See [contribution guidelines](./CONTRIBUTING.md)
