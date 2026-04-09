import { Audio, type AVPlaybackStatus } from 'expo-av';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type TrackPayload = {
  id: string;
  title: string;
  artist: string;
  imageUrl?: string;
  previewUrl?: string;
  externalUrl?: string;
  detail?: {
    id: string;
    title: string;
    category: 'music';
    description?: string;
    imageUrl?: string;
    body?: string;
    authorUid?: string;
    authorName?: string;
    commentCount?: number;
  };
};

type Ctx = {
  current: TrackPayload | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  playTrack: (track: TrackPayload) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  skipBy: (deltaMs: number) => Promise<void>;
  volume: number;
  setVolume: (value: number) => Promise<void>;
};

const MusicPlayerContext = createContext<Ctx | null>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [current, setCurrent] = useState<TrackPayload | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    }).catch(() => {});
    return () => {
      const s = soundRef.current;
      if (s) void s.unloadAsync().catch(() => {});
    };
  }, []);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPositionMs(status.positionMillis ?? 0);
    setDurationMs(status.durationMillis ?? 0);
    setIsPlaying(status.isPlaying);
  }, []);

  const playTrack = useCallback(async (track: TrackPayload) => {
    setCurrent(track);
    if (!track.previewUrl?.trim()) {
      setIsPlaying(false);
      setPositionMs(0);
      setDurationMs(0);
      return;
    }
    if (current?.id === track.id && soundRef.current) {
      await soundRef.current.playAsync().catch(() => {});
      return;
    }
    const old = soundRef.current;
    if (old) await old.unloadAsync().catch(() => {});
    const created = await Audio.Sound.createAsync(
      { uri: track.previewUrl },
      { shouldPlay: true, progressUpdateIntervalMillis: 250 },
      onStatus,
    );
    soundRef.current = created.sound;
  }, [current?.id, onStatus]);

  const togglePlayPause = useCallback(async () => {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (!st.isLoaded) return;
    if (st.isPlaying) await s.pauseAsync().catch(() => {});
    else await s.playAsync().catch(() => {});
  }, []);

  const seekTo = useCallback(async (ms: number) => {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (!st.isLoaded) return;
    const dur = st.durationMillis ?? 0;
    const next = Math.max(0, Math.min(dur, ms));
    await s.setPositionAsync(next).catch(() => {});
  }, []);

  const skipBy = useCallback(async (deltaMs: number) => {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (!st.isLoaded) return;
    const dur = st.durationMillis ?? 0;
    const next = Math.max(0, Math.min(dur, (st.positionMillis ?? 0) + deltaMs));
    await s.setPositionAsync(next).catch(() => {});
  }, []);

  const setVolume = useCallback(async (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    setVolumeState(v);
    const s = soundRef.current;
    if (!s) return;
    await s.setVolumeAsync(v).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ current, isPlaying, positionMs, durationMs, playTrack, togglePlayPause, seekTo, skipBy, volume, setVolume }),
    [current, durationMs, isPlaying, playTrack, positionMs, seekTo, skipBy, togglePlayPause, volume, setVolume],
  );

  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>;
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used inside MusicPlayerProvider');
  return ctx;
}

