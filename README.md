# Synestia

**Synestia**, müzik, film ve kitap içeriklerini tek çatı altında keşfetmeyi ve paylaşmayı hedefleyen sosyal bir mobil uygulamadır. Bu depo **Gümüşhane Üniversitesi**, **Yazılım Mühendisliği** bölümü **Android Uygulama Geliştirme** dersi ara sınav / proje teslimi için hazırlanmıştır.

---

## Ekip üyeleri

| Ad Soyad         | Öğrenci numarası |
| ---------------- | ---------------- |
| Buhra ÖZDEMİR    | 2307231003       |
| Dilara TOPAL     | 2307231024       |
| Sultan SALDIRMIŞ | 2307231007       |

---

## Proje yapısı (klasörler)

| Yol | Açıklama |
| --- | -------- |
| `App.tsx` | Kök bileşen: tema, `SafeAreaProvider`, navigasyon kabuğu |
| `src/screens/` | Uygulama ekranları (View katmanı) |
| `src/components/` | Yeniden kullanılabilir UI bileşenleri |
| `src/navigation/` | `RootNavigator`, `AuthNavigator`, `AppNavigator`, `MainTabNavigator`, rota tipleri (`types.ts`) |
| `src/services/` | Firebase / Firestore (`firestoreService.ts`, `authService.ts`), MockAPI + axios (`mockApiService.ts`) |
| `src/context/` | `AuthProvider`, müzik oynatıcı bağlamı |
| `src/theme/` | Renkler, tipografi, `scale` / `verticalScale` (`pixelScale.ts`) |
| `src/data/` | Mock veri ve tipler (`mockData.ts`) |
| `src/config/` | Firebase yapılandırma yardımcıları |
| `src/utils/` | Yardımcı fonksiyonlar (profil görseli, zaman formatı, vb.) |
| `src/assets/` | Görseller |
| `env.example` | `.env` için şablon |

---

## Navigasyon özeti

- **Kimlik doğrulanmamış:** `AuthNavigator` → `Login`, `Register`.
- **Kimlik doğrulanmış:** `AppNavigator` (native stack) içinde önce `MainTabs` (alt sekme), üzerine stack ekranları (`Detail`, `CreatePost`, `EditProfile`, `FollowList`, `UserProfile`, `CollectionDetail`, `MusicPlayer`, `ItemDetail`, `CrudTest`, …).
- **Sekmeler:** `MainTabNavigator` → `Home` (Akış), `Explore` (Keşfet), `Profile`, `Notifications`.

Stack’e hem sekmelerden dolaylı hem de ekrandaki **Pressable / navigasyon** ile geçilir. Örnek: Keşfet’ten `Detail`’e parametreli geçiş (`ExploreScreen.tsx`), Profil’den `FollowList` (`ProfileScreen.tsx`).

---

## Ekranlar: dosya ve işlev

| Ekran (rota adı) | Kaynak dosya | Ne yapar? |
| ---------------- | ------------ | --------- |
| Giriş | `src/screens/LoginScreen.tsx` | E-posta / şifre girişi, `ImageBackground`, Firebase yapılandırma uyarısı |
| Kayıt | `src/screens/RegisterScreen.tsx` | Yeni kullanıcı, Firestore kullanıcı belgesi |
| Akış | `src/screens/HomeScreen.tsx` | Gönderi listesi (`FlatList`), beğeni / yorum / paylaşım, `CreatePost`’a geçiş |
| Keşfet | `src/screens/ExploreScreen.tsx` | Arama, filtre, sonuç listesi; `Detail` / `UserProfile` / `ItemDetail`’e geçiş |
| Detay (gönderi) | `src/screens/DetailScreen.tsx` | `useRoute` ile gelen parametreler; yorumlar, beğeni, silme (yetkiye bağlı) |
| Gönderi oluştur | `src/screens/CreatePostScreen.tsx` | Firestore’a akış gönderisi (`createFeedPost`) |
| Profil (oturum) | `src/screens/ProfileScreen.tsx` | Avatar, istatistikler, gönderi / koleksiyon sekmeleri, ayarlar modalı, çıkış |
| Başka kullanıcı profili | `src/screens/UserProfileScreen.tsx` | `userId` parametresiyle profil, takip listelerine geçiş |
| Profili düzenle | `src/screens/EditProfileScreen.tsx` | Bio, profil görseli (Base64) |
| Takip / koleksiyon listesi | `src/screens/FollowListScreen.tsx` | `route.params`: `mode`, `userId` |
| Bildirimler | `src/screens/NotificationsScreen.tsx` | Bildirim listesi / boş durum |
| Koleksiyon detayı | `src/screens/CollectionDetailScreen.tsx` | Tek koleksiyon ve öğeler |
| Müzik oynatıcı | `src/screens/MusicPlayerScreen.tsx` | Oynatıcı UI, detaya dönüş |
| Öğe detayı (katalog) | `src/screens/ItemDetailScreen.tsx` | Katalog öğesi detayı |
| **CRUD test (MockAPI)** | `src/screens/CrudTestScreen.tsx` | axios ile GET/POST/PUT/DELETE tetikleyen butonlar (ders maddesi) |

Stack tanımları: `src/navigation/AppNavigator.tsx`. Sekmeler: `src/navigation/MainTabNavigator.tsx`. Oturum aç / açma: `src/navigation/RootNavigator.tsx`.

---

## Yeniden kullanılabilir bileşenler (`src/components/`)

| Bileşen | Dosya | Kısa açıklama |
| ------- | ----- | ------------- |
| `PostCard` | `PostCard.tsx` | Akış kartı; gönderi prop’ları, menü / kaydetme için `Modal` |
| `ScreenSafeArea` | `ScreenSafeArea.tsx` | `SafeAreaView` (safe-area-context) sarmalayıcı |
| `SearchBar` | `SearchBar.tsx` | Arama alanı + ikon |
| `FilterChip` | `FilterChip.tsx` | Tür filtresi (`TouchableOpacity`) |
| `SectionHeader` | `SectionHeader.tsx` | Bölüm başlığı, isteğe bağlı aksiyon |
| `NeonButton` | `NeonButton.tsx` | Vurgulu düğme |
| `CachedImage` | `CachedImage.tsx` | `Image` ile önbellekli görüntü |
| `StarRating` | `StarRating.tsx` | Yıldız derecelendirme |
| `ProfileImageZoomModal` | `ProfileImageZoomModal.tsx` | Profil fotoğrafı yakınlaştırma |

**Parametre alan bileşen örneği:** `PostCard` — prop tipi `PostCardProps` (`src/components/PostCard.tsx`, yaklaşık satır 37); bileşen fonksiyonu yaklaşık satır 94.

---

## Ara sınav PDF’si (“Puanlandırma Esasları”) — kodda karşılık gelen örnekler

Aşağıdaki tabloda her madde için **tek bir somut örnek** (dosya + satır) ve **kısa açıklama** verilmiştir. Satır numaraları depodaki güncel sürüme göredir; küçük düzenlemelerde bir iki satır kayabilir.

| PDF gereksinimi | Örnek konum | Ne işe yarıyor? |
| ----------------- | ----------- | ---------------- |
| **Text** | `LoginScreen.tsx` ~80 | Logo / slogan metni |
| **SafeAreaView** (`react-native-safe-area-context`) | `ScreenSafeArea.tsx` ~3, ~17 | Kenar boşlukları güvenli alan |
| **StyleSheet** (`margin`, `padding`, `flex`, `flexDirection`, `justifyContent`, `alignItems`, `position`) | `LoginScreen.tsx` ~135–218 | Örn. `flex`, `paddingHorizontal`, `justifyContent`, `position: 'relative'`, `marginBottom` |
| **Image** | `HomeScreen.tsx` ~452 | Marka / görsel |
| **ImageBackground** | `LoginScreen.tsx` ~73 | Giriş arka planı |
| **Button** (RN `Button`) | `LoginScreen.tsx` ~116 | “Giriş Yap” yerel düğmesi (ders maddesi) |
| **Pressable** | `CrudTestScreen.tsx` ~167 | “Paylaş” / form aksiyonları |
| **TouchableOpacity** | `FilterChip.tsx` ~13 | Chip dokunma alanı |
| **ScrollView** | `ExploreScreen.tsx` ~167 | Üst bölüm kaydırılabilir içerik |
| **FlatList** | `HomeScreen.tsx` ~455 | Akış gönderi listesi |
| **Platform** | `HomeScreen.tsx` ~70 | Android / iOS gecikme farkı |
| **ActivityIndicator** | `RootNavigator.tsx` ~14 | Oturum hazır olurken yükleme |
| **View** | `RootNavigator.tsx` ~13 | Splash konteyneri |
| **Dimensions** | `HomeScreen.tsx` ~49 | Pencere genişliği |
| **scale** (`react-native-size-matters` üzerinden) | `pixelScale.ts` ~10–12 | Yatay ölçek (yuvarlanmış) |
| **verticalScale** | `pixelScale.ts` ~14–16 | Dikey ölçek (yuvarlanmış) |
| **useState** | `LoginScreen.tsx` ~26–29 | E-posta, şifre, hata durumu |
| **Modal** | `PostCard.tsx` ~380 | Gönderi menüsü |
| **En az 3 Expo ikonu** | `MainTabNavigator.tsx` ~94, ~104, ~114 | `Ionicons`, `MaterialCommunityIcons`, `FontAwesome` |
| **TextInput** | `LoginScreen.tsx` ~94 | E-posta alanı |
| **Tab Navigator** + seçili / seçili olmayan renk + ikon | `MainTabNavigator.tsx` ~66–86, ~88–133 | `tabBarActiveTintColor` / `tabBarInactiveTintColor`, sekme ikonları |
| **Stack Navigator** + **parametre** + **useRoute** | Geçiş: `ExploreScreen.tsx` ~153; alım: `DetailScreen.tsx` ~46, gösterim: ~338 | `navigate('Detail', { … })`; `useRoute<DetailRoute>()`; başlık `{title}` |
| **mockapi + axios + CRUD butonları** | `mockApiService.ts` ~1, ~54 (axios); `CrudTestScreen.tsx` ~41, ~88, ~121 (liste/oluştur/sil), ~167–172, ~187–191 (UI) | MockAPI.io tabanı, `axios.request`; ekranda yenile / paylaş / düzenle / sil |
| **En az 5 bileşen/ekran** | Örn. ekranlar: `HomeScreen`, `ExploreScreen`, `ProfileScreen`, `DetailScreen`, `CrudTestScreen` + `src/components` altındaki bileşenler | Ders minimumu aşılır |
| **En az bir bileşen parametre alıyor** | `PostCard.tsx` ~37, ~94 | `PostCardProps` ile gönderi verisi |

### PDF’de yer alan, kod deposundan doğrulanamayan maddeler

- **“Proje önerisindeki gereklilikleri tam sağlama” (12 puan):** Öneri metni repoda yok; ekip içi kontrol listesi ile doğrulanmalı.
- **Öğretim elemanı onayı, geç gönderim:** İş ve süreç kriterleri; depo tek başına kanıtlamaz.

### Proje adı ve isimlendirme (PDF uyarıları)

- Uygulama adı **Synestia**; konu (müzik / film / kitap sosyal akış) ile doğrudan çakışan jenerik bir isim değil (ör. “FilmUygulaması” gibi değil). Kesin puan yorumu öğretim üyesine aittir.
- Ekran ve bileşen adları (`ProfileScreen`, `PostCard`, `CrudTestScreen` vb.) işlevleriyle uyumludur.

---

## Teknoloji özeti

- **Expo** (SDK 54), **React Native**, **TypeScript**
- **Firebase Auth** + **Cloud Firestore**
- **@react-navigation/native** (native stack + bottom tabs)
- **axios** + **mockapi.io** (`src/services/mockApiService.ts`)
- **react-native-safe-area-context**, **react-native-size-matters**, **@expo/vector-icons**

---

## Kurulum ve çalıştırma

1. Depoyu klonlayın, proje kökünde `npm install` çalıştırın.
2. `env.example` dosyasını `.env` olarak kopyalayıp Firebase değişkenlerini doldurun.
3. `npx expo start` ile projeyi başlatın; **Expo Go** veya emülatör kullanın.

`CrudTest` ekranı stack rotası olarak tanımlıdır; **Drawer menüsünden** "MockAPI CRUD Testi" ile açılabilir. MockAPI çağrıları için internet erişimi gerekir.

Savunma ve gereksinim eşleştirmesi için bkz. [`SAVUNMA_NOTLARI.md`](SAVUNMA_NOTLARI.md).

---

## Lisans ve akademik kullanım

Bu depo ilgili üniversite dersi kapsamında teslim amaçlıdır. Kaynak ve ekip atfı korunmalıdır.
