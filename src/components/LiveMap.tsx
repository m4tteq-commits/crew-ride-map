import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Member } from "@/hooks/useRoomMembers";

interface Props {
  token: string;
  members: Member[];
  selfDeviceId: string;
  followSelf: boolean;
  onMapReady?: (map: mapboxgl.Map) => void;
}

export function LiveMap({ token, members, selfDeviceId, followSelf, onMapReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [26.1025, 44.4268], // Bucharest default
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on("load", () => onMapReady?.(map));
    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Sync markers
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

    // Remove gone markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Follow self
    if (followSelf) {
      const me = members.find((m) => m.device_id === selfDeviceId);
      if (me?.lat != null && me?.lng != null) {
        map.easeTo({ center: [me.lng, me.lat], duration: 600 });
      }
    }
  }, [members, followSelf, selfDeviceId]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
