// What Charlie says in his speech bubble: one short line with character.
// The numbers live on the money card, so the bubble reacts to them instead of repeating them. No RN imports.
import { HUNGRY_AT } from './logic';

const pick = (list, seed) => list[seed % list.length];

/**
 * status: petStatus(); daily: dailyLimit() or null; advice: getAdvice(); activeToday: something recorded today
 * Returns { text, tone: 'warn' | 'tip' | 'praise' }.
 */
export function petLine({ status, daily, advice = [], activeToday, goal, now = new Date() }) {
  // Changes once a day, so the line doesn't flicker but isn't always the same either
  const seed = now.getDate();
  const evening = now.getHours() >= 19;
  const warn = advice.find((a) => a.tone === 'warn');

  if (status.score == null) return { text: 'Спя… Кажи ми колко е месечният ти доход и се събуждам 💤', tone: 'tip' };
  if (status.fullness < HUNGRY_AT) return { text: 'Гладен съм! Похарчи ли нещо днес? Запиши го и ме нахрани 🦴', tone: 'warn' };
  if (warn?.id === 'over-income') return { text: 'Харчиш повече, отколкото печелиш 😢 До края на месеца — само най-нужното.', tone: 'warn' };
  if (daily?.over) {
    return {
      text: pick(['Днес малко прекалихме. Утре ще сме по-внимателни? 🙏', 'Ауу, скъп ден! Утре ден без желания? 🐾'], seed),
      tone: 'warn',
    };
  }
  if (evening && !activeToday) return { text: 'Вечерта дойде 🌙 Запиши днешните разходи или ми кажи, че е бил ден без харчене.', tone: 'tip' };
  if (warn) return { text: `${warn.title}`, tone: 'warn' };
  if (activeToday && daily && daily.left > 0) {
    return {
      text: pick(['Записа всичко — браво! Опашката ми не спира 🐶', 'Днес вървим по план. Гордея се с теб! 🐾'], seed),
      tone: 'praise',
    };
  }
  if (goal && !goal.done) return { text: `Мисля си за „${goal.name}“ ✨ Всяко евро ни доближава.`, tone: 'tip' };
  if (status.score >= 85) return { text: pick(['Спазваш 50/30/20 отлично! Ще порасна голям 🤩', 'Най-добрият стопанин! 🏆'], seed), tone: 'praise' };
  return { text: pick(['Добър ден за малко спестяване 🐾', 'Ще ме погалиш ли? 🐶', 'Да видим какво ще запишем днес 📝'], seed), tone: 'tip' };
}
