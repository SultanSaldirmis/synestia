# Synestia — Savunma Notları

Bu belge, final projesi savunmasında jüriye açıklanması gereken teknik tercihleri ve gereksinim eşleştirmesini özetler.

---

## 1. MVVM mimarisi (Kontrol listesi madde 16)

**Durum:** Kısmen — resmi MVVM sınıf adlandırması yok; katmanlı mimari + ekran model hook'ları uygulanmış.

**Açıklama:**
- **View:** `src/screens/` ve `src/components/` — yalnızca UI ve kullanıcı etkileşimi.
- **Model / veri:** `src/services/` (`firestoreService.ts`, `authService.ts`, `apiService.ts`, `sqliteService.ts`, `mockApiService.ts`) — Firestore, API, SQLite ve MockAPI erişimi.
- **ViewModel benzeri:** `src/hooks/useProfileScreenModel.ts` (Profil), `src/hooks/useExploreScreenModel.ts` (Keşfet arama/filtre) — abonelik ve arama mantığını ekrandan ayırır.

Diğer ekranlar servis + React hook ile aynı ayrımı korur; **pragmatik katmanlı yapı** tercih edilmiştir.

**Gösterilecek dosyalar:** `ProfileScreen.tsx`, `useProfileScreenModel.ts`, `ExploreScreen.tsx`, `useExploreScreenModel.ts`, `firestoreService.ts`

---

## 2. İçerik puanlama akışı (Kontrol listesi madde 7)

**Durum:** Evet — kitap ve film için doğrudan puanlama + gönderi akışı.

**Açıklama:**
- Kitap ve film için yıldız puanı `CreatePostScreen` içinde verilir; puan `rateCatalogItem()` ile Firestore `bookRatings` / `movieRatings` alt koleksiyonlarına yazılır.
- `ItemDetailScreen` katalog öğesinin **ortalama puanını** gösterir ve giriş yapmış kullanıcıya **doğrudan yıldız puanlama** sunar (`getUserCatalogRating`, `rateCatalogItem`).
- Müzik içeriği Spotify önizlemesi ile dinlenir; yıldız puanı kitap/film kategorisine özgüdür.

**Demo adımları:**
1. Keşfet → kitap veya film ara → detay ekranına git.
2. ItemDetail → yıldız seç → ortalama puanın güncellendiğini göster.
3. Alternatif: Gönderi oluştur → yıldız seç → paylaş.

**Gösterilecek dosyalar:** `CreatePostScreen.tsx`, `ItemDetailScreen.tsx`, `StarRating.tsx`, `firestoreService.ts` (`rateCatalogItem`, `getUserCatalogRating`)

---

## 3. Custom Drawer Navigator (PDF madde 7)

**Durum:** Tam (işlevsel) — `@react-navigation/drawer` kullanılmıyor.

**Açıklama:**
- PDF'de drawer navigator isteniyor; `@react-navigation/drawer` + `react-native-reanimated` Expo Go ortamında çökme riski nedeniyle **custom drawer** uygulandı.
- `DrawerNavigator.tsx`: React Native `Animated` ile kaydırmalı panel, overlay, menü öğeleri.
- Menüden erişilebilir: Ana Uygulama, Anı Kaydet (Kamera + Konum), MockAPI CRUD Testi, Çıkış.
- `RootNavigator.tsx` oturum açıkken `DrawerNavigator` kullanır.

**Gösterilecek dosyalar:** `DrawerNavigator.tsx`, `RootNavigator.tsx`, `CameraLocationScreen.tsx`

---

## 4. SQLite yerel veritabanı (PDF madde 6)

**Durum:** Kısmen — aktif kullanım moment (anı) kayıtlarında.

**Açıklama:**
- `sqliteService.ts`: `moments`, `cached_posts`, `user_settings` tabloları.
- **Aktif:** `CameraLocationScreen` fotoğraf ve GPS konumunu `insertMoment` / `updateMomentPhoto` / `updateMomentLocation` ile SQLite'a yazar; Firestore'a senkron sonrası `firestoreId` güncellenir.
- **Hazır altyapı:** `cached_posts` CRUD fonksiyonları tanımlı; offline akış önbelleği için genişletmeye açık, şu an UI'da kullanılmıyor.

**Demo adımları:**
1. Drawer → Anı Kaydet.
2. Fotoğraf çek veya konum al → SQLite'a kayıt.
3. Kod: `sqliteService.ts` satır 17–25 (`moments` tablosu), `CameraLocationScreen.tsx` insert çağrıları.

---

## 5. Firestore güvenlik kuralları (PDF madde 4)

**Durum:** Repoda tam — Firebase Console'da publish edilmeli.

**Açıklama:**
- `firestore.rules`: Yalnızca `allow read, write: if true` **değil**; sahiplik ve rol bazlı kurallar.
- Kapsanan yapılar: `users/{uid}` profil, `followers`, `following`, `followRequests`, `notifications`, `likes`, `collections`, `posts` (+ alt `likes`/`comments`), `bookRatings`/`movieRatings` (+ `ratings`), `globalContentComments`.
- Post oluşturma: `request.auth.uid == request.resource.data.authorUid`.

**Deploy:**
```bash
cd synestia-main
npx firebase deploy --only firestore:rules,firestore:indexes
```

Proje: `synestia-ddf6a` (`.firebaserc`)

---

## 6. Firestore composite index (ItemDetail yorumları)

**Sorgu:** `collectionGroup('comments')` + `where('contentKey', '==', ...)` + `orderBy('createdAt', 'desc')`

**Index:** `firestore.indexes.json` — `contentKey ASC`, `createdAt DESC`

Index oluşturulmadan ItemDetail'de katalog yorumları boş kalabilir veya konsolda index linki hatası görülebilir.

---

## 7. i18next çoklu dil (PDF madde 9)

- Dil tercihi Redux `uiSlice` + `redux-persist` ile saklanır.
- `LanguageBootstrap` uygulama açılışında i18n ve dayjs locale senkronize eder.
- Tab bar, drawer, formlar, alert metinleri `tr.json` / `en.json` üzerinden `t()` ile çevrilir.
- Profil → Ayarlar → Dil seçimi.

---

## 8. MockAPI CRUD (Ara sınav / README maddesi)

- `mockApiService.ts` — axios ile mockapi.io.
- `CrudTestScreen.tsx` — GET / POST / PUT / DELETE butonları.
- **Erişim:** Drawer menüsü → "MockAPI CRUD Testi".

---

## Hızlı demo sırası (5–7 dk)

1. Giriş / kayıt (form doğrulama + Firebase Auth; girişte RN `Button`).
2. Keşfet → film/kitap/müzik arama → ItemDetail’de doğrudan puan ver.
3. Gönderi oluştur + puan ver → akışta gör.
4. Drawer → Anı Kaydet → kamera + harita + MapPicker.
5. Drawer → MockAPI CRUD Testi (GET/POST/PUT/DELETE).
6. Profil → Dil değiştir (TR/EN).
7. (İsteğe bağlı) Firebase Console → Firestore → Rules sekmesini göster.

---

## Ekip

| Ad Soyad         | Öğrenci no |
| ---------------- | ---------- |
| Buhra ÖZDEMİR    | 2307231003 |
| Dilara TOPAL     | 2307231024 |
| Sultan SALDIRMIŞ | 2307231007 |
