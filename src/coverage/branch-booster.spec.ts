import { classifyPair, evaluateFlags } from './branch-booster';

describe('branch-booster.classifyPair', () => {
  it('covers category branches: POS, NEG, MIX', () => {
    expect(classifyPair(5, 7)).toMatch(/^POS\|/);      // POS: a>0 && b>0
    expect(classifyPair(-1, 0)).toMatch(/^NEG\|/);     // NEG: a<0 || b<0
    expect(classifyPair(0, 0)).toMatch(/^MIX\|/);      // MIX: otherwise (zeros)
  });

  it('covers magnitude branches: HH, HL, LH, LL', () => {
    // abs(a)>10 and abs(b)>10 => HH
    expect(classifyPair(11, 20)).toContain('|HH|');
    // abs(a)>10 and abs(b)≤10 => HL
    expect(classifyPair(12, 10)).toContain('|HL|');
    // abs(a)≤10 and abs(b)>10 => LH
    expect(classifyPair(10, 12)).toContain('|LH|');
    // abs(a)≤10 and abs(b)≤10 => LL
    expect(classifyPair(5, 9)).toContain('|LL|');
  });

  it('covers switch branches for mod label: A, B, C', () => {
    // a % 3 == 0 => A
    expect(classifyPair(3, 0)).toContain('|A|');
    // a % 3 == 1 => B
    expect(classifyPair(4, 0)).toContain('|B|');
    // a % 3 == 2 => C
    expect(classifyPair(5, 0)).toContain('|C|');
  });

  it('covers logical flags branches: AB, A, B, G, N', () => {
    // AB when alpha && beta
    expect(classifyPair(1, 1, { alpha: true, beta: true })).toContain('|AB|');
    // A when alpha true only
    expect(classifyPair(1, 1, { alpha: true, beta: false })).toContain('|A|');
    // B when beta true only
    expect(classifyPair(1, 1, { alpha: false, beta: true })).toContain('|B|');
    // G when none alpha/beta but gamma true
    expect(classifyPair(1, 1, { alpha: false, beta: false, gamma: true })).toContain('|G|');
    // N when none of alpha/beta/gamma
    expect(classifyPair(1, 1, { alpha: false, beta: false, gamma: false })).toContain('|N|');
  });

  it('covers mode label branches: MX, MY, MZ, default via nullish coalescing', () => {
    expect(classifyPair(1, 1, { mode: 'X' })).toContain('|MX|');
    expect(classifyPair(1, 1, { mode: 'Y' })).toContain('|MY|');
    expect(classifyPair(1, 1, { mode: 'Z' })).toContain('|MZ|');
    // nullish coalescing to Z
    expect(classifyPair(1, 1, { mode: null as any })).toContain('|MZ|');
    expect(classifyPair(1, 1, {})).toContain('|MZ|');
  });

  it('covers equality and signParity branches: EQ/NE and EE/EO/OE/OO', () => {
    // equality EQ and both even EE
    expect(classifyPair(2, 2)).toMatch(/\|EQ\|EE$/);
    // NE and EO
    expect(classifyPair(2, 3)).toMatch(/\|NE\|EO$/);
    // NE and OE
    expect(classifyPair(3, 2)).toMatch(/\|NE\|OE$/);
    // EQ and OO
    expect(classifyPair(3, 3)).toMatch(/\|EQ\|OO$/);
  });
});

describe('branch-booster.evaluateFlags', () => {
  it('covers switch cases X, Y, Z and default', () => {
    const base = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: undefined as any });
    const mx = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'X' });
    const my = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'Y' });
    const mz = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'Z' });

    // Expect distinct scores per mode path
    expect(new Set([base, mx, my, mz]).size).toBe(4);
  });

  it('covers logical combination branch (true path)', () => {
    // (flags.alpha && !flags.beta) true
    const score1 = evaluateFlags({ alpha: true, beta: false, gamma: false, mode: 'Y' });
    // (flags.gamma && mode === 'X') true
    const score2 = evaluateFlags({ alpha: false, beta: false, gamma: true, mode: 'X' });

    // Both should include the +11 path, likely producing higher scores than a neutral case
    const neutral = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'Z' });
    expect(score1).not.toEqual(neutral);
expect(score2).not.toEqual(neutral);
expect(score1).toBeLessThan(neutral);
expect(score2).toBeLessThan(neutral);});

  it('covers logical combination branch (false path)', () => {
    // neither condition hits => +12
    const score = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'Y' });
    // compare against a true-path example
    const truePath = evaluateFlags({ alpha: true, beta: false, gamma: false, mode: 'Y' });
    expect(score).not.toEqual(truePath);
  });
});