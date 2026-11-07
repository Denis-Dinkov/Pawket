// A first guess at the category from the merchant name, for Apple Pay payments booked automatically
// from a shop the user hasn't categorized yet. Wallet hands over names in Latin or Cyrillic, often in
// capitals and with a city or a branch number ("LIDL BULGARIA EOOD SOFIA", "Магазин Мазалам").
// The user's own choice for a merchant (store.merchants) always wins over this list.
// No RN imports — tested directly.

// [category id, words]. A word matches at the start of any word in the name, so "kaufland" also
// matches "KAUFLAND BG 1234". The first rule that matches wins, so the specific ones come first.
const RULES = [
  ['subscriptions', ['netflix', 'spotify', 'youtube premium', 'disney', 'hbo', 'max.com', 'apple.com', 'icloud', 'google one', 'chatgpt', 'openai', 'anthropic', 'claude.ai', 'patreon', 'dropbox', 'adobe', 'microsoft', 'xbox', 'playstation', 'psn', 'nintendo', 'duolingo', 'audible', 'kindle']],
  ['transport', ['omv', 'shell', 'lukoil', 'лукойл', 'petrol', 'петрол', 'eko', 'еко', 'rompetrol', 'gazprom', 'газпром', 'uber', 'bolt', 'yellow', 'taxi', 'такси', 'metro', 'метро', 'urban mobility', 'център за градска мобилност', 'бдж', 'bdz', 'parking', 'паркинг', 'vignette', 'винетка', 'bgtoll', 'автогара', 'avtogara', 'union ivkoni', 'юнион ивкони', 'flixbus', 'lime', 'hop on']],
  ['travel', ['booking', 'airbnb', 'ryanair', 'wizz', 'lufthansa', 'bulgaria air', 'airport', 'летище', 'hotel', 'хотел', 'hostel', 'expedia', 'trivago', 'kiwi.com']],
  ['health', ['аптека', 'аптеки', 'apteka', 'apteki', 'pharm', 'фарм', 'sopharmacy', 'софарма', 'subra', 'субра', 'remedium', 'ремедиум', 'marvi', 'марви', 'лаборатория', 'laboratory', 'cibalab', 'цибалаб', 'дентал', 'dental', 'clinic', 'клиника', 'болница', 'hospital', 'медицин', 'medical', 'dm drogerie', 'lilly', 'лили']],
  ['bills', ['a1', 'vivacom', 'виваком', 'yettel', 'йетел', 'telenor', 'електрохолд', 'electrohold', 'evn', 'евн', 'energo-pro', 'енерго-про', 'софийска вода', 'sofiyska voda', 'вик', 'топлофикация', 'toplofikacia', 'bulsatcom', 'булсатком', 'neterra', 'insurance', 'застраховка', 'застрах']],
  ['groceries', ['lidl', 'лидл', 'kaufland', 'кауфланд', 'billa', 'била', 'fantastico', 'фантастико', 't market', 't-market', 'т маркет', 'metro cash', 'cba', 'кба', 'lafka', 'лафка', 'avanti', 'аванти', 'супермаркет', 'supermarket', 'хранителни', 'магазин', 'minimarket', 'минимаркет', 'market', 'маркет', 'пекарна', 'bakery', 'хлебарница', 'месарница', 'плод', 'зеленчук', 'zhito', 'жито', 'familia', 'фамилия', 'вилтон', 'boni', 'бони', 'my market', 'oasis', 'glovo market']],
  ['dining', ['starbucks', 'costa coffee', 'mcdonald', 'макдоналдс', 'kfc', 'burger king', 'subway', 'domino', 'happy', 'хепи', 'raffy', 'раффи', 'wolt', 'glovo', 'takeaway', 'foodpanda', 'foody', 'кафе', 'cafe', 'caffe', 'coffee', 'кофи', 'ресторант', 'restaurant', 'бистро', 'bistro', 'пицария', 'pizza', 'пица', 'бар ', 'bar ', 'pub', 'паб', 'механа', 'кръчма', 'grill', 'грил', 'дюнер', 'doner', 'sushi', 'суши', 'бургер', 'burger', 'закуска', 'баничарница', 'sweet', 'сладкарница', 'gelato']],
  ['fun', ['cinema', 'кино', 'cinema city', 'arena', 'арена', 'theatre', 'театър', 'eventim', 'епаи', 'epay tickets', 'ticketstation', 'bileti', 'билети', 'concert', 'концерт', 'bowling', 'боулинг', 'escape', 'museum', 'музей', 'steam', 'epic games', 'gym', 'фитнес', 'fitness', 'pulse', 'pool', 'басейн', 'ski', 'ски']],
  ['shopping', ['emag', 'еmag', 'amazon', 'aliexpress', 'temu', 'shein', 'trendyol', 'zara', 'h&m', 'hm ', 'c&a', 'lc waikiki', 'reserved', 'pepco', 'jysk', 'ikea', 'икеа', 'praktiker', 'практикер', 'mr. bricolage', 'bricolage', 'technopolis', 'технополис', 'technomarket', 'техномаркет', 'zora', 'зора', 'ozone', 'озон', 'helikon', 'хеликон', 'sport depot', 'decathlon', 'douglas', 'notino', 'apple store', 'mall', 'мол', 'книжарница', 'flowers', 'цветя']],
];

// Lower case, without punctuation that glues words together ("LIDL*SOFIA" → "lidl sofia")
const clean = (s) =>
  ` ${String(s || '')
    .toLowerCase()
    .replace(/[*_/\\|,;:()"'„“”]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

/** The category id guessed for a merchant name, or null when nothing fits. */
export function guessCategory(merchant) {
  const name = clean(merchant);
  if (name.trim().length < 2) return null;
  for (const [id, words] of RULES) {
    // A word starts after a space (the name is padded with spaces) — "eko" doesn't match "geko"
    if (words.some((w) => name.includes(` ${w}`))) return id;
  }
  return null;
}
