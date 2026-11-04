import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Modal, ActivityIndicator, Animated, Appearance, useColorScheme } from 'react-native';
import { Text } from './src/components/ui/AppText';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold } from '@expo-google-fonts/onest';
import { StoreProvider, useStore } from './src/store';
import { colors, shadow, applyScheme, money } from './src/theme';
import { stageFor, dayKey } from './src/pet/logic';
import { sameDay } from './src/format';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import PlansScreen from './src/screens/PlansScreen';
import PetScreen from './src/screens/PetScreen';
import AddScreen from './src/screens/AddScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PetEventModal from './src/components/PetEventModal';
import Toast from './src/components/Toast';
import FlyingAmount from './src/components/FlyingAmount';
import PawBurst from './src/components/PawBurst';
import Appear from './src/components/ui/Appear';
import { motionReduced } from './src/motion';
import useIncomingAdd from './src/hooks/useIncomingAdd';
import useWidgetSync from './src/widget/useWidgetSync';
import PetSnapshots from './src/widget/PetSnapshots';
import Touch from './src/components/ui/Touch';
import { syncReminders, listenToReminders, ACTION_NO_SPEND } from './src/reminders';
import { syncLiveActivity } from './src/widget/liveActivity';
import { themed } from './src/themed';

const TABS = [
  { key: 'home', icon: 'home', label: 'Начало' },
  { key: 'stats', icon: 'stats-chart', label: 'Отчети' },
  null, // the "+" button sits in the middle
  { key: 'plans', icon: 'flag', label: 'Планове' },
  { key: 'pet', icon: 'paw', label: 'Чарли' },
];

// The tab icon gives a small hop when its tab becomes active
function TabIcon({ name, active }) {
  const hop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active || motionReduced()) return;
    hop.setValue(0.8);
    Animated.spring(hop, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }).start();
  }, [active, hop]);
  return (
    <Animated.View style={{ transform: [{ scale: hop }] }}>
      <Ionicons name={active ? name : `${name}-outline`} size={23} color={active ? colors.primary : colors.muted} />
    </Animated.View>
  );
}

function TabBar({ tab, onTab, onAdd, petName }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {TABS.map((t) =>
        !t ? (
          <Touch key="add" haptic="medium" onPress={onAdd} style={s.fab} accessibilityLabel="Нов разход или доход">
            <Ionicons name="add" size={30} color={colors.onAccent} />
          </Touch>
        ) : (
          <Touch
            key={t.key}
            haptic="select"
            style={s.tab}
            onPress={() => onTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
          >
            <TabIcon name={t.icon} active={tab === t.key} />
            <Text style={[s.tabText, tab === t.key && s.tabActive]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {t.key === 'pet' ? petName : t.label}
            </Text>
          </Touch>
        )
      )}
    </View>
  );
}

function Main() {
  const { ready, pet, expenses, incomes, incomeEntries, recurring, categories, settings, pendingEvent, dismissEvent, toast, dismissToast, checkInNoSpend } =
    useStore();
  // The font ships in the bundle; if loading fails, the app falls back to the system font
  const [fontsLoaded, fontError] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold });
  const now = new Date();
  const [tab, setTab] = useState('home');
  // null = closed; otherwise the prefill for "New expense" ({ edit } edits an expense)
  const [adding, setAdding] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The amount that flies up after saving
  const [flying, setFlying] = useState(null);
  const clearFlying = useCallback(() => setFlying(null), []);
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const onMonthChange = (year, month) => setPeriod({ year, month });

  // The Apple Pay automation, the widget "+" and the quick action all open "New expense"
  useIncomingAdd(setAdding);
  const refreshWidget = useWidgetSync({ ready, expenses, incomes, incomeEntries, recurring, categories, pet });

  // The evening reminder: rescheduled after every entry, skipping today once something is recorded
  const activeToday = !!pet && (pet.lastActiveDay === dayKey(new Date()) || expenses.some((e) => e.source !== 'recurring' && sameDay(e.date, new Date())));
  useEffect(() => {
    if (!ready || !pet) return;
    syncReminders({ ...settings.reminder, petName: pet.name, activeToday });
  }, [ready, pet?.name, pet?.lastFedAt, activeToday, settings.reminder]);
  // Dynamic Island: refreshed (with a short delay) after every change and when the app comes back
  useEffect(() => {
    if (!ready || !pet) return undefined;
    const t = setTimeout(
      () => syncLiveActivity({ enabled: settings.liveActivity !== false, data: { expenses, incomes, incomeEntries, recurring, pet } }),
      600
    );
    return () => clearTimeout(t);
  }, [ready, pet, expenses, incomes, incomeEntries, recurring, settings.liveActivity]);

  const onReminder = useCallback(
    (action) => (action === ACTION_NO_SPEND ? checkInNoSpend() : setAdding({ source: 'manual' })),
    [checkInNoSpend]
  );
  useEffect(() => (ready && pet ? listenToReminders(onReminder) : undefined), [ready, !!pet]);

  if (!ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={[s.root, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!pet) return <OnboardingScreen />;

  const Screen = { home: HomeScreen, stats: StatsScreen, plans: PlansScreen, pet: PetScreen }[tab];

  return (
    <View style={s.root}>
      {/* A new tab fades and slides in instead of appearing at once */}
      <Appear key={tab} style={{ flex: 1 }}>
        <Screen
          {...period}
          onMonthChange={onMonthChange}
          onOpenSettings={() => setSettingsOpen(true)}
          onAdd={setAdding}
          onTab={setTab}
        />
      </Appear>
      <TabBar tab={tab} onTab={setTab} onAdd={() => setAdding({})} petName={pet.name} />
      <FlyingAmount item={flying} onDone={clearFlying} />
      {/* Goals and missions done: paws burst out */}
      <PawBurst id={toast?.celebrate ? toast.id : null} />
      <Toast toast={toast} onDismiss={dismissToast} />

      <Modal visible={!!adding} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAdding(null)}>
        <AddScreen
          prefill={adding || {}}
          onDone={(expense) => {
            setAdding(null);
            // Show the month of the new expense
            if (expense) {
              const d = new Date(expense.date);
              setPeriod({ year: d.getFullYear(), month: d.getMonth() });
              const income = expense.type === 'income';
              setFlying({ id: Date.now(), income, text: `${income ? '+' : '−'}${money(expense.amount)}` });
            }
          }}
        />
      </Modal>

      <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsOpen(false)}>
        <SettingsScreen
          onClose={() => setSettingsOpen(false)}
          onTryApplePay={(prefill) => {
            setSettingsOpen(false);
            // iOS won't present a new modal while the previous one is still closing
            setTimeout(() => setAdding(prefill), 600);
          }}
        />
      </Modal>

      <PetEventModal event={pendingEvent} pet={pet} stage={stageFor(pet.xp).stage} onClose={dismissEvent} />
      <PetSnapshots stageKey={stageFor(pet.xp).stage.key} onDone={refreshWidget} />
    </View>
  );
}

/**
 * Light / dark: follows the system unless Settings pick one. The palette is swapped before the
 * children render, and Main is remounted so every screen picks up the new colors.
 */
function Themed() {
  const { settings } = useStore();
  const system = useColorScheme();
  const pref = settings?.theme || 'system';
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  applyScheme(scheme);

  // Native parts (alerts, keyboard, page sheets) follow the same choice
  useEffect(() => {
    try {
      Appearance.setColorScheme?.(pref === 'system' ? 'unspecified' : pref);
    } catch {
      // older platforms: native parts follow the system
    }
  }, [pref]);

  return <Main key={scheme} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Themed />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const s = themed((c) => ({
  root: { flex: 1, backgroundColor: c.bg },
  tabBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8,
    ...shadow, shadowOffset: { width: 0, height: -6 },
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, minHeight: 48, justifyContent: 'center' },
  tabText: { color: c.muted, fontSize: 11, fontWeight: '600' },
  tabActive: { color: c.primary, fontWeight: '700' },
  fab: {
    width: 58, height: 58, borderRadius: 20, marginTop: -26, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.primary, borderWidth: 4, borderColor: c.card,
    shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
}));
