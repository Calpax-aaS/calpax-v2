# Pw — Weather minimum (design spec)

**Date:** 2026-04-12
**Phase:** Pw of the Calpax v2 roadmap (see `2026-04-09-calpax-roadmap-decomposition.md`)
**Goal:** Provide weather data for flight decision-making — wind at 4 altitudes, OAT, cloud cover, precipitation — integrated into the vol detail page and the fiche de vol PDF. Visual go/no-go indicators (no blocking). Configurable wind threshold per exploitant.
**Status:** design agreed during brainstorming session on 2026-04-12.

---

## 1. Decisions from brainstorming

| Sujet          | Choix                                                                    | Raison                                                   |
| -------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| Donnees meteo  | Vent (vitesse+direction) 4 altitudes + OAT + nebulosite + precipitations | Couverture complete pour decision go/no-go               |
| Granularite    | Creneau + 2h avant/apres (5-7 heures)                                    | Voir la tendance, anticiper un decalage                  |
| Go/no-go       | Indicateur visuel vert/orange/rouge, pas de blocage                      | Responsabilite CDB, le logiciel aide mais ne decide pas  |
| Lieu prevision | Coordonnees GPS dans les parametres exploitant                           | Olivier decolle quasi-toujours de la meme zone           |
| Cache          | Table WeatherCache en base                                               | Permet archivage futur (M4), evite les appels redondants |
| PDF page meteo | Tableau vent/heure/altitude + bandeau resume go/no-go                    | Le pilote voit d'un coup d'oeil avant le vol             |

---

## 2. Success criteria (Pw done)

- [ ] Exploitant settings: latitude, longitude, seuil vent (kt) configurables
- [ ] Open-Meteo API integration: fetch wind (10m, 80m, 120m, 180m), wind direction, OAT, cloud cover, precipitation probability
- [ ] WeatherCache table: store fetched data, 30-min expiration, re-fetch on expiry or manual refresh
- [ ] Vol detail page: meteo section with colored wind table + resume banner
- [ ] Color classification: vert (< seuil), orange (seuil to seuil+5), rouge (> seuil+5)
- [ ] Refresh button on vol detail page
- [ ] Fiche de vol PDF page 3: real weather data replaces placeholder
- [ ] PDF resume banner: max wind + go/no-go color indicator
- [ ] Graceful handling when no GPS coordinates configured (message in UI + empty page in PDF)
- [ ] All existing tests still pass
- [ ] Deployed and verified on calpax.fr

---

## 3. Schema changes

### 3.1 Exploitant (extend existing model)

Add to the Exploitant model:

```prisma
  meteoLatitude   Float?
  meteoLongitude  Float?
  meteoSeuilVent  Int?     @default(15)  // wind threshold in knots
```

### 3.2 WeatherCache (new model)

```prisma
model WeatherCache {
  id             String   @id @default(cuid())
  exploitantId   String
  exploitant     Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)
  latitude       Float
  longitude      Float
  date           DateTime @db.Date
  data           Json     // full Open-Meteo API response (hourly data)
  fetchedAt      DateTime @default(now())

  @@unique([exploitantId, date])
  @@index([exploitantId])
  @@map("weather_cache")
}
```

Add relation to Exploitant: `weatherCache WeatherCache[]`

### 3.3 TENANT_FILTER

Add `WeatherCache: 'exploitantId'` to the tenant filter.

---

## 4. Open-Meteo API integration

### 4.1 API endpoint

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &hourly=wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,temperature_2m,cloud_cover,precipitation_probability
  &wind_speed_unit=kn
  &start_date={YYYY-MM-DD}
  &end_date={YYYY-MM-DD}
```

Note: Open-Meteo provides wind at 10m, 80m, 120m, 180m — not 300m. We use 180m as the highest altitude. The roadmap mentioned 300m but this is the closest available.

### 4.2 Response shape (relevant fields)

```ts
type OpenMeteoResponse = {
  hourly: {
    time: string[] // ISO timestamps
    wind_speed_10m: number[] // knots
    wind_direction_10m: number[] // degrees
    wind_speed_80m: number[]
    wind_direction_80m: number[]
    wind_speed_120m: number[]
    wind_direction_120m: number[]
    wind_speed_180m: number[]
    wind_direction_180m: number[]
    temperature_2m: number[] // Celsius
    cloud_cover: number[] // percentage 0-100
    precipitation_probability: number[] // percentage 0-100
  }
}
```

### 4.3 Client module

```ts
// lib/weather/open-meteo.ts

type FetchWeatherParams = {
  latitude: number
  longitude: number
  date: string // YYYY-MM-DD
}

async function fetchWeatherFromAPI(params: FetchWeatherParams): Promise<OpenMeteoResponse>
```

Pure fetch function. No caching logic — that's in the cache module.

---

## 5. Cache layer

```ts
// lib/weather/cache.ts

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

type GetWeatherParams = {
  exploitantId: string
  latitude: number
  longitude: number
  date: string // YYYY-MM-DD
  forceRefresh?: boolean
}

async function getWeather(params: GetWeatherParams): Promise<OpenMeteoResponse>
// 1. Check WeatherCache for (exploitantId, date)
// 2. If exists and fetchedAt < 30 min ago and !forceRefresh -> return cached data
// 3. Otherwise fetch from Open-Meteo, upsert into WeatherCache, return data
```

---

## 6. Weather data types and classification

```ts
// lib/weather/types.ts

type WindReading = {
  speed: number // knots
  direction: number // degrees
}

type HourlyWeather = {
  time: string // "06:00", "07:00", etc.
  wind10m: WindReading
  wind80m: WindReading
  wind120m: WindReading
  wind180m: WindReading
  temperature: number // Celsius
  cloudCover: number // percentage
  precipitationProb: number // percentage
}

type WeatherForecast = {
  date: string
  hours: HourlyWeather[]
}

// lib/weather/classify.ts

type WindLevel = 'OK' | 'WARNING' | 'DANGER'

function classifyWind(speedKt: number, seuilKt: number): WindLevel
// OK: speed < seuil
// WARNING: seuil <= speed <= seuil + 5
// DANGER: speed > seuil + 5

type WeatherSummary = {
  maxWindKt: number
  maxWindAltitude: string
  level: WindLevel
  avgTemperature: number
}

function summarizeWeather(hours: HourlyWeather[], seuilKt: number): WeatherSummary
```

### 6.1 Extract relevant hours

```ts
// lib/weather/extract.ts

function extractCreneauHours(forecast: WeatherForecast, creneau: 'MATIN' | 'SOIR'): HourlyWeather[]
// MATIN: hours 5-10 (5h, 6h, 7h, 8h, 9h, 10h)
// SOIR: hours 17-22 (17h, 18h, 19h, 20h, 21h, 22h)
```

Parse the OpenMeteoResponse into a WeatherForecast, then extract the relevant hours for the vol's creneau.

---

## 7. UI integration

### 7.1 Vol detail page — meteo section

New Card between "Passagers" and "Devis de masse" on `app/[locale]/(app)/vols/[id]/page.tsx`:

**Banner at top of card:**

- Background color: green/orange/red based on `WeatherSummary.level`
- Text: "Vent max: {maxWindKt} kt a {altitude}" + temperature moyenne
- If no GPS configured: "Configurez les coordonnees GPS dans Parametres"

**Table below:**

- Columns: Heure | Vent 10m | Vent 80m | Vent 120m | Vent 180m | OAT | Nebulosite | Precip.
- One row per hour of the creneau window
- Wind cells show "{speed} kt {direction}°" with background color (vert/orange/rouge)
- OAT in Celsius
- Cloud cover as percentage
- Precipitation probability as percentage

**Refresh button:** "Rafraichir meteo" — server action that calls getWeather with forceRefresh=true

### 7.2 Parametres exploitant — new fields

Add to the settings page (`app/[locale]/(app)/settings/page.tsx`):

New section "Meteo" with:

- Latitude (number input, 6 decimals, e.g. 47.0833)
- Longitude (number input, 6 decimals, e.g. 5.4833)
- Seuil vent (number input, kt, default 15)

Seed Dole coordinates for Cameron Balloons: lat 47.0833, lon 5.4833.

### 7.3 Sidebar

No sidebar change needed — meteo is integrated into existing vol detail page.

---

## 8. PDF integration

### 8.1 Replace page 3 placeholder

In `lib/pdf/fiche-vol.tsx`, replace the meteo placeholder page with real data.

**Add to FicheVolData type:**

```ts
  meteo?: {
    hours: HourlyWeather[]
    summary: WeatherSummary
    seuilVent: number
  }
```

**Page 3 layout:**

1. **Banner:** "METEO — {date} — {creneau}" + feu vert/orange/rouge + "Vent max: {X} kt a {altitude}" + "OAT moy: {Y}°C"

2. **Table:** Same as UI — columns: Heure, Vent 10m (kt/dir), Vent 80m, Vent 120m, Vent 180m, OAT, Nebulosite, Precip. Rows colored by wind threshold.

3. **Footer:** "Source: Open-Meteo.com — Prevision du {fetchedAt}"

If no meteo data available (no GPS configured), show: "Donnees meteo non disponibles — coordonnees GPS non configurees."

### 8.2 PDF download route update

In `app/api/vols/[id]/fiche-vol/route.ts`, fetch weather data and pass it to `generateFicheVolBuffer`.

---

## 9. Server action for refresh

```ts
// lib/actions/weather.ts

export async function refreshWeather(volId: string, locale: string): Promise<{ error?: string }>
// 1. Fetch vol (date) + exploitant (lat/lon)
// 2. Call getWeather with forceRefresh=true
// 3. revalidatePath for the vol detail page
```

---

## 10. i18n

Add to `messages/fr.json` and `messages/en.json`:

```json
"meteo": {
  "title": "Meteo",
  "refresh": "Rafraichir meteo",
  "noGps": "Configurez les coordonnees GPS dans Parametres",
  "noData": "Donnees meteo non disponibles",
  "maxWind": "Vent max",
  "avgTemp": "OAT moy",
  "source": "Source: Open-Meteo.com",
  "fields": {
    "heure": "Heure",
    "vent10m": "Vent 10m",
    "vent80m": "Vent 80m",
    "vent120m": "Vent 120m",
    "vent180m": "Vent 180m",
    "temperature": "OAT",
    "cloudCover": "Nebulosite",
    "precipitation": "Precip."
  },
  "level": {
    "OK": "OK",
    "WARNING": "Prudence",
    "DANGER": "Defavorable"
  },
  "settings": {
    "title": "Meteo",
    "latitude": "Latitude",
    "longitude": "Longitude",
    "seuilVent": "Seuil vent (kt)",
    "seuilHelp": "Vent au-dessus duquel l'indicateur passe en orange"
  }
}
```

---

## 11. Tests

### Unit tests (TDD)

- `classifyWind`: OK/WARNING/DANGER thresholds
- `summarizeWeather`: max wind, average temperature
- `extractCreneauHours`: correct hour ranges for MATIN/SOIR
- Open-Meteo response parsing into WeatherForecast type

### Integration tests

- WeatherCache tenant isolation
- Cache expiration (fetch after 30 min)

---

## 12. Explicitly NOT in Pw

- METAR/TAF decoded (M4)
- Radar precipitation real-time (M4)
- Aggregated go/no-go table per vol (M4 — Pw shows per-hour indicators only)
- Automatic weather alerts (M4)
- Weather archive per vol audit (structure ready via WeatherCache but no UI)
- Wind at 300m AGL (not available from Open-Meteo, using 180m)
- Geocoding from lieu decollage text (later — use GPS coords instead)

---

## 13. Dependencies

| Component                    | Usage in Pw                                               |
| ---------------------------- | --------------------------------------------------------- |
| `Exploitant` model           | New fields: meteoLatitude, meteoLongitude, meteoSeuilVent |
| `lib/db/tenant-extension.ts` | Add WeatherCache to TENANT_FILTER                         |
| Vol detail page              | New meteo section                                         |
| Fiche de vol PDF             | Replace page 3 placeholder                                |
| Settings page                | New meteo fields                                          |
| Seed data                    | Add Dole GPS coordinates for Cameron Balloons             |

---

## 14. Next step

Run the `writing-plans` skill to produce the implementation plan.
