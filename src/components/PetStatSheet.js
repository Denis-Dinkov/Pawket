import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import Sheet from './ui/Sheet';
import Bar from './Bar';
import Pill from './ui/Pill';
import Pet from '../pet/Pet';
import { colors, radius, money, pct } from '../theme';
import { budgetScoreParts } from '../budget';
import { STAGES, EXPRESSIONS, HUNGRY_AT, DAILY_XP, monthEndBonus } from '../pet/logic';

const SCALE = [
  { from: 85, key: 'ecstatic' },
  { from: 65, key: 'happy' },
  { from: 45, key: 'worried' },
  { from: 25, key: 'sad' },
  { from: 0, key: 'crying' },
];

const hoursText = (h) => (h >= 48 ? `${Math.round(h / 24)} дни` : `${Math.max(1, Math.round(h))} ч`);

function Row({ ok, title, detail, badge }) {
  return (
    <View style={s.row}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={22} color={ok ? colors.savings : colors.wants} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {!!detail && <Text style={s.rowDetail}>{detail}</Text>}
      </View>
      {!!badge && <Text style={[s.badge, { color: ok ? colors.savings : colors.danger }]}>{badge}</Text>}
    </View>
  );
}

function Tip({ icon, text }) {
  return (
    <View style={s.tip}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={s.tipText}>{text}</Text>
    </View>
  );
}

function Mood({ status, advice }) {
  const ov = status.overview;
  if (status.score == null) {
    return (
      <Text style={s.text}>
        Спя, защото не знам колко е месечният ти доход. Задай го от настройките (⚙︎) и ще започна да следя 50/30/20.
      </Text>
    );
  }
  const { parts, overIncome } = budgetScoreParts({ income: ov.income, byBucket: ov.byBucket, dayFrac: ov.progress.dayFrac });
  const p = Object.fromEntries(parts.map((x) => [x.key, x]));
  const minus = (x) => (x.penalty >= 0.5 ? `−${Math.round(x.penalty)}` : '✓');
  const hungry = status.fullness < HUNGRY_AT;
  const wantsLeft = 0.3 * ov.income - ov.byBucket.wants;

  return (
    <>
      <Text style={s.text}>
        Настроението ми е оценката ти по 50/30/20 за текущия месец (0–100). Започвам от 100 и губя точки за всяко отклонение.
      </Text>

      <View style={s.scale}>
        {SCALE.map((x) => {
          const active = status.expression !== 'hungry' && status.expression === x.key;
          return (
            <View key={x.key} style={[s.scaleItem, active && { backgroundColor: EXPRESSIONS[x.key].color }]}>
              <Text style={[s.scaleLabel, active && { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {x.key === 'ecstatic' ? 'Възторг' : EXPRESSIONS[x.key].label}
              </Text>
              <Text style={[s.scaleFrom, active && { color: '#fff' }]}>{x.from}+</Text>
            </View>
          );
        })}
      </View>

      <Text style={s.h2}>От какво зависи</Text>
      <View style={s.card}>
        <Row
          ok={p.needs.penalty < 0.5}
          title="Нужди до 50% от дохода"
          detail={`Сега: ${pct(p.needs.value)} (${money(ov.byBucket.needs)})`}
          badge={minus(p.needs)}
        />
        <Row
          ok={p.wantsPace.penalty < 0.5}
          title="Желанията според изминалите дни"
          detail={`Похарчени ${pct(p.wantsPace.value)} от бюджета им, а месецът е изминал ${pct(ov.progress.dayFrac)}`}
          badge={minus(p.wantsPace)}
        />
        <Row
          ok={p.wantsCap.penalty < 0.5}
          title="Желания до 30% от дохода"
          detail={`Сега: ${pct(p.wantsCap.value)} (${money(ov.byBucket.wants)})`}
          badge={minus(p.wantsCap)}
        />
        <Row
          ok={p.savings.penalty < 0.5}
          title="Поне 20% за спестяване"
          detail={`Могат да останат до ${pct(p.savings.value)} от дохода`}
          badge={minus(p.savings)}
        />
        <Row ok={!hungry} title="Сит съм" detail={hungry ? 'Гладен съм — това ми взима 20 точки' : 'Не съм гладен'} badge={hungry ? '−20' : '✓'} />
        {overIncome && <Row ok={false} title="Разходи над дохода" detail="Докато е така, настроението е най-много 15" badge="≤15" />}
      </View>

      <Text style={s.h2}>Как да ме зарадваш</Text>
      <View style={s.card}>
        {advice
          .filter((a) => a.tone !== 'praise')
          .slice(0, 3)
          .map((a) => (
            // Without the emoji at the end of the title
            <Tip key={a.id} icon={a.icon} text={a.title.replace(/[\s\uD800-\uDFFF☀-➿️]+$/, '')} />
          ))}
        {ov.progress.isCurrent && wantsLeft > 0 && (
          <Tip icon="sparkles" text={`За желания остават ${money(wantsLeft)} — около ${money(wantsLeft / Math.max(1, ov.progress.daysLeft))} на ден.`} />
        )}
        <Tip icon="wallet" text="Задели 20% за спестяване още в деня на заплатата." />
        <Tip icon="restaurant" text="Записвай всеки ден, за да не огладнявам." />
      </View>
    </>
  );
}

function Fullness({ status, pet, canFeed, onFeed, now }) {
  const fedHoursAgo = pet.lastFedAt ? (now - new Date(pet.lastFedAt)) / 3600000 : 0;
  // Fullness drops by 100/72 per hour; below 30 I'm hungry
  const hoursToHungry = ((status.fullness - HUNGRY_AT) * 72) / 100;
  return (
    <>
      <Text style={s.text}>
        Ситостта пада от 100% до 0% за 3 дни. Под {HUNGRY_AT}% огладнявам и настроението ми пада с 20 точки.
      </Text>
      <View style={s.card}>
        <Row ok title="Последно хранене" detail={fedHoursAgo < 1 ? 'току-що' : `преди ${hoursText(fedHoursAgo)}`} />
        <Row
          ok={hoursToHungry > 0}
          title={hoursToHungry > 0 ? 'Ще огладнея' : 'Гладен съм'}
          detail={hoursToHungry > 0 ? `след около ${hoursText(hoursToHungry)}` : `от около ${hoursText(-hoursToHungry)}`}
        />
      </View>
      <Text style={s.h2}>Как да ме нахраниш</Text>
      <View style={s.card}>
        <Tip icon="add-circle" text="Запиши разход или доход — всеки запис ме храни." />
        <Tip icon="restaurant" text="Ако днес наистина няма разходи, натисни „Днес без разходи“." />
        <Tip icon="sparkles" text={`Всеки ден със запис ми дава +${DAILY_XP} XP за растеж.`} />
      </View>
      {canFeed && (
        <Pill icon="restaurant" label="Днес без разходи — нахрани ме" variant="ink" onPress={onFeed} haptic="success" style={s.action} />
      )}
    </>
  );
}

function Growth({ status }) {
  const bonus = monthEndBonus(status.score);
  return (
    <>
      <View style={s.card}>
        <Text style={s.rowTitle}>
          {status.xp} XP{status.next ? ` · още ${status.next.xp - status.xp} до „${status.next.name}“` : ' · най-високият етап!'}
        </Text>
        <View style={{ marginTop: 10 }}>
          <Bar value={status.progress} color={colors.primary} height={8} />
        </View>
      </View>

      <Text style={s.h2}>Етапи</Text>
      <View style={s.card}>
        {STAGES.map((st, i) => {
          const reached = status.xp >= st.xp;
          const current = i === status.index;
          return (
            <View key={st.key} style={[s.stage, i > 0 && s.sep]}>
              <Pet expression={reached ? 'happy' : 'sleeping'} stage={st.key} size={48} animate={false} style={!reached && { opacity: 0.45 }} />
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, current && { color: colors.primary }]}>
                  {st.name}
                  {current ? ' · сега' : ''}
                </Text>
                <Text style={s.rowDetail}>
                  {st.xp} XP{st.key === 'adult' ? ' · нашийник със звънче' : st.key === 'champion' ? ' · корона' : ''}
                </Text>
              </View>
              {reached && <Ionicons name="checkmark-circle" size={22} color={colors.savings} />}
            </View>
          );
        })}
      </View>

      <Text style={s.h2}>Как да порасна</Text>
      <View style={s.card}>
        <Tip icon="calendar" text={`+${DAILY_XP} XP за всеки ден със запис (или „Днес без разходи“).`} />
        <Tip icon="trophy" text="Бонус в края на месеца: 85+ → +150 XP, 65+ → +80 XP, 45+ → +30 XP." />
        {status.score != null && (
          <Tip
            icon="trending-up"
            text={
              bonus
                ? `Сега си на ${status.score}/100 — ако задържиш, в края на месеца получавам +${bonus} XP.`
                : `Сега си на ${status.score}/100 — над 45 точки ми носят месечен бонус.`
            }
          />
        )}
        <Tip icon="heart" text="Не се тревожи — никога не умирам, само тъжа и гладувам." />
      </View>
    </>
  );
}

const TITLES = { mood: 'Настроение', fullness: 'Ситост', growth: 'Растеж' };

// What the dog's stats mean and how to raise them
export default function PetStatSheet({ stat, onClose, status, pet, advice, canFeed, onFeed, now }) {
  const value =
    stat === 'mood'
      ? status.score == null
        ? 'спи'
        : `${status.mood}%`
      : stat === 'fullness'
        ? `${status.fullness}%`
        : status.stage.name;
  return (
    <Sheet visible={!!stat} onClose={onClose}>
      {stat && (
        <View>
          <View style={s.head}>
            <Pet expression={status.expression} stage={status.stage.key} size={110} />
            <Text style={s.title}>
              {TITLES[stat]} · {value}
            </Text>
          </View>
          {stat === 'mood' && <Mood status={status} advice={advice} />}
          {stat === 'fullness' && <Fullness status={status} pet={pet} canFeed={canFeed} onFeed={onFeed} now={now} />}
          {stat === 'growth' && <Growth status={status} />}
        </View>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  head: { alignItems: 'center', marginBottom: 8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 6 },
  h2: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowTitle: { color: colors.text, fontSize: 14.5, fontWeight: '700' },
  rowDetail: { color: colors.muted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  badge: { fontSize: 14, fontWeight: '800' },
  tip: { flexDirection: 'row', gap: 10, paddingVertical: 6, alignItems: 'flex-start' },
  tipText: { flex: 1, color: colors.text, fontSize: 13.5, lineHeight: 19 },
  scale: { flexDirection: 'row', gap: 4, marginTop: 10 },
  scaleItem: { flex: 1, backgroundColor: colors.card, borderRadius: radius.badge, paddingVertical: 8, alignItems: 'center' },
  scaleLabel: { color: colors.text, fontSize: 10, fontWeight: '700' },
  scaleFrom: { color: colors.muted, fontSize: 10, marginTop: 2 },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  action: { alignSelf: 'stretch', justifyContent: 'center', marginTop: 16, paddingVertical: 14 },
});
