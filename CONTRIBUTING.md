# Contributing to Web Pass

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

Use `npm run dev` for the localhost demo server and `npm run test:watch` while
working on TypeScript source.

## Code Style

- Use TypeScript for all source files
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

## Testing

Please ensure all tests pass before submitting a PR:

```bash
npm test
```

## Questions?

Feel free to open an issue for questions or discussions.
