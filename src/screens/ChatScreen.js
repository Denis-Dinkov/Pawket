import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../components/ui/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore, CHAT_KEY } from '../store';
import { colors, radius } from '../theme';
import { petStatus } from '../pet/logic';
import Pet from '../pet/Pet';
import Touch from '../components/ui/Touch';
import Pill from '../components/ui/Pill';
import Sheet from '../components/ui/Sheet';
import useKeyboardHeight from '../hooks/useKeyboardHeight';
import { MODELS, PROVIDERS, FREE_PROVIDER, modelById, defaultModel, streamReply } from '../ai/coach';
import { financeSnapshot } from '../ai/snapshot';
import { loadApiKey, saveApiKey, removeApiKey, looksLikeApiKey } from '../ai/key';
import { themed } from '../themed';
import { t } from '../i18n';

const PROVIDER_IDS = Object.keys(PROVIDERS);

// The conversation outlives the screen and the app: it's saved on the phone (CHAT_KEY, the newest SAVED_MESSAGES)
// and restored once per launch. "Нов разговор" clears it.
// messages: [{ id, role: 'user' | 'assistant', text, error?: { kind, message }, via?: model name }]
// The snapshot of the numbers is renewed when the data it was read from changed (an entry added mid-chat) or a
// new day began (sources: the store arrays it was read from)
let kept = { messages: [], snapshot: null, day: null, sources: null, restored: false };
const SAVED_MESSAGES = 50;
// What goes to the model: only the newest messages, so a long chat stays quick and within the free limits
const SENT_MESSAGES = 12;

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// What goes to the model: the finished turns as plain text. Turns of the same side that ended up next to each
// other (a reply stopped before its first word) are joined, since some providers want strict alternation.
function toApiMessages(messages) {
  const out = [];
  for (const m of messages) {
    if (m.error || !m.text) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.text}`;
    else out.push({ role: m.role, content: m.text });
  }
  const recent = out.slice(-SENT_MESSAGES);
  // A conversation sent to the model must start with the user's turn
  while (recent[0]?.role === 'assistant') recent.shift();
  return recent;
}

// Where a provider's key is pasted: what it is, where to get one, the field. onSaved runs once it is stored.
function KeyBox({ provider, onSaved, onCancel, autoFocus = true }) {
  const info = PROVIDERS[provider];
  const [keyText, setKeyText] = useState('');
  const [keyError, setKeyError] = useState(false);
  const save = async () => {
    if (!looksLikeApiKey(provider, keyText)) return setKeyError(true);
    await saveApiKey(provider, keyText);
    setKeyText('');
    return onSaved();
  };
  return (
    <View style={s.keyBox}>
      <Text style={s.hint}>{info.keyHint}</Text>
      <Pill small icon="open-outline" label={t('Вземи ключ')} onPress={() => Linking.openURL(info.keyUrl)} />
      <TextInput
        value={keyText}
        onChangeText={(text) => {
          setKeyText(text);
          setKeyError(false);
        }}
        placeholder={t('Постави ключа тук')}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        autoFocus={autoFocus}
        style={[s.keyInput, keyError && { borderColor: colors.danger }]}
        accessibilityLabel={t('Ключ за {0}', { 0: info.name })}
      />
      {keyError && <Text style={s.error}>{t('Това не прилича на ключ. Копирай го целия и го постави пак.')}</Text>}
      <View style={s.keyButtons}>
        {onCancel && <Pill variant="outline" label={t('Отказ')} onPress={onCancel} />}
        <Pill variant="ink" label={t('Запази')} onPress={save} />
      </View>
    </View>
  );
}

// The model picker: the free models first, then Claude. A provider without a key asks for one in place.
function ModelSheet({ visible, onClose, modelId, hasKey, onPick, onKeysChanged }) {
  // The provider whose key field is open
  const [editing, setEditing] = useState(null);
  // A model picked before its provider had a key: chosen as soon as the key is saved
  const wanted = useRef(null);
  useEffect(() => {
    if (!visible) {
      setEditing(null);
      wanted.current = null;
    }
  }, [visible]);

  const openKey = setEditing;
  const keySaved = async () => {
    await onKeysChanged();
    const next = wanted.current;
    wanted.current = null;
    setEditing(null);
    if (next) {
      onPick(next);
      onClose();
    }
  };
  const dropKey = async (provider) => {
    await removeApiKey(provider);
    await onKeysChanged();
  };
  const pick = (model) => {
    if (!hasKey[model.provider]) {
      wanted.current = model.id;
      return openKey(model.provider);
    }
    onPick(model.id);
    return onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={s.sheetTitle} accessibilityRole="header">{t('Кой да отговаря')}</Text>
      <Text style={s.sheetSub}>{t('Избери модел. Ключът се пази само на този телефон.')}</Text>
      {PROVIDER_IDS.map((provider) => {
        const info = PROVIDERS[provider];
        return (
          <View key={provider} style={s.group}>
            <View style={s.groupHead}>
              <Text style={s.groupName}>{info.name}</Text>
              {hasKey[provider] ? (
                <View style={s.keyActions}>
                  <Touch hitSlop={8} onPress={() => openKey(provider)}>
                    <Text style={s.link}>{t('Смени ключа')}</Text>
                  </Touch>
                  <Touch hitSlop={8} onPress={() => dropKey(provider)} accessibilityLabel={t('Изтрий ключа за {0}', { 0: info.name })}>
                    <Ionicons name="trash-outline" size={17} color={colors.danger} />
                  </Touch>
                </View>
              ) : (
                editing !== provider && (
                  <Touch hitSlop={8} onPress={() => openKey(provider)}>
                    <Text style={s.link}>{t('Добави ключ')}</Text>
                  </Touch>
                )
              )}
            </View>
            {editing === provider && <KeyBox provider={provider} onSaved={keySaved} onCancel={() => setEditing(null)} />}
            {MODELS.filter((m) => m.provider === provider).map((m) => {
              const on = m.id === modelId && hasKey[provider];
              return (
                <Touch
                  key={m.id}
                  haptic="select"
                  style={[s.model, on && s.modelOn]}
                  onPress={() => pick(m)}
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${m.name}, ${m.hint}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.modelName}>{m.name}</Text>
                    <Text style={s.hint}>{m.hint}</Text>
                  </View>
                  <Ionicons name={on ? 'checkmark-circle' : hasKey[provider] ? 'ellipse-outline' : 'key-outline'} size={22} color={on ? colors.primary : colors.muted} />
                </Touch>
              );
            })}
          </View>
        );
      })}
    </Sheet>
  );
}

// "Advice with <the dog>": a chat about the user's own budget, answered by the model they picked
export default function ChatScreen({ onClose }) {
  const data = useStore();
  const { pet, settings, setSettings } = data;
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const status = petStatus({ ...data, now: new Date() });

  // A new dog (after "delete everything", which also removed the saved chat) starts a new conversation
  if (kept.petBorn !== pet.createdAt) kept = { messages: [], snapshot: null, day: null, sources: null, restored: kept.restored, petBorn: pet.createdAt };
  const [messages, setMessages] = useState(kept.messages);
  kept.messages = messages;
  // The saved conversation comes back once per launch; nothing is written before that, or it would be lost
  const [restored, setRestored] = useState(kept.restored);
  useEffect(() => {
    if (kept.restored) return;
    AsyncStorage.getItem(CHAT_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : [];
        if (Array.isArray(saved) && saved.length && !kept.messages.length) setMessages(saved);
      })
      .catch(() => {})
      .finally(() => {
        kept.restored = true;
        setRestored(true);
      });
  }, []);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  // Which providers have a key saved; null until the Keychain has answered
  const [hasKey, setHasKey] = useState(null);
  const aborter = useRef(null);
  const scroll = useRef(null);

  const refreshKeys = useCallback(async () => {
    const found = await Promise.all(PROVIDER_IDS.map(loadApiKey));
    setHasKey(Object.fromEntries(PROVIDER_IDS.map((p, i) => [p, !!found[i]])));
  }, []);
  useEffect(() => {
    refreshKeys();
    // Leaving the screen stops a reply that is still coming
    return () => aborter.current?.abort();
  }, [refreshKeys]);

  // The picked model, as long as its provider still has a key; otherwise the best one there is a key for
  const picked = modelById(settings.coachModel);
  const model = hasKey && (picked && hasKey[picked.provider] ? picked : modelById(defaultModel(hasKey)));

  const ask = async (text, history = messages) => {
    const question = text.trim();
    if (!question || busy) return;
    if (!model) {
      setModelsOpen(true);
      return;
    }
    const apiKey = await loadApiKey(model.provider);
    if (!apiKey) {
      await refreshKeys();
      setModelsOpen(true);
      return;
    }
    // The numbers are read again only when something changed since (or a new day began), so the dog answers
    // "and now?" with the expense just added, and otherwise keeps one story through the conversation
    const today = new Date().toDateString();
    const sources = [data.expenses, data.incomes, data.incomeEntries, data.recurring, data.goals, data.wishes, data.splits];
    if (!kept.snapshot || kept.day !== today || sources.some((x, i) => x !== kept.sources?.[i])) {
      kept.snapshot = financeSnapshot(data, new Date());
      kept.day = today;
      kept.sources = sources;
    }
    const reply = { id: newId(), role: 'assistant', text: '' };
    const next = [...history, { id: newId(), role: 'user', text: question }];
    setMessages([...next, reply]);
    setDraft('');
    setBusy(true);
    const patch = (change) => setMessages((list) => list.map((m) => (m.id === reply.id ? { ...m, ...change(m) } : m)));
    aborter.current = new AbortController();
    try {
      const result = await streamReply({
        modelId: model.id,
        apiKey,
        petName: pet.name,
        snapshot: kept.snapshot,
        messages: toApiMessages(next),
        onText: (piece) => patch((m) => ({ text: m.text + piece })),
        signal: aborter.current.signal,
      });
      // The other free model stood in for an overloaded one: said under the reply
      if (result.modelId !== model.id) patch(() => ({ via: modelById(result.modelId)?.name }));
      if (result.cut) patch((m) => ({ text: `${m.text}\n\n${t('(Отговорът стана твърде дълъг и спря тук.)')}` }));
      // Stopped before the first word: nothing to keep
      if (result.stopped) setMessages((list) => list.filter((m) => m.id !== reply.id || m.text));
    } catch (e) {
      patch(() => ({ error: { kind: e.kind || 'other', message: e.message } }));
    } finally {
      aborter.current = null;
      setBusy(false);
    }
  };

  // Asks the question above a failed reply again, without the failed attempt
  const retry = (failed) => {
    const at = messages.findIndex((m) => m.id === failed.id);
    const question = messages[at - 1];
    if (!question) return;
    ask(question.text, messages.slice(0, at - 1));
  };

  const startOver = () => {
    aborter.current?.abort();
    kept.snapshot = null;
    setMessages([]);
  };

  // Saved once a reply is finished (not on every streamed piece)
  useEffect(() => {
    if (!restored || busy) return;
    AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-SAVED_MESSAGES))).catch(() => {});
  }, [messages, busy, restored]);

  const suggestions = [
    t('Как ми е бюджетът този месец?'),
    t('Къде мога да спестя най-лесно?'),
    t('Какво да оптимизирам в разходите си?'),
    t('Ще ми стигнат ли парите до края на месеца?'),
  ];
  const last = messages[messages.length - 1];
  const thinking = busy && last?.role === 'assistant' && !last.text;

  return (
    <View style={[s.root, { paddingBottom: keyboard }]}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Pet expression={status.expression} stage={status.stage.key} size={44} animate={false} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title} accessibilityRole="header" numberOfLines={1}>{t('Съвети с {0}', { 0: pet.name })}</Text>
          <Touch hitSlop={8} onPress={() => setModelsOpen(true)} style={s.modelPick} accessibilityLabel={t('Модел: {0}. Смени', { 0: model?.name || t('няма избран') })}>
            <Text style={s.modelPickText} numberOfLines={1}>{model ? model.name : t('Избери модел')}</Text>
            <Ionicons name="chevron-down" size={13} color={colors.primary} />
          </Touch>
        </View>
        {messages.length > 0 && (
          <Touch hitSlop={10} onPress={startOver} accessibilityLabel={t('Нов разговор')}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </Touch>
        )}
        <Touch hitSlop={12} onPress={onClose}>
          <Text style={s.done}>{t('Готово')}</Text>
        </Touch>
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        // Follows the reply as it is written
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={s.empty}>
            <Pet expression={status.expression} stage={status.stage.key} size={120} />
            <Text style={s.hello}>{t('Питай ме за парите си 🐾')}</Text>
            <Text style={s.sub}>
              {t('Виждам бюджета, разходите, целите и плащанията ти в Pawket и отговарям според тях. Говоря само за пари.')}
            </Text>
            {hasKey && !model ? (
              // Nothing set up yet: the free model needs only its key, pasted once
              <View style={s.setup}>
                <Text style={s.setupTitle}>{t('Остава само безплатният ключ')}</Text>
                <KeyBox provider={FREE_PROVIDER} onSaved={refreshKeys} autoFocus={false} />
                <Touch hitSlop={8} onPress={() => setModelsOpen(true)} style={{ alignSelf: 'center' }}>
                  <Text style={s.link}>{t('Или избери друг модел')}</Text>
                </Touch>
              </View>
            ) : (
              <View style={s.suggestions}>
                {suggestions.map((q) => (
                  <Touch key={q} style={s.suggestion} onPress={() => ask(q)}>
                    <Text style={s.suggestionText}>{q}</Text>
                    <Ionicons name="arrow-up-circle" size={20} color={colors.primary} />
                  </Touch>
                ))}
              </View>
            )}
            {model && (
              <Text style={s.privacy}>
                {t('Въпросите и данните за бюджета ти се изпращат до {0}, за да получиш отговор.', { 0: PROVIDERS[model.provider].name })}
              </Text>
            )}
          </View>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <View key={m.id} style={s.mine}>
              <Text style={s.mineText} selectable>{m.text}</Text>
            </View>
          ) : (
            <View key={m.id} style={s.theirs}>
              {!!m.text && <Text style={s.theirsText} selectable>{m.text}</Text>}
              {!m.text && !m.error && <Text style={s.typing}>{t('{0} мисли…', { 0: pet.name })}</Text>}
              {!!m.via && <Text style={s.via}>{t('Отговори {0}: избраният модел беше претоварен.', { 0: m.via })}</Text>}
              {m.error && (
                <View style={{ gap: 10, marginTop: m.text ? 10 : 0 }}>
                  <View style={s.errorRow}>
                    <Ionicons name="alert-circle" size={18} color={colors.danger} />
                    <Text style={s.error}>{m.error.message}</Text>
                  </View>
                  <View style={s.keyButtons}>
                    {m.error.kind === 'auth' && <Pill small icon="key-outline" label={t('Смени ключа')} onPress={() => setModelsOpen(true)} />}
                    {(m.error.kind === 'limit' || m.error.kind === 'busy') && <Pill small icon="swap-horizontal" label={t('Друг модел')} onPress={() => setModelsOpen(true)} />}
                    {m.id === last?.id && !busy && <Pill small variant="outline" icon="refresh" label={t('Опитай пак')} onPress={() => retry(m)} />}
                  </View>
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>

      <View style={[s.inputBar, { paddingBottom: keyboard ? 10 : Math.max(insets.bottom, 12) }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('Питай {0}…', { 0: pet.name })}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          style={s.input}
          accessibilityLabel={t('Въпрос към {0}', { 0: pet.name })}
        />
        {busy ? (
          <Touch style={s.send} onPress={() => aborter.current?.abort()} accessibilityLabel={thinking ? t('Спри') : t('Спри отговора')}>
            <Ionicons name="stop" size={18} color={colors.onAccent} />
          </Touch>
        ) : (
          <Touch
            style={[s.send, !draft.trim() && { opacity: 0.4 }]}
            disabled={!draft.trim()}
            onPress={() => ask(draft)}
            accessibilityLabel={t('Изпрати')}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </Touch>
        )}
      </View>

      <ModelSheet
        visible={modelsOpen}
        onClose={() => setModelsOpen(false)}
        modelId={model?.id}
        hasKey={hasKey || {}}
        onPick={(id) => setSettings({ coachModel: id })}
        onKeysChanged={refreshKeys}
      />
    </View>
  );
}

const s = themed((c) => ({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: c.faint,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.roomFrom, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  title: { color: c.text, fontSize: 17, fontWeight: '800' },
  modelPick: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginTop: 2 },
  modelPickText: { color: c.primary, fontSize: 13, fontWeight: '600' },
  done: { color: c.primary, fontSize: 15, fontWeight: '700' },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  hello: { color: c.text, fontSize: 20, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  sub: { color: c.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 },
  setup: { alignSelf: 'stretch', gap: 10, marginTop: 10 },
  setupTitle: { color: c.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  suggestions: { alignSelf: 'stretch', gap: 8, marginTop: 10 },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderRadius: radius.badge,
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.faint,
  },
  suggestionText: { flex: 1, color: c.text, fontSize: 15, fontWeight: '600' },
  privacy: { color: c.muted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 10, paddingHorizontal: 12 },
  mine: {
    alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.primary, borderRadius: radius.tile, borderBottomRightRadius: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  mineText: { color: c.onAccent, fontSize: 15, lineHeight: 21 },
  theirs: {
    alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: c.card, borderRadius: radius.tile, borderBottomLeftRadius: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.faint,
  },
  theirsText: { color: c.text, fontSize: 15, lineHeight: 22 },
  typing: { color: c.muted, fontSize: 14 },
  via: { color: c.muted, fontSize: 12, marginTop: 6 },
  errorRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  // flexShrink, not flex: the bubble sizes to its content, and flex: 1 squeezed the text to the buttons' width
  error: { flexShrink: 1, color: c.danger, fontSize: 14, lineHeight: 19 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: c.faint, backgroundColor: c.bg,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: c.card, borderRadius: 21, borderWidth: 1, borderColor: c.faint,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, color: c.text, fontSize: 15,
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },

  sheetTitle: { color: c.text, fontSize: 20, fontWeight: '800' },
  sheetSub: { color: c.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  group: { marginTop: 18, gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupName: { color: c.text, fontSize: 15, fontWeight: '700' },
  keyActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  link: { color: c.primary, fontSize: 14, fontWeight: '700' },
  keyBox: { backgroundColor: c.card, borderRadius: radius.badge, padding: 14, gap: 10, borderWidth: 1, borderColor: c.faint },
  keyInput: {
    backgroundColor: c.bg, borderRadius: radius.field, borderWidth: 1, borderColor: c.faint, paddingHorizontal: 12, paddingVertical: 10,
    color: c.text, fontSize: 15,
  },
  keyButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hint: { color: c.muted, fontSize: 13, lineHeight: 18 },
  model: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderRadius: radius.badge,
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 2, borderColor: 'transparent',
  },
  modelOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
  modelName: { color: c.text, fontSize: 15, fontWeight: '700' },
}));
