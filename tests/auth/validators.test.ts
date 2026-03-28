import test from 'node:test';
import assert from 'node:assert/strict';
import { asEnum, asFiniteNumber, asNonEmptyString, asNullableNumber } from '@/lib/auth/validators';

test('asNonEmptyString trims and validates', () => {
  assert.equal(asNonEmptyString('  hello  '), 'hello');
  assert.equal(asNonEmptyString('   '), null);
  assert.equal(asNonEmptyString(42), null);
});

test('asEnum validates allowed set', () => {
  const providers = ['tbc', 'bog'] as const;
  assert.equal(asEnum('tbc', providers), 'tbc');
  assert.equal(asEnum('paypal', providers), null);
});

test('numeric validators reject non-finite values', () => {
  assert.equal(asFiniteNumber(12.5), 12.5);
  assert.equal(asFiniteNumber(Number.NaN), null);
  assert.equal(asNullableNumber(null), null);
  assert.equal(asNullableNumber(10), 10);
});
