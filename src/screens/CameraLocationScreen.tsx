import { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { insertMoment, updateMomentPhoto, updateMomentLocation } from '../services/sqliteService';
import {
  createMomentPost,
  saveMomentToCollection,
  getUserProfileOnce,
  getUserCollectionsOnce,
  createUserCollection,
  saveContentToUserCollection,
  type UserCollectionDoc,
} from '../services/firestoreService';
import { colors, spacing, spacingVertical, typography, radii, scale } from '../theme';

// Gümüşhane Üniversitesi Müh. Fak.
const FACULTY_COORDS = { latitude: 40.4567, longitude: 39.5 };

type Props = NativeStackScreenProps<AppStackParamList, 'CameraLocation'>;

export function CameraLocationScreen(_props: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [localId, setLocalId] = useState<number | null>(null);

  // Paylaşım paneli
  const [shareText, setShareText] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Koleksiyon modal
  const [collModalVisible, setCollModalVisible] = useState(false);
  const [userCollections, setUserCollections] = useState<UserCollectionDoc[]>([]);
  const [collLoading, setCollLoading] = useState(false);
  const [showNewCollInput, setShowNewCollInput] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [savingColl, setSavingColl] = useState(false);
  const [momentTitle, setMomentTitle] = useState('');

  // -------- Kamera --------

  async function openCamera() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        showMessage({ message: t('camera.permissionDenied'), type: 'danger' });
        return;
      }
    }
    setShowCamera(true);
  }

  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }, { crop: { originX: 0, originY: 0, width: 800, height: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setPhotoUri(manipulated.uri);
      setShowCamera(false);

      const uid = user?.uid ?? 'anonymous';
      if (localId === null) {
        const newId = await insertMoment({ uid, photoUri: manipulated.uri });
        setLocalId(newId);
      } else {
        await updateMomentPhoto(localId, manipulated.uri);
      }
      showMessage({ message: t('camera.photoSaved'), type: 'success' });
    } catch (e) {
      showMessage({ message: 'Fotoğraf çekilemedi: ' + String(e), type: 'danger' });
    }
  }

  // -------- GPS --------

  async function getGpsLocation() {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showMessage({ message: t('camera.locationPermissionDenied'), type: 'danger' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocationCoords(coords);

      const uid = user?.uid ?? 'anonymous';
      if (localId === null) {
        const newId = await insertMoment({ uid, latitude: coords.latitude, longitude: coords.longitude });
        setLocalId(newId);
      } else {
        await updateMomentLocation(localId, coords.latitude, coords.longitude);
      }
      showMessage({ message: t('camera.locationSaved'), type: 'success' });
    } catch (e) {
      showMessage({ message: 'Konum alınamadı: ' + String(e), type: 'danger' });
    } finally {
      setGpsLoading(false);
    }
  }

  // -------- Manuel Harita --------

  const [showMap, setShowMap] = useState(false);
  const [tempPin, setTempPin] = useState<{ latitude: number; longitude: number } | null>(null);

  function openMapPicker() {
    setTempPin(locationCoords);
    setShowMap(true);
  }

  async function confirmMapSelection() {
    if (!tempPin) return;
    setLocationCoords(tempPin);
    setShowMap(false);
    const uid = user?.uid ?? 'anonymous';
    if (localId === null) {
      const newId = await insertMoment({ uid, latitude: tempPin.latitude, longitude: tempPin.longitude });
      setLocalId(newId);
    } else {
      await updateMomentLocation(localId, tempPin.latitude, tempPin.longitude);
    }
    showMessage({ message: t('camera.locationSaved'), type: 'success' });
  }

  // -------- Koleksiyon Modal --------

  async function openCollectionModal() {
    if (!user?.uid) {
      Alert.alert('Giriş Gerekli', 'Koleksiyona kaydetmek için giriş yapın.');
      return;
    }
    if (!photoUri) {
      Alert.alert('Fotoğraf Gerekli', 'Önce fotoğraf çekin.');
      return;
    }
    setCollLoading(true);
    try {
      const cols = await getUserCollectionsOnce(user.uid);
      setUserCollections(cols);
    } finally {
      setCollLoading(false);
    }
    setShowNewCollInput(false);
    setNewCollName('');
    setMomentTitle('');
    setCollModalVisible(true);
  }

  async function saveToCollection(collectionId: string) {
    if (!user?.uid || !photoUri) return;
    setSavingColl(true);
    try {
      // Koleksiyon küçük önizleme için daha da küçük sıkıştırma
      const thumb = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 240 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      const thumbUrl = `data:image/jpeg;base64,${thumb.base64 ?? ''}`;
      await saveContentToUserCollection(user.uid, collectionId, {
        contentType: 'moment',
        title: momentTitle.trim() || `Anı — ${new Date().toLocaleDateString('tr-TR')}`,
        imageUrl: thumbUrl,
      });
      setCollModalVisible(false);
      showMessage({ message: 'Koleksiyona kaydedildi', type: 'success' });
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSavingColl(false);
    }
  }

  async function createAndSave() {
    const name = newCollName.trim();
    if (!name) {
      Alert.alert('İsim Gerekli', 'Koleksiyon ismi girin.');
      return;
    }
    if (!user?.uid || !photoUri) return;
    setSavingColl(true);
    try {
      const collId = await createUserCollection(user.uid, name, 'mixed');
      const thumb2 = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 240 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      const thumbUrl2 = `data:image/jpeg;base64,${thumb2.base64 ?? ''}`;
      await saveContentToUserCollection(user.uid, collId, {
        contentType: 'moment',
        title: momentTitle.trim() || `Anı — ${new Date().toLocaleDateString('tr-TR')}`,
        imageUrl: thumbUrl2,
      });
      setCollModalVisible(false);
      setNewCollName('');
      showMessage({ message: `"${name}" koleksiyonuna kaydedildi`, type: 'success' });
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Oluşturulamadı.');
    } finally {
      setSavingColl(false);
    }
  }

  // -------- Paylaş --------

  async function publishMoment() {
    if (!photoUri) {
      Alert.alert('Fotoğraf Gerekli', 'Paylaşmak için önce fotoğraf çekin.');
      return;
    }
    if (!user?.uid) {
      Alert.alert('Giriş Gerekli', 'Gönderi paylaşmak için giriş yapın.');
      return;
    }
    setPublishing(true);
    try {
      const profile = await getUserProfileOnce(user.uid);
      const displayName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Kullanıcı';

      // Firebase Storage olmadan: fotoğrafı küçültüp base64 olarak Firestore'a göm
      const compressed = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 480 } }],
        { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      const downloadUrl = `data:image/jpeg;base64,${compressed.base64 ?? ''}`;

      const postId = await createMomentPost(
        user.uid,
        { displayName, profileImageUrl: profile?.profileImageUrl, isPrivate: profile?.isPrivate },
        shareText.trim() || 'Bir anı paylaştı.',
        downloadUrl,
        locationCoords ?? undefined,
      );

      await saveMomentToCollection(user.uid, downloadUrl, postId);

      showMessage({ message: 'Anı başarıyla paylaşıldı!', type: 'success' });

      setPhotoUri(null);
      setLocationCoords(null);
      setShareText('');
      setLocalId(null);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Paylaşılamadı.');
    } finally {
      setPublishing(false);
    }
  }

  // -------- Tam ekran harita seçim ekranı --------

  if (showMap) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={() => setShowMap(false)} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={scale(24)} color={colors.accentPurple} />
          </TouchableOpacity>
          <Text style={styles.mapHeaderTitle}>{t('map.title')}</Text>
          <View style={styles.iconBtn} />
        </View>
        <Text style={styles.mapHint}>{t('map.hint')}</Text>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            ...(tempPin ?? FACULTY_COORDS),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={(e) => setTempPin(e.nativeEvent.coordinate)}
        >
          {tempPin && <Marker coordinate={tempPin} pinColor={colors.accentPurple} />}
        </MapView>
        <View style={styles.mapFooter}>
          {tempPin && (
            <Text style={styles.coordsText}>
              {tempPin.latitude.toFixed(5)}, {tempPin.longitude.toFixed(5)}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, !tempPin && styles.btnDisabled]}
            onPress={() => void confirmMapSelection()}
            disabled={!tempPin}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={scale(20)} color={colors.textOnAccent} />
            <Text style={styles.primaryBtnText}>{t('map.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------- Kamera Görünümü --------

  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing}>
          <SafeAreaView style={styles.cameraOverlay} edges={['top', 'bottom']}>
            <View style={styles.cameraTopBar}>
              <TouchableOpacity style={styles.cameraIconBtn} onPress={() => setShowCamera(false)}>
                <Ionicons name="close" size={scale(28)} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cameraIconBtn}
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              >
                <Ionicons name="camera-reverse-outline" size={scale(28)} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.shutterRow}>
              <TouchableOpacity style={styles.shutterBtn} onPress={() => void takePicture()}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  // -------- Ana Ekran --------

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header — no hamburger, back navigation handled by stack */}
      <View style={styles.header}>
        <View style={styles.iconBtn} />
        <Text style={styles.headerTitle}>{t('camera.title')}</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Koleksiyon Seçici Modal */}
      <Modal
        visible={collModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCollModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Koleksiyona Kaydet</Text>
              <TouchableOpacity onPress={() => setCollModalVisible(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={scale(22)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {collLoading ? (
              <ActivityIndicator color={colors.accentPurple} style={{ marginVertical: spacingVertical.lg }} />
            ) : (
              <>
                {/* Moment için özel isim */}
                <View style={styles.momentTitleWrap}>
                  <Text style={styles.momentTitleLabel}>Anı Adı</Text>
                  <TextInput
                    style={styles.newCollInput}
                    placeholder={`Anı — ${new Date().toLocaleDateString('tr-TR')}`}
                    placeholderTextColor={colors.textMuted}
                    value={momentTitle}
                    onChangeText={setMomentTitle}
                    maxLength={60}
                  />
                </View>

                {userCollections.length > 0 && (
                  <FlatList
                    data={userCollections}
                    keyExtractor={(c) => c.id}
                    style={styles.collList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.collItem}
                        onPress={() => void saveToCollection(item.id)}
                        disabled={savingColl}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="albums-outline" size={scale(20)} color={colors.accentPurple} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.collItemName}>{item.name}</Text>
                          <Text style={styles.collItemCount}>{item.itemsCount} öğe</Text>
                        </View>
                        {savingColl ? (
                          <ActivityIndicator size="small" color={colors.accentPurple} />
                        ) : (
                          <Ionicons name="chevron-forward" size={scale(18)} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.collSeparator} />}
                  />
                )}

                {/* Yeni Koleksiyon */}
                {showNewCollInput ? (
                  <View style={styles.newCollForm}>
                    <TextInput
                      style={styles.newCollInput}
                      placeholder="Koleksiyon adı..."
                      placeholderTextColor={colors.textMuted}
                      value={newCollName}
                      onChangeText={setNewCollName}
                      autoFocus
                      maxLength={40}
                    />
                    <TouchableOpacity
                      style={[styles.primaryBtn, savingColl && styles.btnDisabled]}
                      onPress={() => void createAndSave()}
                      disabled={savingColl}
                      activeOpacity={0.85}
                    >
                      {savingColl ? (
                        <ActivityIndicator size="small" color={colors.textOnAccent} />
                      ) : (
                        <Ionicons name="add-circle" size={scale(20)} color={colors.textOnAccent} />
                      )}
                      <Text style={styles.primaryBtnText}>Oluştur ve Kaydet</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.newCollBtn}
                    onPress={() => setShowNewCollInput(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add-circle-outline" size={scale(20)} color={colors.accentPurple} />
                    <Text style={styles.newCollBtnText}>Yeni Koleksiyon Oluştur</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── FOTOĞRAF ── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Ionicons name="camera" size={scale(18)} color={colors.accentPurple} />
              <Text style={styles.sectionTitle}>Fotoğraf</Text>
            </View>

            {photoUri ? (
              <>
                <Image
                  source={{ uri: photoUri }}
                  style={[styles.photoPreview, { width: width - spacing.lg * 2 - spacing.md * 2 }]}
                />
                <View style={styles.photoActionRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { flex: 1 }]}
                    onPress={() => void openCamera()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera-outline" size={scale(18)} color={colors.accentPurple} />
                    <Text style={styles.secondaryBtnText}>{t('camera.updatePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.collSaveBtn]}
                    onPress={() => void openCollectionModal()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="bookmark-outline" size={scale(18)} color={colors.textOnAccent} />
                    <Text style={styles.collSaveBtnText}>Koleksiyon</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => void openCamera()} activeOpacity={0.85}>
                <Ionicons name="camera" size={scale(20)} color={colors.textOnAccent} />
                <Text style={styles.primaryBtnText}>{t('camera.takePhoto')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── PAYLAŞIM PANELİ — fotoğraf çekildikten hemen sonra ── */}
          {photoUri && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Ionicons name="paper-plane" size={scale(18)} color={colors.accentPurple} />
                <Text style={styles.sectionTitle}>Akışa Paylaş</Text>
              </View>
              <Text style={styles.shareHint}>Bu anıyı bir mesajla akışa paylaşın</Text>
              <TextInput
                style={styles.shareInput}
                placeholder="Bir şeyler yaz... (isteğe bağlı)"
                placeholderTextColor={colors.textMuted}
                value={shareText}
                onChangeText={setShareText}
                multiline
                maxLength={280}
              />
              <TouchableOpacity
                style={[styles.publishBtn, publishing && styles.btnDisabled]}
                onPress={() => void publishMoment()}
                disabled={publishing}
                activeOpacity={0.85}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color={colors.textOnAccent} />
                ) : (
                  <Ionicons name="share-social" size={scale(20)} color={colors.textOnAccent} />
                )}
                <Text style={styles.publishBtnText}>
                  {publishing ? 'Paylaşılıyor...' : 'Akışa Paylaş'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── KONUM ── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Ionicons name="location" size={scale(18)} color={colors.accentPurple} />
              <Text style={styles.sectionTitle}>{t('camera.locationPreview')}</Text>
            </View>

            {locationCoords ? (
              <>
                <MapView
                  style={[styles.mapPreview, { width: width - spacing.lg * 2 - spacing.md * 2 }]}
                  region={{
                    ...locationCoords,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker coordinate={locationCoords} pinColor={colors.accentPurple} />
                </MapView>
                <Text style={styles.coordsText}>
                  {locationCoords.latitude.toFixed(5)}, {locationCoords.longitude.toFixed(5)}
                </Text>
              </>
            ) : (
              <View style={[styles.mapPlaceholder, { width: width - spacing.lg * 2 - spacing.md * 2 }]}>
                <Ionicons name="map-outline" size={scale(44)} color={colors.textMuted} />
                <Text style={styles.mapPlaceholderText}>Henüz konum seçilmedi</Text>
                <Text style={styles.mapPlaceholderSub}>Aşağıdan GPS veya manuel seçim yapabilirsiniz</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.locationBtn}
              onPress={() => void openMapPicker()}
              activeOpacity={0.85}
            >
              <Ionicons name="map" size={scale(18)} color={colors.textOnAccent} />
              <Text style={styles.locationBtnText}>{t('camera.manualLocation')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationBtn, styles.locationBtnGps]}
              onPress={() => void getGpsLocation()}
              disabled={gpsLoading}
              activeOpacity={0.85}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color={colors.textOnAccent} />
              ) : (
                <Ionicons name="navigate" size={scale(18)} color={colors.textOnAccent} />
              )}
              <Text style={styles.locationBtnText}>{t('camera.gpsLocation')}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: spacingVertical.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.md,
    minHeight: 56,
    backgroundColor: colors.accentPurpleDeep,
  },
  headerTitle: {
    ...typography.subtitle,
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: { width: scale(40), alignItems: 'center' },

  // Scroll
  scroll: { padding: spacing.lg, gap: spacingVertical.md },

  // Section card
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacingVertical.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacingVertical.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },

  // Photo
  photoPreview: {
    height: 220,
    borderRadius: radii.md,
    resizeMode: 'cover',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accentPurple,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtnText: { ...typography.button, color: colors.textOnAccent },
  secondaryBtn: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.accentPurple,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  secondaryBtnText: { ...typography.button, color: colors.accentPurple },
  btnDisabled: { opacity: 0.45 },

  // Collection save button
  collSaveBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accentPurpleDeep,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  collSaveBtnText: { ...typography.caption, color: colors.textOnAccent, fontWeight: '600' },

  // Location buttons
  locationBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accentPurpleDeep,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  locationBtnGps: { backgroundColor: colors.profileAccent },
  locationBtnText: { ...typography.button, color: colors.textOnAccent },

  // Map
  mapPreview: { height: 160, borderRadius: radii.md },
  mapPlaceholder: {
    height: 160,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingVertical.xs,
    paddingHorizontal: spacing.lg,
  },
  mapPlaceholderText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  mapPlaceholderSub: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  coordsText: { ...typography.meta, color: colors.textSecondary, textAlign: 'center' },

  // Map full-screen header
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapHeaderTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  mapHint: {
    ...typography.meta,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.sm,
  },
  mapFooter: {
    padding: spacing.lg,
    gap: spacingVertical.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Share panel
  shareHint: { ...typography.caption, color: colors.textMuted },
  shareInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.sm,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  publishBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accentPurple,
    borderRadius: radii.md,
    paddingVertical: spacingVertical.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  publishBtnText: { ...typography.button, color: colors.textOnAccent },

  // Camera view
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacingVertical.sm,
  },
  cameraIconBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: scale(20),
    padding: spacing.sm,
  },
  shutterRow: { alignItems: 'center', paddingBottom: spacingVertical.xl },
  shutterBtn: {
    width: scale(76),
    height: scale(76),
    borderRadius: scale(38),
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  shutterInner: {
    width: scale(58),
    height: scale(58),
    borderRadius: scale(29),
    backgroundColor: '#fff',
  },

  // Collection modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacingVertical.xl,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },
  collList: { maxHeight: 280 },
  collItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.sm,
    gap: spacing.sm,
  },
  collItemName: { ...typography.body, color: colors.textPrimary },
  collItemCount: { ...typography.meta, color: colors.textMuted },
  collSeparator: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  newCollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacingVertical.xs,
  },
  newCollBtnText: { ...typography.body, color: colors.accentPurple },
  momentTitleWrap: {
    padding: spacing.md,
    paddingBottom: 0,
    gap: spacingVertical.xs,
  },
  momentTitleLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacingVertical.xs,
  },
  newCollForm: {
    padding: spacing.md,
    gap: spacingVertical.sm,
  },
  newCollInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacingVertical.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
});
