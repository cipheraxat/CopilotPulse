import { describe, it, expect } from 'vitest';
import { isValidMessage } from '../hooks/useVsCode';

describe('isValidMessage', () => {
  it('returns true for valid message objects with type string', () => {
    expect(isValidMessage({ type: 'sessions', data: [], total: 0 })).toBe(true);
    expect(isValidMessage({ type: 'error', message: 'fail' })).toBe(true);
    expect(isValidMessage({ type: 'loading', loading: true })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidMessage(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidMessage(undefined)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isValidMessage('hello')).toBe(false);
    expect(isValidMessage(42)).toBe(false);
    expect(isValidMessage(true)).toBe(false);
  });

  it('returns false for objects without type property', () => {
    expect(isValidMessage({})).toBe(false);
    expect(isValidMessage({ data: [] })).toBe(false);
  });

  it('returns false for objects where type is not a string', () => {
    expect(isValidMessage({ type: 123 })).toBe(false);
    expect(isValidMessage({ type: null })).toBe(false);
    expect(isValidMessage({ type: true })).toBe(false);
  });

  it('returns true for unknown message types (runtime guard only checks shape)', () => {
    expect(isValidMessage({ type: 'unknown-type' })).toBe(true);
  });

  it('returns false for arrays', () => {
    expect(isValidMessage([{ type: 'sessions' }])).toBe(false);
  });
});
