import { describe, expect, it } from 'vitest';
import { buildSmoothPath } from './chart';

describe('buildSmoothPath', () => {
  it('handles empty and single-point series', () => {
    expect(buildSmoothPath([])).toBe('');
    expect(buildSmoothPath([{ x: 4, y: 8 }])).toBe('M 4 8');
  });

  it('builds one cubic segment per gap without invalid numbers', () => {
    const path = buildSmoothPath([
      { x: 0, y: 20 },
      { x: 10, y: 20 },
      { x: 20, y: 15 },
      { x: 30, y: 10 },
    ]);

    expect(path.startsWith('M 0 20')).toBe(true);
    expect(path.match(/ C /g)).toHaveLength(3);
    expect(path).not.toContain('NaN');
    expect(path).not.toContain('Infinity');
  });
});
