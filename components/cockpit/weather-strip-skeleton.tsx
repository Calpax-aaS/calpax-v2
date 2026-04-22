import { MonoLabel } from '@/components/cockpit/mono-label'

/**
 * Placeholder for the `FlightCard` weather strip — same height and padding
 * as the real strip, with shimmer-style blocks where the wind / temp /
 * go-nogo chips will land once the forecast resolves. Paired with a
 * `<Suspense>` boundary around the strip so async weather fetchers
 * (`use(weatherPromise)`) don't cause a whole-card flash.
 */
export function WeatherStripSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement de la météo"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-sky-50 px-3 py-2 text-sm"
    >
      <MonoLabel>
        <span className="inline-block h-2 w-20 animate-pulse rounded bg-sky-200" />
      </MonoLabel>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-sky-200" />
        <span className="inline-block h-2 w-10 animate-pulse rounded bg-sky-200" />
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block h-3.5 w-3.5 animate-pulse rounded bg-sky-200" />
        <span className="inline-block h-2 w-8 animate-pulse rounded bg-sky-200" />
      </div>
      <span className="ml-auto inline-block h-4 w-10 animate-pulse rounded bg-sky-200" />
    </div>
  )
}
