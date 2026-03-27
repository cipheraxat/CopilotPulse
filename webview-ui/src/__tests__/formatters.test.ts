import { describe, it, expect } from 'vitest';
import {
  formatCost,
  formatNumber,
  formatDuration,
  relativeTime,
  formatDate,
  formatDateOnly,
} from '../utilities/formatters';

describe('formatCost', () => {
  it('formats small costs with 4 decimal places', () => {
    expect(formatCost(0.0012)).toBe('$0.0012');
    expect(formatCost(0.0001)).toBe('$0.0001');
  });

  it('formats larger costs with 2 decimal places', () => {
    expect(formatCost(1.5)).toBe('$1.50');
    expect(formatCost(12.99)).toBe('$12.99');
  });

  it('handles zero', () => {
    expect(formatCost(0)).toBe('$0.0000');
  });
});

describe('formatNumber', () => {
  it('formats millions with M suffix', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M');
    expect(formatNumber(2_000_000)).toBe('2.0M');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1_500)).toBe('1.5K');
    expect(formatNumber(10_000)).toBe('10.0K');
  });

  it('formats small numbers with locale string', () => {
    expect(formatNumber(999)).toBeDefined();
    expect(formatNumber(0)).toBeDefined();
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(5_000)).toBe('5s');
    expect(formatDuration(59_000)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90_000)).toBe('1m 30s');
    expect(formatDuration(3_600_000)).toBe('1h 0m');
  });

  it('formats hours', () => {
    expect(formatDuration(7_200_000)).toBe('2h 0m');
    expect(formatDuration(5_430_000)).toBe('1h 30m');
  });

  it('handles zero and negative', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-100)).toBe('0s');
  });
});

describe('relativeTime', () => {
  it('returns "just now" for recent timestamps', () => {
    expect(relativeTime(Date.now() - 10_000)).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(relativeTime(Date.now() - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(relativeTime(Date.now() - 3 * 3_600_000)).toBe('3h ago');
  });

  it('returns days ago', () => {
    expect(relativeTime(Date.now() - 2 * 86_400_000)).toBe('2d ago');
  });

  it('returns date for old timestamps', () => {
    const oldDate = Date.now() - 30 * 86_400_000;
    const result = relativeTime(oldDate);
    expect(result).not.toContain('ago');
  });
});

describe('formatDate', () => {
  it('returns a formatted date string', () => {
    const ts = new Date('2025-06-15T14:30:00').getTime();
    const result = formatDate(ts);
    expect(result).toContain('15');
    expect(result).toBeDefined();
  });
});

describe('formatDateOnly', () => {
  it('returns a date-only string', () => {
    const ts = new Date('2025-01-20').getTime();
    const result = formatDateOnly(ts);
    expect(result).toContain('2025');
    expect(result).toBeDefined();
  });
});
