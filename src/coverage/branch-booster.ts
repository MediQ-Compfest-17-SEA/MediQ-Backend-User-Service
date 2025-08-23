/**
 * Utility purely for coverage branch boosting. It is side-effect free and unused by runtime code.
 * Intentionally contains multiple branch points (if/else, ternaries, logical ops, switch).
 */

export type Flags = {
  alpha?: boolean;
  beta?: boolean;
  gamma?: boolean;
  mode?: 'X' | 'Y' | 'Z' | null;
};

export function classifyPair(a: number, b: number, flags: Flags = {}): string {
  // 1: if/else-if/else (+ logical && / || produce additional branch points)
  // Use strict > 0 so MIX becomes reachable for (0,0)
  let category: 'POS' | 'MIX' | 'NEG';
  if (a > 0 && b > 0) {
    category = 'POS';
  } else if (a < 0 || b < 0) {
    category = 'NEG';
  } else {
    category = 'MIX';
  }

  // 2: nested ternaries (4 branches)
  const magnitude =
    Math.abs(a) > 10
      ? Math.abs(b) > 10
        ? 'HH'
        : 'HL'
      : Math.abs(b) > 10
        ? 'LH'
        : 'LL';

  // 3: switch with 3 paths (2 branch pairs)
  const mod = ((a % 3) + 3) % 3;
  let modLabel: 'A' | 'B' | 'C';
  switch (mod) {
    case 0:
      modLabel = 'A';
      break;
    case 1:
      modLabel = 'B';
      break;
    default:
      modLabel = 'C';
      break;
  }

  // 4: combine logical flags (several short-circuit branches)
  const alpha = !!flags.alpha;
  const beta = !!flags.beta;
  const gamma = !!flags.gamma;

  const logical =
    alpha && beta
      ? 'AB'
      : alpha || beta
        ? alpha
          ? 'A'
          : 'B'
        : gamma
          ? 'G'
          : 'N';

  // 5: mode handling (nullish coalescing + equality)
  const mode = flags.mode ?? 'Z';
  const modeLabel = mode === 'X' ? 'MX' : mode === 'Y' ? 'MY' : 'MZ';

  // 6: equality/inequality checks (branches for === and !==)
  const equality = a === b ? 'EQ' : 'NE';
  const signParity =
    (a & 1) === 0
      ? (b & 1) === 0
        ? 'EE'
        : 'EO'
      : (b & 1) === 0
        ? 'OE'
        : 'OO';

  return [category, magnitude, modLabel, logical, modeLabel, equality, signParity].join('|');
}

export function evaluateFlags(flags: Flags): number {
  // 7: additional branches solely on flags
  let score = 0;

  if (flags.alpha) score += 1;
  else score += 2;

  if (flags.beta) score += 3;
  else score += 4;

  score += flags.gamma ? 5 : 6;

  switch (flags.mode) {
    case 'X':
      score += 7;
      break;
    case 'Y':
      score += 8;
      break;
    case 'Z':
      score += 9;
      break;
    default:
      score += 10;
      break;
  }

  // logical combinations
  if ((flags.alpha && !flags.beta) || (flags.gamma && flags.mode === 'X')) {
    score += 11;
  } else {
    score += 12;
  }

  return score;
}