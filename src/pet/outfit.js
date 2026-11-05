// Charlie's outfit: one item on the head and one around the neck. Pure logic, no RN imports.

// Which slot each reward goes in
export const SLOTS = {
  hat: 'head',
  glasses: 'head',
  collar: 'neck',
  goldCollar: 'neck',
  bandana: 'neck',
  bow: 'neck',
  medal: 'neck',
};

/**
 * { head, neck } for a pet. Older saves kept a single `accessory`; it moves into its slot.
 */
export function outfitOf(pet) {
  if (pet?.outfit) return { head: pet.outfit.head || null, neck: pet.outfit.neck || null };
  const legacy = pet?.accessory;
  return { head: SLOTS[legacy] === 'head' ? legacy : null, neck: SLOTS[legacy] === 'neck' ? legacy : null };
}

// Puts an item on (or takes it off if it's already on); the other slot stays as it is
export function toggleItem(outfit, id) {
  const slot = SLOTS[id];
  if (!slot) return outfit;
  return { ...outfit, [slot]: outfit[slot] === id ? null : id };
}

// A short key for a stage + outfit; the widget pictures are saved under it
export const lookKey = (stageKey, outfit = {}) => `${stageKey}-${outfit.head || '0'}-${outfit.neck || '0'}`;
