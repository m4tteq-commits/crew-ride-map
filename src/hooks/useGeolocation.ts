import { useEffect, useRef, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { haversineMeters } from "@/lib/geo";

export interface GeoSample {
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number | null;
  timestamp: number;
}

interface Options {
  enabled: boolean;
  onSample?: (sample: GeoSample) => void;
}

/**
 * Watches device location. Uses Capacitor Geolocation on native, falls back to
 * the browser's Geolocation API on web. Computes a fallback speed from
 * position deltas when GPS doesn't return one.
 */
export function useGeolocation({ enabled, onSample }: Options) {
  const [sample, setSample] = useState<GeoSample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastRef = useRef<GeoSample | null>(null);
  const watchIdRef = useRef<string | number | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const handle = (lat: number, lng: number, gpsSpeed: number | null, heading: number | null) => {
      const now = Date.now();
      let speedKmh = 0;
      if (gpsSpeed != null && gpsSpeed >= 0 && Number.isFinite(gpsSpeed)) {
        speedKmh = gpsSpeed * 3.6;
      } else if (lastRef.current) {
        const dt = (now - lastRef.current.timestamp) / 1000;
        if (dt > 0.1) {
          const d = haversineMeters(lastRef.current.lat, lastRef.current.lng, lat, lng);
          speedKmh = (d / dt) * 3.6;
        }
      }
      // Clamp absurd values
      if (!Number.isFinite(speedKmh) || speedKmh < 0) speedKmh = 0;
      if (speedKmh > 400) speedKmh = 0;

      const next: GeoSample = { lat, lng, speedKmh, heading, timestamp: now };
      lastRef.current = next;
      setSample(next);
      onSample?.(next);
    };

    const start = async () => {
      try {
        if (isNative) {
          const perm = await Geolocation.requestPermissions();
          if (perm.location !== "granted") {
            setError("Permisiunea de locație a fost refuzată.");
            return;
          }
          const id = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000 },
            (pos, err) => {
              if (cancelled) return;
              if (err) { setError(err.message); return; }
              if (!pos) return;
              handle(pos.coords.latitude, pos.coords.longitude, pos.coords.speed ?? null, pos.coords.heading ?? null);
            }
          );
          watchIdRef.current = id;
        } else {
          if (!navigator.geolocation) {
            setError("Geolocația nu este disponibilă în acest browser.");
            return;
          }
          const id = navigator.geolocation.watchPosition(
            (pos) => {
              if (cancelled) return;
              handle(pos.coords.latitude, pos.coords.longitude, pos.coords.speed ?? null, pos.coords.heading ?? null);
            },
            (err) => setError(err.message),
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
          );
          watchIdRef.current = id;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eroare locație");
      }
    };

    start();

    return () => {
      cancelled = true;
      const id = watchIdRef.current;
      if (id != null) {
        if (isNative) Geolocation.clearWatch({ id: id as string });
        else navigator.geolocation.clearWatch(id as number);
      }
      watchIdRef.current = null;
      lastRef.current = null;
    };
  }, [enabled, isNative, onSample]);

  return { sample, error };
}
