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
import { STAGES, STAGE_PERKS, EXPRESSIONS, HUNGRY_AT, DAILY_XP, monthEndBonus } from '../pet/logic';
import { themed } from '../themed';
import { t } from '../i18n';

const SCALE = [
  { from: 85, key: 'ecstatic' },
  { from: 65, key: 'happy' },
  { from: 45, key: 'worried' },
  { from: 25, key: 'sad' },
  { from: 0, key: 'crying' },
];

const hoursText = (h) => (h >= 48 ? t('{0} дни', { 0: Math.round(h / 24) }) : t('{0} ч', { 0: Math.max(1, Math.round(h)) }));

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
        {t('Спя, защото не знам колко е месечният ти доход. Задай го от настройките (⚙︎) и ще започна да следя 50/30/20.')}
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
        {t('Настроението ми е оценката ти по 50/30/20 за текущия месец (0–100). Започвам от 100 и губя точки за всяко отклонение.')}
      </Text>

      <View style={s.scale}>
        {SCALE.map((x) => {
          const active = status.expression !== 'hungry' && status.expression === x.key;
          return (
            <View key={x.key} style={[s.scaleItem, active && { backgroundColor: EXPRESSIONS[x.key].color }]}>
              <Text style={[s.scaleLabel, active && { color: colors.onAccent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {x.key === 'ecstatic' ? t('Възторг') : EXPRESSIONS[x.key].label}
              </Text>
              <Text style={[s.scaleFrom, active && { color: colors.onAccent }]}>{x.from}+</Text>
            </View>
          );
        })}
      </View>

      <Text style={s.h2}>{t('От какво зависи')}</Text>
      <View style={s.card}>
        <Row
          ok={p.needs.penalty < 0.5}
          title={t('Нужди до 50% от дохода')}
          detail={t('Сега: {0} ({1})', { 0: pct(p.needs.value), 1: money(ov.byBucket.needs) })}
          badge={minus(p.needs)}
        />
        <Row
          ok={p.wantsPace.penalty < 0.5}
          title={t('Темпо на желанията')}
          detail={t('Похарчени {0} от бюджета им, а месецът е изминал {1}', { 0: pct(p.wantsPace.value), 1: pct(ov.progress.dayFrac) })}
          badge={minus(p.wantsPace)}
        />
        <Row
          ok={p.wantsCap.penalty < 0.5}
          title={t('Желания до 30% от дохода')}
          detail={t('Сега: {0} ({1})', { 0: pct(p.wantsCap.value), 1: money(ov.byBucket.wants) })}
          badge={minus(p.wantsCap)}
        />
        <Row
          ok={p.savings.penalty < 0.5}
          title={t('Поне 20% за спестяване')}
          detail={t('Ако не харчиш повече, можеш да спестиш {0} от дохода', { 0: pct(p.savings.value) })}
          badge={minus(p.savings)}
        />
        <Row ok={!hungry} title={t('Сит съм')} detail={hungry ? t('Гладен съм — това ми взима 20 точки') : t('Не съм гладен')} badge={hungry ? '−20' : '✓'} />
        {overIncome && <Row ok={false} title={t('Разходи над дохода')} detail={t('Докато е така, настроението е най-много 15')} badge="≤15" />}
      </View>

      <Text style={s.h2}>{t('Как да ме зарадваш')}</Text>
      <View style={s.card}>
        {advice
          .filter((a) => a.tone !== 'praise')
          .slice(0, 3)
          .map((a) => (
            // Without the emoji at the end of the title
            <Tip key={a.id} icon={a.icon} text={a.title.replace(/[\s\uD800-\uDFFF☀-➿️]+$/, '')} />
          ))}
        {ov.progress.isCurrent && wantsLeft > 0 && (
          <Tip icon="sparkles" text={t('За желания остават {0} — около {1} на ден.', { 0: money(wantsLeft), 1: money(wantsLeft / Math.max(1, ov.progress.daysLeft)) })} />
        )}
        <Tip icon="wallet" text={t('Задели 20% за спестяване още в деня на заплатата.')} />
        <Tip icon="restaurant" text={t('Записвай всеки ден, за да не огладнявам.')} />
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
        {t('Ситостта пада от 100% до 0% за 3 дни. Под {0}% огладнявам и настроението ми пада с 20 точки.', { 0: HUNGRY_AT })}
      </Text>
      <View style={s.card}>
        <Row ok title={t('Последно хранене')} detail={fedHoursAgo < 1 ? t('току-що') : t('преди {0}', { 0: hoursText(fedHoursAgo) })} />
        <Row
          ok={hoursToHungry > 0}
          title={hoursToHungry > 0 ? t('Ще огладнея') : t('Гладен съм')}
          detail={hoursToHungry > 0 ? t('след около {0}', { 0: hoursText(hoursToHungry) }) : t('от около {0}', { 0: hoursText(-hoursToHungry) })}
        />
      </View>
      <Text style={s.h2}>{t('Как да ме нахраниш')}</Text>
      <View style={s.card}>
        <Tip icon="add-circle" text={t('Запиши разход или доход — всеки запис ме храни.')} />
        <Tip icon="restaurant" text={t('Ако днес наистина няма разходи, натисни „Без разходи днес“.')} />
        <Tip icon="sparkles" text={t('Всеки ден със запис ми дава +{0} XP за растеж.', { 0: DAILY_XP })} />
      </View>
      {canFeed && (
        <Pill icon="restaurant" label={t('Без разходи днес — нахрани ме')} variant="ink" onPress={onFeed} haptic="success" style={s.action} />
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
          {status.xp} XP{status.next ? t(' · още {0} до „{1}“', { 0: status.next.xp - status.xp, 1: status.next.name }) : t(' · най-високият етап!')}
        </Text>
        <View style={{ marginTop: 10 }}>
          <Bar value={status.progress} color={colors.primary} height={8} />
        </View>
      </View>

      <Text style={s.h2}>{t('Етапи')}</Text>
      <View style={s.card}>
        {STAGES.map((st, i) => {
          const reached = status.xp >= st.xp;
          const current = i === status.index;
          return (
            <View key={st.key} style={[s.stage, i > 0 && s.sep]}>
              <Pet expression="happy" stage={st.key} size={48} animate={false} style={!reached && { opacity: 0.45 }} />
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, current && { color: colors.primary }]}>
                  {st.name}
                  {current ? t(' · сега') : ''}
                </Text>
                <Text style={s.rowDetail}>
                  {st.xp} XP · {STAGE_PERKS[st.key]}
                </Text>
              </View>
              {reached && <Ionicons name="checkmark-circle" size={22} color={colors.savings} />}
            </View>
          );
        })}
      </View>

      <Text style={s.h2}>{t('Как да порасна')}</Text>
      <View style={s.card}>
        <Tip icon="calendar" text={t('+{0} XP за всеки ден със запис (или „Без разходи днес“).', { 0: DAILY_XP })} />
        <Tip icon="trophy" text={t('Бонус в края на месеца: 85+ → +150 XP, 65+ → +80 XP, 45+ → +30 XP.')} />
        {status.score != null && (
          <Tip
            icon="trending-up"
            text={
              bonus
                ? t('Сега си на {0}/100 — ако задържиш, в края на месеца получавам +{1} XP.', { 0: status.score, 1: bonus })
                : t('Сега си на {0}/100 — над 45 точки ми носят месечен бонус.', { 0: status.score })
            }
          />
        )}
        <Tip icon="heart" text={t('Не се тревожи — никога не умирам, само тъжа и гладувам.')} />
      </View>
    </>
  );
}

const TITLES = { get mood() { return t('Настроение'); }, get fullness() { return t('Ситост'); }, get growth() { return t('Растеж'); } };

// What the dog's stats mean and how to raise them
export default function PetStatSheet({ stat, onClose, status, pet, advice, canFeed, onFeed, now }) {
  const value =
    stat === 'mood'
      ? status.score == null
        ? t('спи')
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

const s = themed((colors) => ({
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
  scaleLabel: { color: colors.text, fontSize: 11, fontWeight: '700' },
  scaleFrom: { color: colors.muted, fontSize: 11, marginTop: 2 },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.faint },
  action: { alignSelf: 'stretch', justifyContent: 'center', marginTop: 16, paddingVertical: 14 },
}));
