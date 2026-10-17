// Deep link for quick entry: pawket://add?source=applepay&amount=12,50&merchant=Lidl
// No RN imports — tested directly.

/**
 * Amount from Apple Pay / Shortcuts in any format: "€12.50", "12,50 €", "1 234,56", "1,234.56".
 * Payments have at most 2 decimal places — 3 digits after a separator mean thousands.
 */
export function parseAmount(raw) {
  if (raw == null) return NaN;
  // Digits and separators only; "лв." and similar leave a trailing dot, which we strip
  let s = String(raw).replace(/[^0-9.,]/g, '').replace(/^[.,]+|[.,]+$/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // Both separators: the last one is the decimal separator
    const dec = lastComma > lastDot ? ',' : '.';
    const thousands = dec === ',' ? '.' : ',';
    s = s.split(thousands).join('').replace(dec, '.');
  } else {
    const sep = lastComma !== -1 ? ',' : lastDot !== -1 ? '.' : null;
    if (sep) {
      const parts = s.split(sep);
      const tail = parts[parts.length - 1];
      const isThousands = parts.length > 2 || tail.length === 3;
      s = isThousands ? parts.join('') : `${parts.slice(0, -1).join('')}.${tail}`;
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(Math.abs(n) * 100) / 100 : NaN;
}

const decode = (v) => {
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '));
  } catch {
    return v;
  }
};

/**
 * Returns the prefill for "New expense", or null if the link isn't an add link.
 * Also works with Expo Go URLs (exp://host/--/add?...).
 */
export function parseAddUrl(url) {
  if (!url) return null;
  const [base, query = ''] = String(url).split('?');
  const path = base.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^.*\/--\//, '').replace(/\/+$/, '');
  if (!/(^|\/)add$/.test(path)) return null;

  const params = {};
  for (const pair of query.split('#')[0].split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    params[decode(k)] = decode(v);
  }
  const amount = parseAmount(params.amount);
  const merchant = (params.merchant || '').trim();
  return {
    amount: amount > 0 ? amount : undefined,
    merchant: merchant || undefined,
    source: ['applepay', 'widget'].includes(params.source) ? params.source : amount > 0 ? 'applepay' : 'manual',
  };
}

// In Shortcuts, [Сума] and [Търговец] are replaced with the transaction variables
export const APPLE_PAY_TEMPLATE = 'pawket://add?source=applepay&amount=[Сума]&merchant=[Търговец]';
