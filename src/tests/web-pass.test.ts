import assert from 'node:assert/strict';
import test from 'node:test';

import { formatLocator, generateSeed } from '../wallet.js';
import { normalizePopupPath } from '../utils.js';

test('formatLocator builds the expected locator', () => {
  const locator = formatLocator();
  assert.equal(locator, 'pass@localhost');
});

test('formatLocator accepts origins or locator domains', () => {
  assert.equal(formatLocator('https://wallet.example.com'), 'pass@wallet.example.com');
  assert.equal(formatLocator('pass@Example.com'), 'pass@example.com');
});

test('generateSeed defaults to bip39 output', () => {
  const seed = generateSeed();
  const words = seed.trim().split(/\s+/);
  assert.equal(words.length, 12);
  words.forEach((word) => {
    assert.match(word, /^[a-z]+$/);
  });
});

test('generateSeed accepts 32-byte entropy when requested', () => {
  const seed = generateSeed({ bytes: 32 });
  const words = seed.trim().split(/\s+/);
  assert.equal(words.length, 24);
});

test('generateSeed rejects unsupported entropy sizes', () => {
  assert.throws(() => generateSeed({ bytes: 24 }));
});

test('generateSeed rejects non-bip39 encodings', () => {
  assert.throws(() => generateSeed({ encoding: 'base64url' as unknown as any }));
});

test('normalizePopupPath preserves explicit relative popup paths', () => {
  assert.equal(normalizePopupPath('./.well-known/web-pass.html'), './.well-known/web-pass.html');
  assert.equal(normalizePopupPath('.well-known/web-pass.html'), '.well-known/web-pass.html');
  assert.equal(normalizePopupPath('/.well-known/web-pass.html'), '/.well-known/web-pass.html');
});
