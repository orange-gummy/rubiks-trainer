import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CubeState, parseAlg, invertAlg, algToString } from '../js/cube-model.js';
import { generateScramble } from '../js/scramble.js';
import { GUIDE_STEPS } from '../js/guide.js';

const solvedAfter = (alg) => new CubeState().apply(alg).isSolved();
const repeat = (alg, n) => Array(n).fill(alg).join(' ');

test('parseAlg handles notation variants', () => {
  assert.equal(algToString(parseAlg("R U2 R' Rw2' (x y') U3 R4 F’")), "R U2 R' r2 x y' U' F'");
  assert.throws(() => parseAlg('R Q U'));
});

test('known move identities', () => {
  for (const m of ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S', 'r', 'x', 'y', 'z']) {
    assert.ok(solvedAfter(repeat(m, 4)), `${m}x4`);
    assert.ok(!solvedAfter(m) || 'xyz'.includes(m), `${m} alone scrambles`);
  }
  assert.ok(solvedAfter(repeat("R U R' U'", 6)), 'sexy move x6');
  assert.ok(solvedAfter(repeat("R U R' U R U2 R'", 6)), 'sune x6');
  assert.ok(solvedAfter(repeat("R U' R U R U R U' R' U' R2", 3)), 'Ua perm x3');
  assert.ok(solvedAfter(repeat("R2 U2", 6)), "(R2 U2) x6");
  assert.ok(!solvedAfter(repeat("R2 U2", 3)));
});

test('wide and slice moves are consistent with face moves + rotations', () => {
  const a = new CubeState().apply("r U").faceGrid('F');
  const b = new CubeState().apply("L x U").faceGrid('F');
  assert.deepEqual(a, b);
  const c = new CubeState().apply("M").faceGrid('U');
  const d = new CubeState().apply("L' R x'").faceGrid('U');
  assert.deepEqual(c, d);
});

test('R moves front stickers to up face', () => {
  const s = new CubeState().apply('R');
  assert.deepEqual(s.faceGrid('U').map((r) => r[2]), ['F', 'F', 'F']);
  assert.deepEqual(s.faceGrid('F').map((r) => r[2]), ['D', 'D', 'D']);
  const u = new CubeState().apply('U');
  assert.deepEqual(u.faceGrid('F')[0], ['R', 'R', 'R']);
});

test('scramble followed by inverse is solved', () => {
  for (let i = 0; i < 50; i++) {
    const s = generateScramble();
    assert.equal(s.split(' ').length, 20);
    assert.ok(!/(\w)\S* \1/.test(s), 'no repeated face');
    assert.ok(solvedAfter(`${s} ${invertAlg(s)}`));
  }
});

test('guide setups are solved by their algorithms', () => {
  for (const step of GUIDE_STEPS) {
    for (const a of step.algs) {
      const st = new CubeState().apply(`${a.setup} ${invertAlg(a.alg)}`);
      assert.ok(!st.isSolved(), `${a.name} setup is scrambled`);
      st.apply(a.alg);
      assert.ok(st.isSolved(), a.name);
    }
  }
});
