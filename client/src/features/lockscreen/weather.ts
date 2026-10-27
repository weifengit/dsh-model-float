/**
 * Model Float — the weather.
 *
 * The lock screen shows the weather where the machine is. The browser can ask
 * for the position, and `wttr.in` answers with CORS headers, so the whole
 * lookup can happen in the page — no Host route, no key.
 *
 * Two fallbacks, because a lock screen that shows nothing is useless:
 *
 * 1. the browser's geolocation, when the user grants it;
 * 2. a city the user can set, remembered locally.
 *
 * @module client/src/features/lockscreen/weather.ts
 */

import { useEffect, useState } from 'react'

/** The weather service. */
export const WEATHER_API = 'https://wttr.in'

/** How long a reading is considered fresh, in ms. */
export const WEATHER_TTL_MS = 30 * 60 * 1000

/** The localStorage key holding the fallback city. */
export const WEATHER_CITY_KEY = 'dsh-model-float:weather-city:v1'

/** One weather reading. */
export interface Weather {
  /** The temperature in Celsius. */
  readonly temperature: number
  /** A short description, in the service's own words. */
  readonly description: string
  /** A glyph for the condition. */
  readonly icon: string
  /** Where the reading is for. */
  readonly place: string
}

/** The state of the weather lookup. */
export type WeatherState =
  | { readonly state: 'loading' }
  | { readonly state: 'ready', readonly value: Weather }
  | { readonly state: 'failed', readonly error: string }

/**
 * The glyph for a weather code.
 *
 * @param code - the WMO weather code.
 * @returns the glyph.
 */
function iconFor(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '⛅'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 57) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌧️'
  if (code <= 86) return '🌨️'
  return '⛈️'
}

/**
 * The city's remembered fallback.
 *
 * @returns the city, or undefined.
 */
export function readWeatherCity(): string | undefined {
  try {
    const raw = window.localStorage.getItem(WEATHER_CITY_KEY)
    return raw === null || raw.trim() === '' ? undefined : raw.trim()
  } catch {
    return undefined
  }
}

/**
 * Remember the city's fallback.
 *
 * @param city - the city.
 */
export function writeWeatherCity(city: string): void {
  try {
    if (city.trim() === '') window.localStorage.removeItem(WEATHER_CITY_KEY)
    else window.localStorage.setItem(WEATHER_CITY_KEY, city.trim())
  } catch {
    /* the fallback is a convenience */
  }
}

/**
 * Ask the browser where the machine is.
 *
 * @returns the coordinates, or undefined when the user declines or the browser
 *   has no answer.
 */
function readPosition(): Promise<{ latitude: number, longitude: number } | undefined> {
  if (typeof navigator === 'undefined' || typeof navigator.geolocation?.getCurrentPosition !== 'function') {
    return Promise.resolve(undefined)
  }
  return new Promise(resolve => {
    let settled = false
    const finish = (value: { latitude: number, longitude: number } | undefined) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    // A prompt that hangs would leave the lock screen's weather blank
    // forever, so the answer is given a deadline.
    const timer = window.setTimeout(() => finish(undefined), 4000)
    navigator.geolocation.getCurrentPosition(
      position => {
        window.clearTimeout(timer)
        finish({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      },
      () => {
        window.clearTimeout(timer)
        finish(undefined)
      },
      { timeout: 3500, maximumAge: 30 * 60 * 1000 },
    )
  })
}

/**
 * Read the weather for a place.
 *
 * @param place - a city name, or undefined to use the browser's position.
 * @returns the reading.
 */
export async function fetchWeather(place?: string): Promise<Weather> {
  const target = place !== undefined && place.trim() !== ''
    ? place.trim()
    : await resolvePlace()
  const url = place !== undefined && place.trim() !== ''
    ? `${WEATHER_API}/${encodeURIComponent(place.trim())}?format=j1`
    : `${WEATHER_API}/?format=j1`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
  const payload = await response.json() as {
    current_condition?: Array<{ temp_C?: string, weatherDesc?: Array<{ value?: string }>, weatherCode?: string }>
    nearest_area?: Array<{ areaName?: Array<{ value?: string }>, country?: Array<{ value?: string }> }>
  }
  const condition = payload.current_condition?.[0]
  if (condition === undefined) throw new Error('no reading')
  const area = payload.nearest_area?.[0]
  return {
    temperature: Number(condition.temp_C ?? 0),
    description: condition.weatherDesc?.[0]?.value ?? '',
    icon: iconFor(Number(condition.weatherCode ?? 0)),
    place: target !== '' ? target : [area?.areaName?.[0]?.value, area?.country?.[0]?.value].filter(Boolean).join(' · '),
  }
}

/**
 * The place to ask about: the remembered city, else the browser's position.
 *
 * @returns the place, or an empty string.
 */
async function resolvePlace(): Promise<string> {
  const remembered = readWeatherCity()
  if (remembered !== undefined) return remembered
  const position = await readPosition()
  if (position === undefined) return ''
  return `${position.latitude.toFixed(2)},${position.longitude.toFixed(2)}`
}

/**
 * The weather, loaded once the lock screen opens.
 *
 * @param active - whether the lock screen is showing.
 * @returns the lookup's state.
 */
export function useWeather(active: boolean): WeatherState {
  const [state, setState] = useState<WeatherState>({ state: 'loading' })

  useEffect(() => {
    if (!active) return undefined
    let alive = true
    setState({ state: 'loading' })
    void fetchWeather(readWeatherCity())
      .then(value => { if (alive) setState({ state: 'ready', value }) })
      .catch((error: unknown) => {
        if (!alive) return
        setState({ state: 'failed', error: error instanceof Error ? error.message : String(error) })
      })
    return () => { alive = false }
  }, [active])

  return state
}
