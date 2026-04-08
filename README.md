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
npm run dev        # Watch mode compilation
npm run dev:demo   # Watch mode + live demo reload
npm test           # Run tests
npm run demo       # Start interactive demo shell
```

Build outputs to `dist/index.js`, `dist/wallet.js`, and `dist/app.js` with
matching `.d.ts` files. The demo server runs at `http://localhost:8080` and
reloads on changes.

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
├── dist/                  # Compiled output
├── demo/
│   └── index.html        # Demo shell
├── scripts/
│   ├── serve-demo.js     # Demo server with live reload
│   └── dev.js            # Dev runner (tsc watch + optional demo)
├── package.json
├── tsconfig.json
└── [documentation files]
```

## License

MIT
