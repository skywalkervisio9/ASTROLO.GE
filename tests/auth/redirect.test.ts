import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeNextPath } from '@/lib/auth/redirect';

test('sanitizeNextPath accepts safe relative path', () => {
  assert.equal(sanitizeNextPath('/post-auth?invite=abc'), '/post-auth?invite=abc');
});

test('sanitizeNextPath rejects absolute/external urls', () => {
  assert.equal(sanitizeNextPath('https://evil.example/steal'), '/');
  assert.equal(sanitizeNextPath('//evil.example/steal'), '/');
});

test('sanitizeNextPath rejects callback recursion and line breaks', () => {
  assert.equal(sanitizeNextPath('/api/auth/callback?x=1'), '/');
  assert.equal(sanitizeNextPath('/ok\nbad'), '/');
});
