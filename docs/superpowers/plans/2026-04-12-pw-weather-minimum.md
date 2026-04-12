# Pw — Weather Minimum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Open-Meteo weather data into the vol detail page and fiche de vol PDF — wind at 4 altitudes, OAT, cloud cover, precipitation, with colored go/no-go indicators.

**Architecture:** Open-Meteo API client fetches hourly data, cached in a WeatherCache table (30-min TTL). Pure functions parse, extract creneau hours, and classify wind levels. Weather section added to vol detail page and replaces PDF page 3 placeholder. GPS coordinates and wind threshold configured in exploitant settings.

**Tech Stack:** Open-Meteo API (free, no key), Prisma, Next.js server components + server actions, @react-pdf/renderer, next-intl.

**Spec:** `docs/superpowers/specs/2026-04-12-pw-weather-minimum-design.md`

---

## File Map

| File                                    | Responsibility                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `prisma/schema.prisma`                  | Add WeatherCache model + Exploitant meteo fields                                     |
| `lib/db/tenant-extension.ts`            | Add WeatherCache to TENANT_FILTER                                                    |
| `tests/integration/helpers.ts`          | Update resetDb                                                                       |
| `lib/weather/types.ts`                  | Shared types: WindReading, HourlyWeather, WeatherForecast, WindLevel, WeatherSummary |
| `lib/weather/open-meteo.ts`             | Fetch from Open-Meteo API                                                            |
| `lib/weather/parse.ts`                  | Parse OpenMeteoResponse into WeatherForecast                                         |
| `lib/weather/extract.ts`                | Extract creneau hours from forecast                                                  |
| `lib/weather/classify.ts`               | classifyWind + summarizeWeather                                                      |
| `lib/weather/cache.ts`                  | getWeather with DB cache + TTL                                                       |
| `lib/actions/weather.ts`                | refreshWeather server action                                                         |
| `lib/schemas/exploitant.ts`             | Add meteo fields to schema                                                           |
| `lib/actions/exploitant.ts`             | Handle meteo fields in update                                                        |
| `app/[locale]/(app)/settings/page.tsx`  | Add meteo section to settings                                                        |
| `app/[locale]/(app)/vols/[id]/page.tsx` | Add meteo section to vol detail                                                      |
| `components/weather-table.tsx`          | Reusable weather table component                                                     |
| `lib/pdf/fiche-vol.tsx`                 | Replace page 3 placeholder with real meteo                                           |
| `app/api/vols/[id]/fiche-vol/route.ts`  | Pass meteo data to PDF generator                                                     |
| `messages/fr.json`                      | French translations for meteo                                                        |
| `messages/en.json`                      | English translations                                                                 |
| `prisma/seed.ts`                        | Add Dole GPS coords to Cameron Balloons                                              |
| `tests/unit/weather-classify.spec.ts`   | classifyWind + summarizeWeather tests                                                |
| `tests/unit/weather-extract.spec.ts`    | extractCreneauHours tests                                                            |
| `tests/unit/weather-parse.spec.ts`      | Parse OpenMeteo response tests                                                       |

---

### Task 1: Prisma schema — WeatherCache + Exploitant meteo fields

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add meteo fields to Exploitant**

```prisma
  meteoLatitude   Float?
  meteoLongitude  Float?
  meteoSeuilVent  Int?     @default(15)
```

- [ ] **Step 2: Add WeatherCache model**

```prisma
model WeatherCache {
  id             String     @id @default(cuid())
  exploitantId   String
  exploitant     Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)
  latitude       Float
  longitude      Float
  date           DateTime   @db.Date
  data           Json
  fetchedAt      DateTime   @default(now())

  @@unique([exploitantId, date])
  @@index([exploitantId])
  @@map("weather_cache")
}
```

Add relation to Exploitant: `weatherCache WeatherCache[]`

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name pw-weather-cache
npx prisma generate
```

- [ ] **Step 4: Add to TENANT_FILTER and resetDb**

In `lib/db/tenant-extension.ts`, add `WeatherCache: 'exploitantId'`.

In `tests/integration/helpers.ts`, add `await basePrisma.weatherCache.deleteMany({})` before vol.deleteMany.

- [ ] **Step 5: Commit**

```bash
git add prisma/ lib/db/tenant-extension.ts tests/integration/helpers.ts
git commit -m "feat(prisma): pw schema — weatherCache model + exploitant meteo fields"
```

---

### Task 2: Weather types + classify (TDD)

**Files:**

- Create: `lib/weather/types.ts`
- Create: `lib/weather/classify.ts`
- Create: `tests/unit/weather-classify.spec.ts`

- [ ] **Step 1: Create types**

Create `lib/weather/types.ts`:

```ts
export type WindReading = {
  speed: number // knots
  direction: number // degrees
}

export type HourlyWeather = {
  time: string // "06:00"
  wind10m: WindReading
  wind80m: WindReading
  wind120m: WindReading
  wind180m: WindReading
  temperature: number // Celsius
  cloudCover: number // percentage 0-100
  precipitationProb: number // percentage 0-100
}

export type WeatherForecast = {
  date: string // YYYY-MM-DD
  hours: HourlyWeather[]
}

export type WindLevel = 'OK' | 'WARNING' | 'DANGER'

export type WeatherSummary = {
  maxWindKt: number
  maxWindAltitude: string
  level: WindLevel
  avgTemperature: number
}
```

- [ ] **Step 2: Write failing tests**

Create `tests/unit/weather-classify.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { classifyWind, summarizeWeather } from '@/lib/weather/classify'
import type { HourlyWeather } from '@/lib/weather/types'

describe('classifyWind', () => {
  it('returns OK when speed is below threshold', () => {
    expect(classifyWind(10, 15)).toBe('OK')
  })

  it('returns OK when speed equals threshold minus 1', () => {
    expect(classifyWind(14, 15)).toBe('OK')
  })

  it('returns WARNING when speed equals threshold', () => {
    expect(classifyWind(15, 15)).toBe('WARNING')
  })

  it('returns WARNING when speed is between threshold and threshold+5', () => {
    expect(classifyWind(18, 15)).toBe('WARNING')
  })

  it('returns WARNING when speed equals threshold+5', () => {
    expect(classifyWind(20, 15)).toBe('WARNING')
  })

  it('returns DANGER when speed exceeds threshold+5', () => {
    expect(classifyWind(21, 15)).toBe('DANGER')
  })

  it('returns OK for zero wind', () => {
    expect(classifyWind(0, 15)).toBe('OK')
  })
})

function makeHour(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    time: '06:00',
    wind10m: { speed: 5, direction: 180 },
    wind80m: { speed: 8, direction: 200 },
    wind120m: { speed: 10, direction: 210 },
    wind180m: { speed: 12, direction: 220 },
    temperature: 15,
    cloudCover: 30,
    precipitationProb: 10,
    ...overrides,
  }
}

describe('summarizeWeather', () => {
  it('finds max wind across all altitudes and hours', () => {
    const hours = [
      makeHour({ wind180m: { speed: 18, direction: 0 } }),
      makeHour({ time: '07:00', wind120m: { speed: 22, direction: 0 } }),
    ]
    const summary = summarizeWeather(hours, 15)
    expect(summary.maxWindKt).toBe(22)
    expect(summary.maxWindAltitude).toBe('120m')
    expect(summary.level).toBe('DANGER')
  })

  it('computes average temperature', () => {
    const hours = [makeHour({ temperature: 10 }), makeHour({ time: '07:00', temperature: 20 })]
    const summary = summarizeWeather(hours, 15)
    expect(summary.avgTemperature).toBe(15)
  })

  it('returns OK level when all winds below threshold', () => {
    const hours = [makeHour()]
    const summary = summarizeWeather(hours, 15)
    expect(summary.level).toBe('OK')
  })

  it('handles empty hours array', () => {
    const summary = summarizeWeather([], 15)
    expect(summary.maxWindKt).toBe(0)
    expect(summary.level).toBe('OK')
  })
})
```

- [ ] **Step 3: Implement classify**

Create `lib/weather/classify.ts`:

```ts
import type { HourlyWeather, WindLevel, WeatherSummary } from './types'

export function classifyWind(speedKt: number, seuilKt: number): WindLevel {
  if (speedKt > seuilKt + 5) return 'DANGER'
  if (speedKt >= seuilKt) return 'WARNING'
  return 'OK'
}

const ALTITUDES = ['10m', '80m', '120m', '180m'] as const
const ALTITUDE_KEYS = ['wind10m', 'wind80m', 'wind120m', 'wind180m'] as const

export function summarizeWeather(hours: readonly HourlyWeather[], seuilKt: number): WeatherSummary {
  let maxWindKt = 0
  let maxWindAltitude = '10m'

  for (const hour of hours) {
    for (let i = 0; i < ALTITUDE_KEYS.length; i++) {
      const wind = hour[ALTITUDE_KEYS[i]]
      if (wind.speed > maxWindKt) {
        maxWindKt = wind.speed
        maxWindAltitude = ALTITUDES[i]
      }
    }
  }

  const avgTemperature =
    hours.length > 0
      ? Math.round(hours.reduce((sum, h) => sum + h.temperature, 0) / hours.length)
      : 0

  return {
    maxWindKt,
    maxWindAltitude,
    level: classifyWind(maxWindKt, seuilKt),
    avgTemperature,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/unit/weather-classify.spec.ts --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add lib/weather/types.ts lib/weather/classify.ts tests/unit/weather-classify.spec.ts
git commit -m "feat(weather): types + wind classification with tdd"
```

---

### Task 3: Parse + extract (TDD)

**Files:**

- Create: `lib/weather/parse.ts`
- Create: `lib/weather/extract.ts`
- Create: `tests/unit/weather-parse.spec.ts`
- Create: `tests/unit/weather-extract.spec.ts`

- [ ] **Step 1: Write parse tests**

Create `tests/unit/weather-parse.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseOpenMeteoResponse } from '@/lib/weather/parse'

const SAMPLE_RESPONSE = {
  hourly: {
    time: ['2026-04-12T05:00', '2026-04-12T06:00', '2026-04-12T07:00'],
    wind_speed_10m: [5, 8, 10],
    wind_direction_10m: [180, 190, 200],
    wind_speed_80m: [8, 12, 14],
    wind_direction_80m: [185, 195, 205],
    wind_speed_120m: [10, 14, 16],
    wind_direction_120m: [190, 200, 210],
    wind_speed_180m: [12, 16, 18],
    wind_direction_180m: [195, 205, 215],
    temperature_2m: [12, 14, 16],
    cloud_cover: [20, 30, 40],
    precipitation_probability: [0, 5, 10],
  },
}

describe('parseOpenMeteoResponse', () => {
  it('parses into WeatherForecast with correct number of hours', () => {
    const forecast = parseOpenMeteoResponse(SAMPLE_RESPONSE, '2026-04-12')
    expect(forecast.date).toBe('2026-04-12')
    expect(forecast.hours).toHaveLength(3)
  })

  it('parses wind readings correctly', () => {
    const forecast = parseOpenMeteoResponse(SAMPLE_RESPONSE, '2026-04-12')
    const hour = forecast.hours[1]
    expect(hour?.wind10m).toEqual({ speed: 8, direction: 190 })
    expect(hour?.wind180m).toEqual({ speed: 16, direction: 205 })
  })

  it('parses temperature and cloud cover', () => {
    const forecast = parseOpenMeteoResponse(SAMPLE_RESPONSE, '2026-04-12')
    const hour = forecast.hours[0]
    expect(hour?.temperature).toBe(12)
    expect(hour?.cloudCover).toBe(20)
    expect(hour?.precipitationProb).toBe(0)
  })

  it('extracts time as HH:MM', () => {
    const forecast = parseOpenMeteoResponse(SAMPLE_RESPONSE, '2026-04-12')
    expect(forecast.hours[0]?.time).toBe('05:00')
    expect(forecast.hours[2]?.time).toBe('07:00')
  })
})
```

- [ ] **Step 2: Write extract tests**

Create `tests/unit/weather-extract.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { extractCreneauHours } from '@/lib/weather/extract'
import type { WeatherForecast, HourlyWeather } from '@/lib/weather/types'

function makeHour(time: string): HourlyWeather {
  return {
    time,
    wind10m: { speed: 5, direction: 0 },
    wind80m: { speed: 8, direction: 0 },
    wind120m: { speed: 10, direction: 0 },
    wind180m: { speed: 12, direction: 0 },
    temperature: 15,
    cloudCover: 30,
    precipitationProb: 0,
  }
}

const FULL_DAY: WeatherForecast = {
  date: '2026-04-12',
  hours: Array.from({ length: 24 }, (_, i) => makeHour(String(i).padStart(2, '0') + ':00')),
}

describe('extractCreneauHours', () => {
  it('extracts MATIN hours 05:00-10:00', () => {
    const hours = extractCreneauHours(FULL_DAY, 'MATIN')
    expect(hours).toHaveLength(6)
    expect(hours[0].time).toBe('05:00')
    expect(hours[5].time).toBe('10:00')
  })

  it('extracts SOIR hours 17:00-22:00', () => {
    const hours = extractCreneauHours(FULL_DAY, 'SOIR')
    expect(hours).toHaveLength(6)
    expect(hours[0].time).toBe('17:00')
    expect(hours[5].time).toBe('22:00')
  })

  it('returns empty array if no matching hours', () => {
    const partial: WeatherForecast = {
      date: '2026-04-12',
      hours: [makeHour('12:00'), makeHour('13:00')],
    }
    const hours = extractCreneauHours(partial, 'MATIN')
    expect(hours).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Implement parse**

Create `lib/weather/parse.ts`:

```ts
import type { WeatherForecast, HourlyWeather } from './types'

type OpenMeteoHourly = {
  time: string[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  wind_speed_80m: number[]
  wind_direction_80m: number[]
  wind_speed_120m: number[]
  wind_direction_120m: number[]
  wind_speed_180m: number[]
  wind_direction_180m: number[]
  temperature_2m: number[]
  cloud_cover: number[]
  precipitation_probability: number[]
}

export type OpenMeteoResponse = {
  hourly: OpenMeteoHourly
}

export function parseOpenMeteoResponse(response: OpenMeteoResponse, date: string): WeatherForecast {
  const { hourly } = response
  const hours: HourlyWeather[] = hourly.time.map((t, i) => ({
    time: t.slice(11, 16), // "2026-04-12T06:00" -> "06:00"
    wind10m: { speed: hourly.wind_speed_10m[i] ?? 0, direction: hourly.wind_direction_10m[i] ?? 0 },
    wind80m: { speed: hourly.wind_speed_80m[i] ?? 0, direction: hourly.wind_direction_80m[i] ?? 0 },
    wind120m: {
      speed: hourly.wind_speed_120m[i] ?? 0,
      direction: hourly.wind_direction_120m[i] ?? 0,
    },
    wind180m: {
      speed: hourly.wind_speed_180m[i] ?? 0,
      direction: hourly.wind_direction_180m[i] ?? 0,
    },
    temperature: hourly.temperature_2m[i] ?? 0,
    cloudCover: hourly.cloud_cover[i] ?? 0,
    precipitationProb: hourly.precipitation_probability[i] ?? 0,
  }))

  return { date, hours }
}
```

- [ ] **Step 4: Implement extract**

Create `lib/weather/extract.ts`:

```ts
import type { WeatherForecast, HourlyWeather } from './types'

const CRENEAU_RANGES: Record<string, { start: number; end: number }> = {
  MATIN: { start: 5, end: 10 },
  SOIR: { start: 17, end: 22 },
}

export function extractCreneauHours(
  forecast: WeatherForecast,
  creneau: 'MATIN' | 'SOIR',
): HourlyWeather[] {
  const range = CRENEAU_RANGES[creneau]
  return forecast.hours.filter((h) => {
    const hour = parseInt(h.time.slice(0, 2))
    return hour >= range.start && hour <= range.end
  })
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/unit/weather-parse.spec.ts tests/unit/weather-extract.spec.ts --reporter=verbose
```

- [ ] **Step 6: Commit**

```bash
git add lib/weather/parse.ts lib/weather/extract.ts tests/unit/weather-parse.spec.ts tests/unit/weather-extract.spec.ts
git commit -m "feat(weather): parse Open-Meteo response + extract creneau hours with tdd"
```

---

### Task 4: Open-Meteo API client + cache

**Files:**

- Create: `lib/weather/open-meteo.ts`
- Create: `lib/weather/cache.ts`

- [ ] **Step 1: Create API client**

Create `lib/weather/open-meteo.ts`:

```ts
import type { OpenMeteoResponse } from './parse'

type FetchWeatherParams = {
  latitude: number
  longitude: number
  date: string // YYYY-MM-DD
}

export async function fetchWeatherFromAPI(params: FetchWeatherParams): Promise<OpenMeteoResponse> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(params.latitude))
  url.searchParams.set('longitude', String(params.longitude))
  url.searchParams.set(
    'hourly',
    'wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,temperature_2m,cloud_cover,precipitation_probability',
  )
  url.searchParams.set('wind_speed_unit', 'kn')
  url.searchParams.set('start_date', params.date)
  url.searchParams.set('end_date', params.date)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<OpenMeteoResponse>
}
```

- [ ] **Step 2: Create cache layer**

Create `lib/weather/cache.ts`:

```ts
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { fetchWeatherFromAPI } from './open-meteo'
import { parseOpenMeteoResponse } from './parse'
import type { WeatherForecast } from './types'
import type { OpenMeteoResponse } from './parse'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

type GetWeatherParams = {
  exploitantId: string
  latitude: number
  longitude: number
  date: string // YYYY-MM-DD
  forceRefresh?: boolean
}

export async function getWeather(params: GetWeatherParams): Promise<WeatherForecast> {
  const { exploitantId, latitude, longitude, date, forceRefresh } = params

  if (!forceRefresh) {
    const cached = await db.weatherCache.findUnique({
      where: { exploitantId_date: { exploitantId, date: new Date(date + 'T00:00:00Z') } },
    })

    if (cached) {
      const age = Date.now() - cached.fetchedAt.getTime()
      if (age < CACHE_TTL_MS) {
        return parseOpenMeteoResponse(cached.data as OpenMeteoResponse, date)
      }
    }
  }

  const response = await fetchWeatherFromAPI({ latitude, longitude, date })

  await basePrisma.weatherCache.upsert({
    where: { exploitantId_date: { exploitantId, date: new Date(date + 'T00:00:00Z') } },
    update: {
      data: response as Record<string, unknown>,
      fetchedAt: new Date(),
      latitude,
      longitude,
    },
    create: {
      exploitantId,
      date: new Date(date + 'T00:00:00Z'),
      data: response as Record<string, unknown>,
      latitude,
      longitude,
    },
  })

  return parseOpenMeteoResponse(response, date)
}
```

Note: uses `basePrisma` for the upsert to bypass tenant filter (exploitantId is explicit).

- [ ] **Step 3: Commit**

```bash
git add lib/weather/open-meteo.ts lib/weather/cache.ts
git commit -m "feat(weather): Open-Meteo API client + DB cache with 30-min TTL"
```

---

### Task 5: Server action + i18n + settings

**Files:**

- Create: `lib/actions/weather.ts`
- Modify: `lib/schemas/exploitant.ts`
- Modify: `lib/actions/exploitant.ts`
- Modify: `app/[locale]/(app)/settings/page.tsx`
- Modify: `messages/fr.json`
- Modify: `messages/en.json`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Create weather server action**

Create `lib/actions/weather.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { getWeather } from '@/lib/weather/cache'

export async function refreshWeather(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const vol = await db.vol.findUniqueOrThrow({
      where: { id: volId },
      include: { exploitant: { select: { meteoLatitude: true, meteoLongitude: true } } },
    })

    if (!vol.exploitant.meteoLatitude || !vol.exploitant.meteoLongitude) {
      return { error: 'Coordonnees GPS non configurees' }
    }

    const dateStr = vol.date.toISOString().slice(0, 10)

    await getWeather({
      exploitantId: vol.exploitantId,
      latitude: vol.exploitant.meteoLatitude,
      longitude: vol.exploitant.meteoLongitude,
      date: dateStr,
      forceRefresh: true,
    })

    revalidatePath(`/${locale}/vols/${volId}`)
    return {}
  })
}
```

- [ ] **Step 2: Extend exploitant schema + action**

Add to `lib/schemas/exploitant.ts`:

```ts
  meteoLatitude: z.coerce.number().min(-90).max(90).optional(),
  meteoLongitude: z.coerce.number().min(-180).max(180).optional(),
  meteoSeuilVent: z.coerce.number().int().positive().optional(),
```

Update `lib/actions/exploitant.ts` to extract the 3 new fields from formData:

```ts
  meteoLatitude: formData.get('meteoLatitude') || undefined,
  meteoLongitude: formData.get('meteoLongitude') || undefined,
  meteoSeuilVent: formData.get('meteoSeuilVent') || undefined,
```

- [ ] **Step 3: Add meteo section to settings page**

Add a new Card "Meteo" to `app/[locale]/(app)/settings/page.tsx` with 3 fields: latitude (number, step 0.000001), longitude (number, step 0.000001), seuil vent (number, default 15).

- [ ] **Step 4: Add i18n translations**

Add `"meteo"` top-level key to both `messages/fr.json` and `messages/en.json` per spec section 10.

- [ ] **Step 5: Update seed with Dole GPS**

In `prisma/seed.ts`, update Cameron Balloons France upsert to include:

```ts
  meteoLatitude: 47.0833,
  meteoLongitude: 5.4833,
  meteoSeuilVent: 15,
```

- [ ] **Step 6: Commit**

```bash
git add lib/actions/weather.ts lib/schemas/exploitant.ts lib/actions/exploitant.ts \
  "app/[locale]/(app)/settings/page.tsx" messages/fr.json messages/en.json prisma/seed.ts
git commit -m "feat(weather): server action, settings fields, i18n, seed GPS"
```

---

### Task 6: Weather table component + vol detail integration

**Files:**

- Create: `components/weather-table.tsx`
- Modify: `app/[locale]/(app)/vols/[id]/page.tsx`

- [ ] **Step 1: Create weather table component**

Create `components/weather-table.tsx` — server component that renders the weather data as a colored table.

Props:

```ts
type Props = {
  hours: HourlyWeather[]
  summary: WeatherSummary
  seuilVent: number
}
```

Layout:

- Banner at top: background color by level (green/orange/red), text "Vent max: X kt a Ym" + "OAT moy: Z C"
- Table: rows = hours, columns = Heure, Vent 10m, Vent 80m, Vent 120m, Vent 180m, OAT, Nebulosite, Precip
- Wind cells: "{speed} kt" with bg color (green/amber/red) from classifyWind
- Direction shown as small text below speed
- Refresh button (form action calling refreshWeather)

- [ ] **Step 2: Integrate into vol detail page**

In `app/[locale]/(app)/vols/[id]/page.tsx`:

- After passagers card and before devis card, add meteo section
- Fetch exploitant meteo fields (lat, lon, seuil)
- If lat/lon set: call `getWeather()`, extract creneau hours, summarize, render `<WeatherTable>`
- If lat/lon not set: show message "Configurez les coordonnees GPS dans Parametres"
- Also use the weather OAT for the devis de masse temperature (replace hardcoded 20)

- [ ] **Step 3: Commit**

```bash
git add components/weather-table.tsx "app/[locale]/(app)/vols/[id]/page.tsx"
git commit -m "feat(ui): weather table on vol detail with colored wind indicators"
```

---

### Task 7: PDF page 3 — real meteo data

**Files:**

- Modify: `lib/pdf/fiche-vol.tsx`
- Modify: `app/api/vols/[id]/fiche-vol/route.ts`

- [ ] **Step 1: Extend FicheVolData type**

Add to the `FicheVolData` type in `lib/pdf/fiche-vol.tsx`:

```ts
  meteo?: {
    hours: HourlyWeather[]
    summary: WeatherSummary
    seuilVent: number
  }
```

- [ ] **Step 2: Replace placeholder page 3**

In `lib/pdf/fiche-vol.tsx`, replace the meteo placeholder page with:

- Banner: "METEO — {date} — {creneau}" + colored indicator + "Vent max: X kt" + "OAT moy: Y C"
- Table: same layout as UI (hours x altitudes), with wind cells colored by threshold
- Footer: "Source: Open-Meteo.com — Prevision du {fetchedAt}"
- If no meteo data: keep the placeholder message

- [ ] **Step 3: Update PDF download route**

In `app/api/vols/[id]/fiche-vol/route.ts`, fetch weather data and pass it to `generateFicheVolBuffer`:

- Get exploitant meteo fields
- If lat/lon present, call `getWeather()`, extract creneau hours, summarize
- Pass `meteo` to FicheVolData

- [ ] **Step 4: Commit**

```bash
git add lib/pdf/fiche-vol.tsx app/api/vols/\[id\]/fiche-vol/route.ts
git commit -m "feat(pdf): replace meteo placeholder with real Open-Meteo data"
```

---

### Task 8: Verify and fix

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run --reporter=verbose
npx vitest run tests/integration/ --config vitest.integration.config.ts --reporter=verbose
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Fix any issues**

- [ ] **Step 4: Commit and push**

```bash
git push origin main
```

---

## Pw Checkpoint (M1 gate)

After Pw, all technical prerequisites for M1 dogfood are met:

- [ ] Weather data displays on vol detail page (colored wind table)
- [ ] Weather integrated into fiche de vol PDF (page 3)
- [ ] OAT from weather feeds devis de masse temperature
- [ ] Refresh button works
- [ ] Settings page has GPS + wind threshold fields
- [ ] Cameron Balloons seeded with Dole coordinates
- [ ] All tests pass (unit + integration), 0 TS errors
- [ ] Deployed on calpax.fr

**Next:** Olivier operates 5+ real flights through M1 at Cameron Balloons.
