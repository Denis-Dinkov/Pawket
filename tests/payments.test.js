// Payments that come in by themselves: amounts and shops read from Shortcuts files and notifications,
// and the rules that keep one payment from being booked twice.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseAmount } = require('../src/deeplink');
const { walletPayment, bankPayment, groupReports } = require('../src/notificationPayments');
const { toPayment, matchManual } = require('../src/pendingPayments');
const { sameMerchant, rememberedCategory } = require('../src/categoryGuess');

test('amounts in any format; three digits after a separator are thousands', () => {
  assert.equal(parseAmount('€12.50'), 12.5);
  assert.equal(parseAmount('12,50 €'), 12.5);
  assert.equal(parseAmount('12,50 лв.'), 12.5);
  assert.equal(parseAmount('1 234,56'), 1234.56);
  assert.equal(parseAmount('1,234.56'), 1234.56);
  assert.equal(parseAmount('1.234'), 1234);
  assert.ok(Number.isNaN(parseAmount('')));
});

test("the bank's notification: the amount spent, never the balance after it", () => {
  assert.deepEqual(bankPayment({ title: 'BILLA', text: '🛒 You spent €4.86 · EUR balance: €142.43' }), { amount: 4.86, merchant: 'BILLA' });
  assert.deepEqual(bankPayment({ title: 'Revolut', text: 'You paid €12 at OMV' }), { amount: 12, merchant: 'OMV' });
  // Money that didn't leave
  assert.equal(bankPayment({ title: 'BILLA', text: 'Refund of €4.86 received' }), null);
});

test('the Wallet notification: the shop is the title unless it is the card or the amount', () => {
  assert.deepEqual(walletPayment({ title: 'Lidl', text: '€8.83 with Visa •••• 1234' }), { amount: 8.83, merchant: 'Lidl' });
  assert.deepEqual(walletPayment({ title: '€8.83', text: 'Магазин Мазалам' }), { amount: 8.83, merchant: 'Магазин Мазалам' });
  assert.deepEqual(walletPayment({ title: 'Google Wallet', text: 'Paid €15.00 at Starbucks' }), { amount: 15, merchant: 'Starbucks' });
});

test('the Wallet and the bank notification of one payment make one expense', () => {
  const at = (s) => new Date(2026, 10, 14, 12, 0, s).toISOString();
  const reports = [
    { amount: 4.86, merchant: 'Магазин Мазалам', source: 'wallet', date: at(0) },
    { amount: 4.86, merchant: 'M N Mazalat', source: 'bank', date: at(20) },
  ];
  const { payments } = groupReports(reports, [], sameMerchant);
  assert.equal(payments.length, 1);
  assert.deepEqual(payments[0].autoSources, ['wallet', 'bank']);
  // A late report of a payment already booked joins that expense instead of making a new one
  const existing = [{ id: 'e1', amount: 4.86, merchant: 'Магазин Мазалам', date: at(0), autoSources: ['wallet'] }];
  const late = groupReports([reports[1]], existing, sameMerchant);
  assert.equal(late.payments.length, 0);
  assert.deepEqual(late.joined, { e1: ['wallet', 'bank'] });
});

test('a Shortcuts file becomes a payment; a broken one is dropped', () => {
  assert.deepEqual(toPayment({ id: 'p1', amount: '8.83', merchant: ' Lidl ', date: '2026-11-14T10:00:00.000Z', maybeDuplicate: '' }), {
    id: 'p1', amount: 8.83, merchant: 'Lidl', date: '2026-11-14T10:00:00.000Z', maybeDuplicate: false,
  });
  assert.equal(toPayment({ id: 'p2', amount: '0' }), null);
  assert.equal(toPayment(null), null);
});

test('a payment already entered by hand is matched, not booked again', () => {
  const payment = { id: 'p1', amount: 8.83, merchant: 'LIDL SOFIA 1234', date: '2026-11-14T10:00:00.000Z' };
  const manual = (merchant) => [{ id: 'm1', amount: 8.83, merchant, source: 'manual', date: '2026-11-14T09:30:00.000Z' }];
  assert.deepEqual(matchManual(payment, manual('Lidl'), sameMerchant), { skip: 'm1' });
  // Same amount, nothing to compare: booked, but flagged
  assert.deepEqual(matchManual(payment, manual(''), sameMerchant), { flag: true });
  assert.deepEqual(matchManual(payment, [], sameMerchant), { flag: false });
});

test('the category picked for a shop is found under its other names', () => {
  const merchants = { 'lidl sofia 1234': 'groceries' };
  assert.equal(rememberedCategory(merchants, 'LIDL 5678'), 'groceries');
  assert.equal(rememberedCategory(merchants, 'Kaufland'), undefined);
  assert.equal(sameMerchant('Cafe Rio', 'Cafe Mio'), false);
});
