# Web Pass

Web Pass is an early-stage reset of the prior codebase to explore a new
approach to web-based credentials. The core API is intentionally minimal while
the direction is being defined.

## Status

- API and implementation are under active design
- Project structure is preserved while core logic is reset

## Features

- Placeholder for upcoming Web Pass capabilities
- TypeScript-first package scaffolding
- Browser demo shell for future iterations

## Installation

```bash
npm install web-pass
```

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Usage + local development
- [SECURITY.md](./SECURITY.md) - Security model (in progress)
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute

## Usage

```typescript
import { WebPass } from 'web-pass/wallet';
import 'web-pass/app';

// TODO: Use the Web Pass API once it is defined.
console.log(WebPass);
```

## API Reference

The Web Pass API is being redesigned. Expect this section to change once the
new direction is finalized.

## Development

### Quick commands

```bash
npm run build      # Compile TypeScript + browser bundle
npm run dev        # Watch package output to dist/
npm run dev:demo   # Vite demo server with HMR
npm run typecheck  # Check TypeScript without emitting files
npm test           # Run tests
npm run demo       # Start the Vite demo
```

Build outputs to `dist/index.js`, `dist/wallet.js`, and `dist/app.js` with
matching `.d.ts` files. The demo server runs at `http://localhost:5330` and
loads source modules through Vite with HMR.

### Publishing (maintainers)

```bash
npm version patch  # or minor, major
npm run build
npm publish --access public
```

The package ships from `dist/` via the `exports` map in `package.json`.

## Project Structure

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
├── vite.demo.config.js
└── [documentation files]
```

## License

MIT
