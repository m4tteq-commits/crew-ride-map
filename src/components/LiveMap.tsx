import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Member } from "@/hooks/useRoomMembers";

interface Destination {
  lat: number;
  lng: number;
  label?: string | null;
}

export interface RouteInfo {
  memberId: string;
  distanceM: number;
  durationS: number;
}

interface Props {
  token: string;
  members: Member[];
  selfDeviceId: string;
  followSelf: boolean;
  destination?: Destination | null;
  onMapReady?: (map: mapboxgl.Map) => void;
  onLongPress?: (lat: number, lng: number) => void;
  onRoutesUpdate?: (routes: RouteInfo[]) => void;
}

export function LiveMap({ token, members, selfDeviceId, followSelf, destination, onMapReady, onLongPress, onRoutesUpdate }: Props) {
  const onRoutesUpdateRef = useRef(onRoutesUpdate);
  onRoutesUpdateRef.current = onRoutesUpdate;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [26.1025, 44.4268],
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Routes source/layer
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
      onMapReady?.(map);
    });

    // Long-press detection (touch + mouse)
    let pressTimer: number | null = null;
    let pressLngLat: mapboxgl.LngLat | null = null;
    let moved = false;
    const startPress = (lngLat: mapboxgl.LngLat) => {
      moved = false;
      pressLngLat = lngLat;
      pressTimer = window.setTimeout(() => {
        if (!moved && pressLngLat && onLongPressRef.current) {
          onLongPressRef.current(pressLngLat.lat, pressLngLat.lng);
        }
      }, 600);
    };
    const cancelPress = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };
    map.on("mousedown", (e) => startPress(e.lngLat));
    map.on("touchstart", (e) => startPress(e.lngLat));
    map.on("mousemove", () => { moved = true; cancelPress(); });
    map.on("touchmove", () => { moved = true; cancelPress(); });
    map.on("mouseup", cancelPress);
    map.on("touchend", cancelPress);
    map.on("dragstart", cancelPress);

    return () => {
      cancelPress();
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Sync member markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    members.forEach((m) => {
      if (m.lat == null || m.lng == null) return;
      seen.add(m.id);

      let marker = markersRef.current[m.id];
      if (!marker) {
        const el = document.createElement("div");
        el.className = "driver-pin";
        el.innerHTML = `
          <div class="driver-pin-dot" style="color:${m.color};background:${m.color}"></div>
          <div class="driver-pin-label">
            <span class="driver-pin-name">${escapeHtml(m.nickname)}</span>
            <span class="driver-pin-speed"> · <span data-speed>0</span> km/h</span>
          </div>
        `;
        marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
        markersRef.current[m.id] = marker;
      } else {
        marker.setLngLat([m.lng, m.lat]);
      }

      const el = marker.getElement();
      const speedEl = el.querySelector("[data-speed]");
      if (speedEl) speedEl.textContent = String(Math.round(m.speed_kmh ?? 0));
      el.style.opacity = m.is_driving ? "1" : "0.45";
    });

    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    if (followSelf) {
      const me = members.find((m) => m.device_id === selfDeviceId);
      if (me?.lat != null && me?.lng != null) {
        map.easeTo({ center: [me.lng, me.lat], duration: 600 });
      }
    }
  }, [members, followSelf, selfDeviceId]);

  // Destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!destination) {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      return;
    }
    if (!destMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "dest-pin";
      el.innerHTML = `
        <div class="dest-pin-flag">📍</div>
        <div class="dest-pin-label" data-label></div>
      `;
      destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
    } else {
      destMarkerRef.current.setLngLat([destination.lng, destination.lat]);
    }
    const labelEl = destMarkerRef.current.getElement().querySelector("[data-label]");
    if (labelEl) labelEl.textContent = destination.label ?? "Destinație";
  }, [destination]);

  // Fetch + draw routes from each driving member to destination
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const updateRoutes = async () => {
      const source = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      if (!destination) {
        source.setData({ type: "FeatureCollection", features: [] });
        onRoutesUpdateRef.current?.([]);
        return;
      }

      const drivers = members.filter(
        (m) => m.is_driving && m.lat != null && m.lng != null
      );

      const results = await Promise.all(
        drivers.map(async (m) => {
          try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${m.lng},${m.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${token}`;
            const res = await fetch(url);
            const data = await res.json();
            const route = data.routes?.[0];
            if (!route) return null;
            return {
              feature: {
                type: "Feature" as const,
                properties: { color: m.color },
                geometry: route.geometry,
              },
              info: {
                memberId: m.id,
                distanceM: route.distance as number,
                durationS: route.duration as number,
              } as RouteInfo,
            };
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;
      const valid = results.filter(Boolean) as { feature: any; info: RouteInfo }[];
      source.setData({
        type: "FeatureCollection",
        features: valid.map((r) => r.feature),
      });
      onRoutesUpdateRef.current?.(valid.map((r) => r.info));
    };

    if (map.isStyleLoaded()) updateRoutes();
    else map.once("load", updateRoutes);

    return () => { cancelled = true; };
    // Re-fetch when destination changes or driver positions change meaningfully (every ~10s via members updates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    destination?.lat,
    destination?.lng,
    // Include a coarse signature of driver positions to avoid spamming Directions API
    members
      .filter((m) => m.is_driving)
      .map((m) => `${m.id}:${m.lat?.toFixed(3)}:${m.lng?.toFixed(3)}`)
      .join("|"),
  ]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
