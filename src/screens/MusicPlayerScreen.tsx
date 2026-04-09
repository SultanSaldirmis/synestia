import Slider from '@react-native-community/slider';
import { Alert, Dimensions, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage, ScreenSafeArea } from '../components';
import { useAuth } from '../context/AuthContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import type { AppStackParamList } from '../navigation/types';
import {
  createUserCollection,
  saveContentToUserCollection,
  subscribeUserCollections,
  type UserCollectionDoc,
} from '../services/firestoreService';
import { colors, radii, scale, spacing, spacingVertical, typography } from '../theme';
import { useEffect, useState } from 'react';

type Props = NativeStackScreenProps<AppStackParamList, 'MusicPlayer'>;

function f(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MusicPlayerScreen({ navigation }: Props) {
  const { current, isPlaying, positionMs, durationMs, togglePlayPause, seekTo, skipBy, volume, setVolume } = useMusicPlayer();
  const { user } = useAuth();
  const [saveOpen, setSaveOpen] = useState(false);
  const [collections, setCollections] = useState<UserCollectionDoc[]>([]);
  const [newName, setNewName] = useState('');
  const { width, height } = Dimensions.get('window');
  const artSize = Math.min(width - scale(56), height * 0.36);

  useEffect(() => {
    if (!saveOpen || !user?.uid) {
      setCollections([]);
      return;
    }
    return subscribeUserCollections(user.uid, setCollections);
  }, [saveOpen, user?.uid]);
  return (
    <ScreenSafeArea edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.root}>
        <View style={styles.top}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={scale(24)} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.topTitle}>Müzik Çalar</Text>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => setSaveOpen(true)}
              hitSlop={10}
            >
              <Ionicons name="bookmark-outline" size={scale(22)} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => {
                if (current?.detail) navigation.navigate('Detail', current.detail);
              }}
              hitSlop={10}
            >
              <Ionicons name="information-circle-outline" size={scale(22)} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
        {current ? (
          <>
            {current.imageUrl ? <CachedImage uri={current.imageUrl} style={[styles.art, { width: artSize, height: artSize }]} /> : <View style={[styles.art, { width: artSize, height: artSize }]} />}
            <Text style={styles.title} numberOfLines={2}>{current.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{current.artist}</Text>
            {!current.previewUrl ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewWarn}>Bu parça telif hakları nedeniyle sadece Spotify'da dinlenebilir.</Text>
                <Pressable
                  style={styles.spotifyBtn}
                  onPress={() => {
                    const url = current.externalUrl ?? `https://open.spotify.com/search/${encodeURIComponent(current.title)}`;
                    void Linking.openURL(url).catch(() => Alert.alert('Hata', 'Spotify açılamadı.'));
                  }}
                >
                  <Text style={styles.spotifyBtnText}>Spotify'da Aç</Text>
                </Pressable>
              </View>
            ) : null}
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={Math.max(durationMs, 1)}
              value={positionMs}
              onSlidingComplete={(v) => void seekTo(v)}
              disabled={!current.previewUrl}
              minimumTrackTintColor={colors.accentPurple}
              maximumTrackTintColor={colors.border}
            />
            <View style={styles.timeRow}>
              <Text style={styles.time}>{f(positionMs)}</Text>
              <Text style={styles.time}>{f(durationMs)}</Text>
            </View>
            <View style={styles.volumeRow}>
              <Ionicons name="volume-low" size={scale(18)} color={colors.textMuted} />
              <Slider
                style={{ flex: 1 }}
                minimumValue={0}
                maximumValue={1}
                value={volume}
                onSlidingComplete={(v) => void setVolume(v)}
                minimumTrackTintColor={colors.accentPurple}
                maximumTrackTintColor={colors.border}
              />
              <Ionicons name="volume-high" size={scale(18)} color={colors.textMuted} />
            </View>
            <View style={styles.controls}>
              <Pressable onPress={() => void skipBy(-5000)} style={styles.btn}>
                <Ionicons name="play-back" size={scale(24)} color={colors.textPrimary} />
                <Text style={styles.btnMeta}>-5s</Text>
              </Pressable>
              <Pressable onPress={() => void togglePlayPause()} style={[styles.btn, styles.playBtn]}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={scale(30)} color="#fff" />
              </Pressable>
              <Pressable onPress={() => void skipBy(5000)} style={styles.btn}>
                <Ionicons name="play-forward" size={scale(24)} color={colors.textPrimary} />
                <Text style={styles.btnMeta}>+5s</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.empty}><Text style={styles.artist}>Aktif şarkı yok.</Text></View>
        )}
      </View>
      <Modal visible={saveOpen} transparent animationType="slide" onRequestClose={() => setSaveOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSaveOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Koleksiyona kaydet</Text>
          <ScrollView>
            {collections.map((c) => (
              <Pressable
                key={c.id}
                style={styles.collectionRow}
                onPress={() => {
                  if (!user?.uid || !current) return;
                  void saveContentToUserCollection(user.uid, c.id, {
                    title: current.title,
                    imageUrl: current.imageUrl ?? '',
                    contentType: 'music',
                    externalUrl: current.externalUrl ?? current.previewUrl,
                    postId: current.id,
                  })
                    .then(() => {
                      setSaveOpen(false);
                      Alert.alert('Kaydedildi');
                    })
                    .catch(() => Alert.alert('Hata', 'Kaydedilemedi.'));
                }}
              >
                <Ionicons name="folder-open-outline" size={scale(20)} color={colors.accentPurple} />
                <Text style={styles.collectionTitle}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Yeni koleksiyon adı"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Pressable
            style={styles.createBtn}
            onPress={() => {
              if (!user?.uid || !newName.trim()) return;
              void createUserCollection(user.uid, newName.trim(), 'music')
                .then((id) => {
                  if (!current) return;
                  return saveContentToUserCollection(user.uid!, id, {
                    title: current.title,
                    imageUrl: current.imageUrl ?? '',
                    contentType: 'music',
                    externalUrl: current.externalUrl ?? current.previewUrl,
                    postId: current.id,
                  });
                })
                .then(() => {
                  setNewName('');
                  setSaveOpen(false);
                })
                .catch(() => Alert.alert('Hata', 'Oluşturulamadı.'));
            }}
          >
            <Text style={styles.createBtnText}>Yeni oluştur ve kaydet</Text>
          </Pressable>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: scale(18), paddingVertical: scale(12) },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(12) },
  topTitle: { ...typography.subtitle, color: colors.textPrimary, flex: 1, textAlign: 'center', fontWeight: '700' },
  topActions: { width: scale(54), alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', gap: spacing.sm },
  art: { alignSelf: 'center', borderRadius: radii.lg, backgroundColor: colors.surfaceElevated },
  title: { ...typography.screenTitle, color: colors.textPrimary, marginTop: scale(12) },
  artist: { ...typography.body, color: colors.textMuted, marginTop: spacingVertical.xs },
  previewCard: {
    marginTop: spacingVertical.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacingVertical.xs,
  },
  previewWarn: { ...typography.meta, color: colors.textMuted, textAlign: 'left', lineHeight: scale(18) },
  spotifyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentPurple,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.xs,
  },
  spotifyBtnText: { ...typography.caption, color: '#fff', fontWeight: '700' },
  slider: { marginTop: scale(10) },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { ...typography.meta, color: colors.textMuted },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: scale(6) },
  controls: { flexDirection: 'row', justifyContent: 'space-around', marginTop: scale(12) },
  btn: { alignItems: 'center', justifyContent: 'center', padding: scale(8) },
  playBtn: { backgroundColor: colors.profileAccent, borderRadius: scale(28), width: scale(56), height: scale(56) },
  btnMeta: { ...typography.meta, color: colors.textMuted, marginTop: spacingVertical.xxs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl,
    maxHeight: '65%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.subtitle, color: colors.textPrimary, marginBottom: spacingVertical.sm, fontWeight: '700' },
  collectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacingVertical.sm },
  collectionTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    marginTop: spacingVertical.md,
  },
  createBtn: {
    marginTop: spacingVertical.sm,
    backgroundColor: colors.profileAccent,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.sm,
    alignItems: 'center',
  },
  createBtnText: { ...typography.button, color: '#fff' },
});

