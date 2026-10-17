import React, { useState } from 'react';
import { View, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from './src/components/ui/AppText';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold } from '@expo-google-fonts/onest';
import { StoreProvider, useStore } from './src/store';
import { colors, shadow } from './src/theme';
import { stageFor } from './src/pet/logic';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import AddScreen from './src/screens/AddScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PetEventModal from './src/components/PetEventModal';
import useIncomingAdd from './src/hooks/useIncomingAdd';
import useWidgetSync from './src/widget/useWidgetSync';
import PetSnapshots from './src/widget/PetSnapshots';
import Touch from './src/components/ui/Touch';

function TabBar({ tab, onTab, onAdd }) {
  const insets = useSafeAreaInsets();
  const item = (key, icon, label) => {
    const active = tab === key;
    return (
      <Touch haptic="select" style={s.tab} onPress={() => onTab(key)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
        <Ionicons name={active ? icon : `${icon}-outline`} size={22} color={active ? colors.primary : colors.muted} />
        <Text style={[s.tabText, active && s.tabActive]}>{label}</Text>
      </Touch>
    );
  };
  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {item('home', 'home', 'Начало')}
      <Touch haptic="medium" onPress={onAdd} style={s.fabWrap} accessibilityLabel="Нов разход или доход">
        <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fab}>
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </Touch>
      {item('stats', 'stats-chart', 'Статистика')}
    </View>
  );
}

function Main() {
  const { ready, pet, expenses, incomes, incomeEntries, categories, pendingEvent, dismissEvent } = useStore();
  // The font ships in the bundle; if loading fails, the app falls back to the system font
  const [fontsLoaded, fontError] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold });
  const now = new Date();
  const [tab, setTab] = useState('home');
  // null = closed; otherwise the prefill for "New expense"
  const [adding, setAdding] = useState(null);
  const [settings, setSettings] = useState(false);
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const onMonthChange = (year, month) => setPeriod({ year, month });

  // The Apple Pay automation, the widget "+" and the quick action all open "New expense"
  useIncomingAdd(setAdding);
  const refreshWidget = useWidgetSync({ ready, expenses, incomes, incomeEntries, categories, pet });

  if (!ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={[s.root, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!pet) return <OnboardingScreen />;

  const Screen = tab === 'home' ? HomeScreen : StatsScreen;

  return (
    <View style={s.root}>
      <Screen {...period} onMonthChange={onMonthChange} onOpenSettings={() => setSettings(true)} onAdd={setAdding} />
      <TabBar tab={tab} onTab={setTab} onAdd={() => setAdding({})} />

      <Modal visible={!!adding} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAdding(null)}>
        <AddScreen
          prefill={adding || {}}
          onDone={(expense) => {
            setAdding(null);
            // Show the month of the new expense
            if (expense) {
              const d = new Date(expense.date);
              setPeriod({ year: d.getFullYear(), month: d.getMonth() });
            }
          }}
        />
      </Modal>

      <Modal visible={settings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettings(false)}>
        <SettingsScreen
          onClose={() => setSettings(false)}
          onTryApplePay={(prefill) => {
            setSettings(false);
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

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Main />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10,
    ...shadow, shadowOffset: { width: 0, height: -6 },
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  tabText: { color: colors.muted, fontSize: 11.5, fontWeight: '600' },
  tabActive: { color: colors.primary, fontWeight: '700' },
  fabWrap: {
    marginTop: -34, borderRadius: 32,
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  fab: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' },
});
