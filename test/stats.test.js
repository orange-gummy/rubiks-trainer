import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageOf, formatTime, best, bestAverageOf, mean } from '../js/stats.js';

const s = (time, penalty = null) => ({ time, penalty });

test('formatTime', () => {
  assert.equal(formatTime(12345), '12.34');
  assert.equal(formatTime(83456), '1:23.45');
  assert.equal(formatTime(Infinity), 'DNF');
});

test('ao5 drops best and worst', () => {
  const list = [s(10000), s(12000), s(11000), s(20000), s(9000)];
  assert.equal(averageOf(list, 5), 11000);
  assert.equal(averageOf(list.slice(0, 4), 5), null);
});

test('one DNF counts as worst, two DNFs make DNF average', () => {
  const one = [s(10000), s(12000), s(11000), s(1, 'DNF'), s(9000)];
  assert.equal(averageOf(one, 5), 11000);
  const two = [s(10000), s(12000, 'DNF'), s(11000), s(1, 'DNF'), s(9000)];
  assert.equal(averageOf(two, 5), Infinity);
});

test('+2 penalty, best, mean, best ao5', () => {
  const list = [s(10000, '+2'), s(11000), s(13000), s(14000), s(15000), s(5000)];
  assert.equal(best(list), 5000);
  assert.equal(mean([s(10000), s(1, 'DNF'), s(12000)]), 11000);
  assert.equal(bestAverageOf(list, 5), 12666.666666666666);
});
