import assert from 'node:assert/strict';
import {
  MOBILITY_TESTS,
  scoreForValue,
  scoreForValueLowerBetter,
  scoreMobilityBilateral,
  scoreMobilityTestValue,
} from './scoring';

function approx(actual: number, expected: number, message: string) {
  assert.ok(Math.abs(actual - expected) < 0.01, `${message}: expected ${expected}, got ${actual}`);
}

const slr = MOBILITY_TESTS.find((t) => t.key === 'slr')!;
const shoulder = MOBILITY_TESTS.find((t) => t.key === 'shoulder_pos')!;
const longHf = MOBILITY_TESTS.find((t) => t.key === 'long_hf')!;

// SLR: higher is better, 80–90°
approx(scoreForValue(80, 80, 90), 90, 'SLR 80°');
approx(scoreForValue(85, 80, 90), 95, 'SLR 85°');
approx(scoreForValue(90, 80, 90), 100, 'SLR 90°');
approx(scoreMobilityTestValue(slr, 85), 95, 'SLR via mobility test');

// Axelled: lower is better, 4 cm = 100p, 6 cm = 90p
approx(scoreForValueLowerBetter(4, 4, 6), 100, 'Shoulder 4 cm');
approx(scoreForValueLowerBetter(5, 4, 6), 95, 'Shoulder 5 cm');
approx(scoreForValueLowerBetter(6, 4, 6), 90, 'Shoulder 6 cm');
approx(scoreForValueLowerBetter(8, 4, 6), 67.5, 'Shoulder 8 cm');
approx(scoreMobilityTestValue(shoulder, 4), 100, 'Shoulder via mobility test');

// Långa höftböjare: lower is better, 0° = 100p, 15° = 90p
approx(scoreForValueLowerBetter(0, 0, 15), 100, 'Long HF 0°');
approx(scoreForValueLowerBetter(5, 0, 15), 96.67, 'Long HF 5°');
approx(scoreForValueLowerBetter(15, 0, 15), 90, 'Long HF 15°');
approx(scoreForValueLowerBetter(30, 0, 15), 45, 'Long HF 30°');
approx(scoreMobilityTestValue(longHf, 0), 100, 'Long HF via mobility test');

// Bilateral average
const slrBilateral = scoreMobilityBilateral(slr, 80, 90);
const shoulderBilateral = scoreMobilityBilateral(shoulder, 4, 6);
const longHfBilateral = scoreMobilityBilateral(longHf, 0, 15);
assert.notEqual(slrBilateral, null);
assert.notEqual(shoulderBilateral, null);
assert.notEqual(longHfBilateral, null);
approx(slrBilateral!, 95, 'SLR bilateral');
approx(shoulderBilateral!, 95, 'Shoulder bilateral');
approx(longHfBilateral!, 95, 'Long HF bilateral');
assert.equal(scoreMobilityBilateral(slr, null, null), null, 'Bilateral null');

console.log('scoring.test.ts: all assertions passed');
