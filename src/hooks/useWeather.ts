/**
 * useWeather — detects current weather via browser Geolocation + Open-Meteo.
 *
 * Returns WeatherContext (temperatureCelsius, condition, feelsLikeCelsius) for
 * the user's physical location. Uses React Query with a 15-minute staleTime so
 * repeated calls within the same session don't re-fetch.
 *
 * Falls back gracefully: if geolocation is denied or unavailable, `geoError`
 * is set and the caller should render a manual weather input instead.
 * The `manualOverride` action lets the user supply their own WeatherContext.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { WeatherContext } from '@/types/wardrobe';

// WMO weather code → condition mapping (https://open-meteo.com/en/docs)
function wmoToCondition(code: number, windspeedKmh: number, tempC: number): WeatherContext['condition'] {
  if (tempC < 8) return 'cold';
  if (tempC > 26) return 'hot';
  if (windspeedKmh > 40) return 'windy';
  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (
    (code >= 51 && code <= 55) ||
    (code >= 61 && code <= 65) ||
    (code >= 71 && code <= 75) ||
    (code >= 80 && code <= 82) ||
    (code >= 85 && code <= 86) ||
    (code >= 95 && code <= 99)
  ) return 'rainy';
  return 'cloudy';
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weathercode: number;
    windspeed_10m: number;
  };
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherContext> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,apparent_temperature,windspeed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
  const json: OpenMeteoResponse = await res.json();
  const { temperature_2m, apparent_temperature, weathercode, windspeed_10m } = json.current;
  return {
    temperatureCelsius: Math.round(temperature_2m),
    feelsLikeCelsius: Math.round(apparent_temperature),
    condition: wmoToCondition(weathercode, windspeed_10m, temperature_2m),
  };
}

function requestGeolocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

interface UseWeatherReturn {
  weather: WeatherContext | null;
  loading: boolean;
  error: string | null;
  geoError: boolean;
  manualOverride: (w: WeatherContext) => void;
  clearOverride: () => void;
}

export function useWeather(): UseWeatherReturn {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const [override, setOverride] = useState<WeatherContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    requestGeolocation()
      .then((c) => {
        if (!cancelled) {
          setCoords({ lat: c.latitude, lon: c.longitude });
          setGeoError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setGeoError(true);
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const { data, isLoading: queryLoading, error: queryError } = useQuery<WeatherContext, Error>({
    queryKey: ['weather', coords?.lat, coords?.lon],
    queryFn: () => fetchOpenMeteo(coords!.lat, coords!.lon),
    enabled: !!coords && !override,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const weather = override ?? data ?? null;
  const loading = geoLoading || (!!coords && queryLoading && !override);
  const error = !geoError && queryError ? 'Could not load weather data.' : null;

  return {
    weather,
    loading,
    error,
    geoError,
    manualOverride: (w) => setOverride(w),
    clearOverride: () => setOverride(null),
  };
}
