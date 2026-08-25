import { expect, test } from 'vitest';

import { formatLocator, generateSeed } from '../wallet.js';
import { normalizePopupPath, resolvePopupUrl } from '../utils.js';

test('formatLocator builds the expected locator', () => {
  const locator = formatLocator();
  expect(locator).toBe('pass@localhost');
});

test('formatLocator accepts origins or locator domains', () => {
  expect(formatLocator('https://wallet.example.com')).toBe('pass@wallet.example.com');
  expect(formatLocator('pass@Example.com')).toBe('pass@example.com');
});

test('generateSeed defaults to bip39 output', () => {
  const seed = generateSeed();
  const words = seed.trim().split(/\s+/);
  expect(words).toHaveLength(12);
  words.forEach((word) => {
    expect(word).toMatch(/^[a-z]+$/);
  });
});

test('generateSeed accepts 32-byte entropy when requested', () => {
  const seed = generateSeed({ bytes: 32 });
  const words = seed.trim().split(/\s+/);
  expect(words).toHaveLength(24);
});

test('generateSeed rejects unsupported entropy sizes', () => {
  expect(() => generateSeed({ bytes: 24 })).toThrow();
});

test('generateSeed rejects non-bip39 encodings', () => {
  expect(() => generateSeed({ encoding: 'base64url' as unknown as any })).toThrow();
});

test('normalizePopupPath preserves explicit relative popup paths', () => {
  expect(normalizePopupPath('./.well-known/web-pass.html')).toBe('./.well-known/web-pass.html');
  expect(normalizePopupPath('.well-known/web-pass.html')).toBe('.well-known/web-pass.html');
  expect(normalizePopupPath('/.well-known/web-pass.html')).toBe('/.well-known/web-pass.html');
});

test('resolvePopupUrl preserves a same-origin deployment base path', () => {
  const url = resolvePopupUrl(
    './.well-known/web-pass.html',
    'https://example.github.io',
    'https://example.github.io/web-pass/'
  );
  expect(url.href).toBe('https://example.github.io/web-pass/.well-known/web-pass.html');
});

test('resolvePopupUrl handles relative paths without a dot prefix', () => {
  const url = resolvePopupUrl(
    '.well-known/web-pass.html',
    'https://example.github.io',
    'https://example.github.io/web-pass/'
  );
  expect(url.href).toBe('https://example.github.io/web-pass/.well-known/web-pass.html');
});

test('resolvePopupUrl keeps cross-origin wallet paths on the wallet origin', () => {
  const url = resolvePopupUrl(
    './.well-known/web-pass.html',
    'https://wallet.example.com',
    'https://app.example.com/project/'
  );
  expect(url.href).toBe('https://wallet.example.com/.well-known/web-pass.html');
});
