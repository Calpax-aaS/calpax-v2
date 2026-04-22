// Types shared between the dashboard page and the FlightCard component.
// Kept separate from the Prisma-level `WeatherSummary` in lib/weather/types.ts
// — this is the UI-shaped projection used for rendering.

export type MassBudget = {
  totalWeight: number
  maxPayload: number
  status: 'OK' | 'WARNING' | 'OVER'
}

export type FlightCardWeather = {
  maxWindKt: number
  maxWindAltitude: string
  avgTemperature: number
  goNogo: 'GO' | 'NOGO' | 'MARGINAL'
  creneauRange: string
}

export type FlightCardData = {
  id: string
  date: string
  creneau: 'MATIN' | 'SOIR'
  statut: string
  ballonNom: string
  ballonImmat: string
  piloteNom: string
  equipierNom: string | null
  siteDeco: string | null
  passagerCount: number
  passagerMax: number
  massBudget: MassBudget | null
  weather: FlightCardWeather | null
  meteoAlert: boolean
}
