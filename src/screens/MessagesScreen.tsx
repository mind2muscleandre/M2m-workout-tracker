import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useMessageStore } from '../stores/messageStore';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { Button, IconButton } from '../components/ui/Button';
import { SearchBar } from '../components/ui/SearchBar';
import { SectionLabel } from '../components/ui/SectionLabel';
import { SplitPane } from '../components/ui/SplitPane';
import { ChatThread } from '../components/ui/ChatThread';
import { useLayout } from '../lib/useLayout';
import { coachColors, fonts, borderRadius, spacing } from '../lib/theme';
import { getClientInitials, getClientAvatarColor } from '../lib/athleteStatus';
import type { Conversation } from '../services/messages';

type Nav = StackNavigationProp<RootStackParamList>;

function formatThreadTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime()) {
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  }
  if (msgDay.getTime() === yesterday.getTime()) return 'Igår';
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

export function MessagesScreen() {
  const navigation = useNavigation<Nav>();
  const { isMobile } = useLayout();
  const user = useAuthStore((s) => s.user);
  const { clients, fetchClients } = useClientStore();
  const {
    conversations,
    messages,
    activeConversationId,
    unreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    openConversation,
    setActiveConversation,
    fetchUnreadCount,
  } = useMessageStore();

  const [search, setSearch] = useState('');
  const [mobileShowThread, setMobileShowThread] = useState(false);

  useEffect(() => {
    fetchClients().catch(() => {});
    fetchConversations().catch(() => {});
    fetchUnreadCount().catch(() => {});
  }, [fetchClients, fetchConversations, fetchUnreadCount]);

  const activeConvo = conversations.find((c) => c.id === activeConversationId);

  const onSelectThread = useCallback(
    async (convo: Conversation) => {
      await fetchMessages(convo.id);
      setMobileShowThread(true);
    },
    [fetchMessages]
  );

  const onSend = useCallback(
    async (text: string) => {
      if (!activeConversationId || !text.trim()) return;
      await sendMessage(activeConversationId, text.trim());
      await fetchUnreadCount();
    },
    [activeConversationId, sendMessage, fetchUnreadCount]
  );

  const startWithClient = useCallback(
    async (clientId: string) => {
      const conv = await openConversation(clientId);
      setMobileShowThread(true);
      await fetchMessages(conv.id);
    },
    [openConversation, fetchMessages]
  );

  const filteredConvos = conversations.filter((c) => {
    const name = c.client?.name ?? '';
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  const chatMessages = useMemo(
    () =>
      messages.map((m) => ({
        id: m.id,
        dir: (m.sender_id === user?.id ? 'out' : 'in') as 'in' | 'out',
        text: m.body,
        time: new Date(m.created_at).toLocaleTimeString('sv-SE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    [messages, user?.id]
  );

  const threadList = (
    <View style={styles.threadList}>
      <View style={styles.threadSearch}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Sök konversation…"
          style={styles.searchFull}
        />
      </View>
      <FlatList
        data={filteredConvos}
        keyExtractor={(item) => item.id}
        style={styles.threadScroll}
        ListHeaderComponent={
          <SectionLabel style={styles.threadSectionLabel}>Konversationer</SectionLabel>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Inga konversationer</Text>
            <Text style={styles.emptySub}>Välj en atlet nedan för att starta chatt</Text>
            {clients
              .filter((c) => c.is_active)
              .slice(0, 5)
              .map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.clientPick}
                  onPress={() => startWithClient(c.id)}
                >
                  <Text style={styles.clientPickText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.id === activeConversationId;
          const lastPreview =
            isActive && messages.length > 0
              ? messages[messages.length - 1].body
              : item.last_message_at
                ? 'Senast aktiv'
                : 'Ny konversation';

          return (
            <TouchableOpacity
              style={[styles.thread, isActive && styles.threadActive]}
              onPress={() => onSelectThread(item)}
            >
              {isActive ? <View style={styles.threadActiveBar} /> : null}
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: `${getClientAvatarColor(item.client_id)}66` },
                ]}
              >
                <Text style={styles.avatarText}>
                  {getClientInitials(item.client?.name ?? '?')}
                </Text>
              </View>
              <View style={styles.threadBody}>
                <Text style={[styles.threadName, isActive && styles.threadNameActive]}>
                  {item.client?.name ?? 'Atlet'}
                </Text>
                <Text style={styles.threadPreview} numberOfLines={1}>
                  {lastPreview}
                </Text>
              </View>
              <View style={styles.threadMeta}>
                <Text style={styles.threadTime}>{formatThreadTime(item.last_message_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const messageView = activeConvo ? (
    <View style={styles.messageView}>
      <View style={styles.messageHeader}>
        {isMobile && mobileShowThread ? (
          <TouchableOpacity
            onPress={() => {
              setMobileShowThread(false);
              setActiveConversation(null);
            }}
            style={styles.backBtn}
          >
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
        ) : null}
        <View
          style={[
            styles.mvAvatar,
            { backgroundColor: `${getClientAvatarColor(activeConvo.client_id)}66` },
          ]}
        >
          <Text style={styles.mvAvatarText}>
            {getClientInitials(activeConvo.client?.name ?? '?')}
          </Text>
        </View>
        <View style={styles.mvInfo}>
          <Text style={styles.messageTitle}>{activeConvo.client?.name}</Text>
          <Text style={styles.messageSub}>
            {activeConvo.client?.sport
              ? `Tränar · ${activeConvo.client.sport}`
              : 'Tränar'}
          </Text>
        </View>
        <View style={styles.mvActions}>
          <IconButton
            size={36}
            onPress={() =>
              navigation.navigate('AthleteDetail', { clientId: activeConvo.client_id })
            }
          >
            <Text style={styles.actionIcon}>👤</Text>
          </IconButton>
          <IconButton
            size={36}
            onPress={() =>
              navigation.navigate('SessionTimer', { clientId: activeConvo.client_id })
            }
          >
            <Text style={styles.actionIcon}>⏱</Text>
          </IconButton>
        </View>
      </View>

      <View style={styles.chatWrap}>
        <ChatThread
          messages={chatMessages}
          onSend={onSend}
          placeholder="Skriv ett meddelande…"
        />
      </View>
    </View>
  ) : (
    <View style={styles.placeholder}>
      <Text style={styles.muted}>Välj en konversation</Text>
    </View>
  );

  return (
    <ScreenContainer
      title="Meddelanden"
      subtitle={`${unreadCount} olästa · ${conversations.length} konversationer`}
      headerRight={
        <Button
          label="Nytt meddelande"
          size="sm"
          variant="primary"
          onPress={() => navigation.navigate('Broadcast')}
        />
      }
      scroll={false}
    >
      <SplitPane
        list={threadList}
        detail={messageView}
        listWidth={280}
        showDetail={mobileShowThread}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  threadList: { flex: 1 },
  threadSearch: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  searchFull: { maxWidth: '100%' },
  threadScroll: { flex: 1 },
  threadSectionLabel: {
    paddingHorizontal: 14,
    paddingTop: 12,
    marginBottom: 2,
  },
  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
  },
  threadActive: {
    backgroundColor: coachColors.glassBgCoach,
  },
  threadActiveBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: coachColors.coach,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 14,
    color: '#000',
  },
  threadBody: { flex: 1, minWidth: 0 },
  threadName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.mutedHi,
  },
  threadNameActive: {
    fontFamily: fonts.bodySemiBold,
    color: coachColors.fg,
  },
  threadPreview: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.muted,
    marginTop: 1,
  },
  threadMeta: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  threadTime: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
  },
  messageView: { flex: 1, minWidth: 0 },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  backBtn: { paddingRight: 4 },
  back: { color: coachColors.muted, fontSize: 18 },
  mvAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvAvatarText: {
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  mvInfo: { flex: 1, minWidth: 0 },
  messageTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: coachColors.fg,
  },
  messageSub: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.54,
    marginTop: 2,
  },
  mvActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: 'auto',
  },
  actionIcon: {
    fontSize: 14,
    color: coachColors.mutedHi,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  quickChip: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  quickText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.mutedHi,
  },
  chatWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 0,
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: coachColors.muted, fontFamily: fonts.body, fontSize: 13 },
  empty: { padding: 20, alignItems: 'center' },
  emptyTitle: {
    fontFamily: fonts.bodySemiBold,
    color: coachColors.fg,
    marginBottom: 4,
    fontSize: 13,
  },
  emptySub: {
    color: coachColors.muted,
    fontSize: 12,
    marginBottom: 16,
    fontFamily: fonts.body,
  },
  clientPick: {
    padding: 10,
    backgroundColor: coachColors.glassBg,
    borderRadius: borderRadius.md,
    marginTop: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  clientPickText: {
    color: coachColors.mutedHi,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fonts.body,
  },
});
