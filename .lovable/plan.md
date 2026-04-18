
## Drive Together — Live tracking pe hartă cu prietenii

Aplicație nativă mobilă (Capacitor) care arată în timp real pe hartă unde te afli tu și prietenii din grupul tău și cu ce viteză conduceți.

### Stack
- **Frontend**: React + Vite + Tailwind, împachetat cu **Capacitor** pentru iOS/Android
- **Hartă**: **Mapbox GL JS** (token public introdus în aplicație)
- **Backend**: **Lovable Cloud** (auth anonimă + bază de date realtime + storage)
- **Geolocație**: `@capacitor/geolocation` pentru tracking în background pe telefon

### Flux utilizator
1. **Ecran de start**: alegi un nume (nickname) + alegi avatar/culoare
2. **Camere (grupuri)**:
   - „Creează cameră" → primești un cod scurt (ex. `BLUE-FOX-42`) pe care îl partajezi
   - „Intră în cameră" → introduci cod și intri direct
3. **Ecran principal — Hartă live**:
   - Hartă Mapbox fullscreen cu pinii tuturor membrilor activi
   - Fiecare pin = culoarea + nickname-ul + viteza curentă (km/h) afișată sub pin
   - Pinul tău e centrat, butoane: „Centrează pe mine", „Vezi tot grupul"
   - Card jos cu lista membrilor și viteza fiecăruia, sortat descrescător
   - Buton mare **Start / Stop drive** — pornește/oprește trimiterea poziției
4. **Istoric trasee**:
   - Listă cu toate cursele tale (data, durata, distanța, viteza max, viteza medie)
   - Tap pe o cursă → vezi traseul desenat pe hartă

### Funcționalități cheie
- **Live tracking**: poziția + viteza se actualizează la ~2 secunde, vizibile instant la toți membrii camerei (realtime subscriptions)
- **Calcul viteză**: din GPS (`coords.speed`) cu fallback pe distanță/timp între puncte
- **Status șofer**: pin „activ" (conduce) vs „inactiv" (a oprit tracking-ul) — gri/colorat
- **Tracking în background**: continuă să trimită poziția chiar dacă telefonul e blocat (necesar pe drum)
- **Curățare automată**: pozițiile mai vechi de X minute dispar dacă userul nu mai e activ
- **Istoric persistat**: fiecare „drive" e salvat ca traseu (lista de puncte) când apeși Stop

### Date stocate
- `rooms` — codul camerei, data creării
- `members` — cine e în ce cameră (nickname, culoare, ultima poziție, ultima viteză, timestamp)
- `trips` — cursele tale salvate (start, stop, distanță, viteză max/medie)
- `trip_points` — punctele GPS ale fiecărei curse (pentru desenare traseu)

### Design
- Tematică inspirată din apps de navigație: dark mode by default, accente vibrante (verde pentru viteză normală, portocaliu/roșu la viteze mari)
- UI minimal pe ecranul hărții — totul trebuie citit dintr-o privire
- Carduri rotunjite, tipografie mare pentru viteză (font cifre clare)

### Ce vei primi după aprobare
- Aplicația web funcțională în preview (poți testa pe desktop & telefon prin browser)
- Configurare completă Capacitor pentru export pe iOS/Android
- Instrucțiuni clare despre ce trebuie să faci tu: token Mapbox (gratuit), export pe GitHub, `npx cap add ios/android` pentru build nativ

### Ce trebuie să-mi dai pe parcurs
- Un **token public Mapbox** (îl iei gratuit de pe mapbox.com — îți spun exact unde)
- Pentru testarea reală în mașină → export pe GitHub și rulare locală cu Xcode/Android Studio (tracking-ul în background nu funcționează în preview-ul din browser)
