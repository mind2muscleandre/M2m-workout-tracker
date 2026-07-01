#!/usr/bin/env node
/**
 * Runs movement assessment scoring unit tests (compiles scoring.ts with tsc).
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), 'm2m-scoring-test-'));

function approx(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 0.01, `${message}: expected ${expected}, got ${actual}`);
}

try {
  execSync(
    `npx tsc src/lib/movementAssessment/scoring.ts src/types/movementAssessment.ts --outDir "${outDir}" --module commonjs --esModuleInterop --target ES2020 --skipLibCheck`,
    { cwd: root, stdio: 'pipe' }
  );

  const require = createRequire(import.meta.url);
  const {
    MOBILITY_TESTS,
    scoreForValue,
    scoreForValueLowerBetter,
    scoreMobilityBilateral,
    scoreMobilityTestValue,
    scoreStickTest,
    scoreLungeTest,
    scoreStabilitySection,
  } = require(join(outDir, 'lib/movementAssessment/scoring.js'));
  const { createEmptyStickTest, createEmptyLungeTest } = require(
    join(outDir, 'types/movementAssessment.js')
  );

  const slr = MOBILITY_TESTS.find((t) => t.key === 'slr');
  const shoulder = MOBILITY_TESTS.find((t) => t.key === 'shoulder_pos');
  const longHf = MOBILITY_TESTS.find((t) => t.key === 'long_hf');

  approx(scoreForValue(80, 80, 90), 90, 'SLR 80°');
  approx(scoreForValue(85, 80, 90), 95, 'SLR 85°');
  approx(scoreForValue(90, 80, 90), 100, 'SLR 90°');
  approx(scoreMobilityTestValue(slr, 85), 95, 'SLR via mobility test');

  approx(scoreForValueLowerBetter(4, 4, 6), 100, 'Shoulder 4 cm');
  approx(scoreForValueLowerBetter(5, 4, 6), 95, 'Shoulder 5 cm');
  approx(scoreForValueLowerBetter(6, 4, 6), 90, 'Shoulder 6 cm');
  approx(scoreForValueLowerBetter(8, 4, 6), 67.5, 'Shoulder 8 cm');
  approx(scoreMobilityTestValue(shoulder, 4), 100, 'Shoulder via mobility test');

  approx(scoreForValueLowerBetter(0, 0, 15), 100, 'Long HF 0°');
  approx(scoreForValueLowerBetter(5, 0, 15), 96.67, 'Long HF 5°');
  approx(scoreForValueLowerBetter(15, 0, 15), 90, 'Long HF 15°');
  approx(scoreForValueLowerBetter(30, 0, 15), 45, 'Long HF 30°');
  approx(scoreMobilityTestValue(longHf, 0), 100, 'Long HF via mobility test');

  approx(scoreMobilityBilateral(slr, 80, 90), 95, 'SLR bilateral');
  approx(scoreMobilityBilateral(shoulder, 4, 6), 95, 'Shoulder bilateral');
  approx(scoreMobilityBilateral(longHf, 0, 15), 95, 'Long HF bilateral');
  assert.equal(scoreMobilityBilateral(slr, null, null), null, 'Bilateral null');

  const emptyStick = createEmptyStickTest();
  const emptyLunge = createEmptyLungeTest();
  assert.equal(scoreStickTest(emptyStick), null, 'Stick all unreviewed → null');
  assert.equal(scoreLungeTest(emptyLunge), null, 'Lunge all unreviewed → null');
  assert.equal(
    scoreStabilitySection({ stickTest: emptyStick, lungeTest: emptyLunge }),
    null,
    'Stability section all unreviewed → null'
  );

  const stickOk = { ...emptyStick, transversalLeft: false, frontalLeft: false };
  approx(scoreStickTest(stickOk), 100, 'Stick all OK');

  const stickOneIssue = { ...emptyStick, transversalLeft: true, frontalLeft: false };
  approx(scoreStickTest(stickOneIssue), 55, 'Stick 1/2 issues');

  const legacyAllFalse = {
    stickTest: {
      transversalLeft: false,
      transversalRight: false,
      frontalLeft: false,
      frontalRight: false,
      sagital: false,
      shouldersLeft: false,
      shouldersRight: false,
      pelvicHip: false,
      notes: '',
    },
    lungeTest: {
      footLeft: false,
      footRight: false,
      kneeLeft: false,
      kneeRight: false,
      hipLeft: false,
      hipRight: false,
      upperBodyLeft: false,
      upperBodyRight: false,
      postureLeft: false,
      postureRight: false,
      notes: '',
    },
  };
  assert.equal(
    scoreStabilitySection(legacyAllFalse),
    null,
    'Legacy all-false treated as unreviewed'
  );

  const v2AllOk = {
    stabilityFormatVersion: 2,
    stickTest: { ...emptyStick, transversalLeft: false },
    lungeTest: { ...emptyLunge, kneeLeft: false, kneeRight: false },
  };
  approx(scoreStabilitySection(v2AllOk), 100, 'v2 partial reviewed all OK');

  console.log('scoring tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
