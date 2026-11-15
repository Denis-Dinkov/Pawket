// Amount fields, money formatting and the budget split.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setLang } = require('../src/i18n');
const { parseAmount, cleanAmountInput, amountText, plural, dayOrdinal } = require('../src/format');
const { money, moneyShort, limitMoney, pct, splitMoney } = require('../src/theme');
const { setSplits, splitFor, splitLabel, validPercents, DEFAULT_SPLIT } = require('../src/split');
const { chartScale } = require('../src/budget');

test('amount text → number', () => {
  setLang('bg');
  assert.equal(parseAmount('1 240,5'), 1240.5);
  assert.equal(parseAmount('12.30'), 12.3);
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount(undefined), 0);
  assert.equal(parseAmount('abc'), 0);
});

test('typing an amount: one separator, two decimals', () => {
  setLang('bg');
  assert.equal(cleanAmountInput('12,345'), '12,34');
  assert.equal(cleanAmountInput('1.2.3'), '1,23');
  assert.equal(cleanAmountInput('a1b2'), '12');
  assert.equal(amountText(12.5), '12,5');
  assert.equal(amountText(0), '');
  setLang('en');
  assert.equal(cleanAmountInput('12,345'), '12.34');
  setLang('bg');
});

test('money in Bulgarian and English', () => {
  setLang('bg');
  assert.equal(money(1240.5), '1240,50 €');
  assert.equal(money(12400), '12 400 €');
  assert.equal(money(-3), '−3 €');
  assert.equal(moneyShort(1240.5), '1241 €');
  assert.equal(limitMoney(13.776), '13,78 €');
  assert.equal(limitMoney(124.4), '124 €');
  assert.deepEqual(splitMoney(2200), { sign: '', int: '2200', dec: '' });
  setLang('en');
  assert.equal(money(1240.5), '€1,240.50');
  assert.equal(money(-3), '−€3');
  setLang('bg');
  assert.equal(pct(0.126), '13%');
});

test('plurals and ordinals', () => {
  setLang('bg');
  assert.equal(plural(1, 'ден', 'дни'), '1 ден');
  assert.equal(plural(4, 'ден', 'дни'), '4 дни');
  assert.deepEqual([1, 2, 7, 11, 21, 30].map(dayOrdinal), ['1-во', '2-ро', '7-мо', '11-то', '21-во', '30-то']);
  setLang('en');
  assert.deepEqual([1, 2, 3, 11, 22].map(dayOrdinal), ['1st', '2nd', '3rd', '11th', '22nd']);
  setLang('bg');
});

test('the split applies from the month it was set on', () => {
  setSplits({ '2026-09': { needs: 0.6, wants: 0.2, savings: 0.2 } });
  assert.equal(splitFor(2026, 7), DEFAULT_SPLIT);
  assert.equal(splitLabel(splitFor(2026, 10)), '60/20/20');
  setSplits({});
  assert.equal(splitLabel(splitFor(2026, 10)), '50/30/20');
  assert.equal(validPercents({ needs: 60, wants: 20, savings: 20 }), true);
  assert.equal(validPercents({ needs: 60, wants: 30, savings: 20 }), false);
});

test('one outlier day does not flatten the chart', () => {
  assert.equal(chartScale([750, 40, 20, 0]), 40 * 1.35);
  assert.equal(chartScale([60, 40, 20]), 60);
  assert.equal(chartScale([0, 0]), 1);
});
