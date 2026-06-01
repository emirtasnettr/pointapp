'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import type { CourierMapPoint, DropoffDensityPoint } from '@/types/dropoff-density';

export type { CourierMapPoint, DropoffDensityPoint };

const IST_CENTER: L.LatLngTuple = [41.0082, 28.9784];

function statusColor(status: string) {
  switch (status) {
    case 'POOL':
      return '#3b82f6';
    case 'PENDING':
      return '#ca8a04';
    case 'COURIER_ASSIGNED':
    case 'COURIER_EN_ROUTE':
    case 'PACKAGE_PICKED_UP':
      return '#16B24B';
    case 'DELIVERED':
      return '#71717a';
    case 'CANCELLED':
      return '#dc2626';
    default:
      return '#52525b';
  }
}

/** 24×24 viewBox SVG içeriği (stroke = currentColor) */
function statusSvgInner(status: string): string {
  const stroke = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  switch (status) {
    case 'PENDING':
      return `<circle cx="12" cy="12" r="10" ${stroke}/><polyline points="12 6 12 12 16 14" ${stroke}/>`;
    case 'POOL':
      return `<circle cx="11" cy="11" r="8" ${stroke}/><path d="m21 21-4.3-4.3" ${stroke}/>`;
    case 'COURIER_ASSIGNED':
      return `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" ${stroke}/><circle cx="12" cy="7" r="4" ${stroke}/>`;
    case 'COURIER_EN_ROUTE':
      return `<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" ${stroke}/><path d="M15 18H9" ${stroke}/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" ${stroke}/><circle cx="17" cy="18" r="2" ${stroke}/><circle cx="7" cy="18" r="2" ${stroke}/>`;
    case 'PACKAGE_PICKED_UP':
      return `<path d="m7.5 4.27 9 5.15" ${stroke}/><path d="M21 8V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" ${stroke}/><path d="M3.3 7 12 12l8.7-5" ${stroke}/><path d="M12 22V12" ${stroke}/>`;
    case 'DELIVERED':
      return `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" ${stroke}/><polyline points="22 4 12 14.01 9 11.01" ${stroke}/>`;
    case 'CANCELLED':
      return `<circle cx="12" cy="12" r="10" ${stroke}/><path d="m15 9-6 6" ${stroke}/><path d="m9 9 6 6" ${stroke}/>`;
    default:
      return `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" ${stroke}/><circle cx="12" cy="10" r="3" ${stroke}/>`;
  }
}

function statusDivIcon(status: string): L.DivIcon {
  const color = statusColor(status);
  const inner = statusSvgInner(status);
  const html = `
<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:50%;box-shadow:0 2px 10px rgba(15,23,42,0.18);border:2px solid ${color};color:${color}">
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>
</div>`;
  return L.divIcon({
    className: 'leaflet-div-icon regional-density-marker',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
}

const COURIER_MARKER_COLOR = '#4f46e5';

function courierDivIcon(): L.DivIcon {
  const stroke =
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const inner = `<circle cx="5.5" cy="17.5" r="3.5" ${stroke}/><circle cx="18.5" cy="17.5" r="3.5" ${stroke}/><circle cx="15" cy="5" r="1" fill="currentColor"/><path d="M12 17v-5l-3-3 5-4 2 3h3" ${stroke}/>`;
  const html = `
<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:50%;box-shadow:0 2px 10px rgba(15,23,42,0.18);border:2px solid ${COURIER_MARKER_COLOR};color:${COURIER_MARKER_COLOR}">
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>
</div>`;
  return L.divIcon({
    className: 'leaflet-div-icon regional-density-marker',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function RegionalDensityMap({
  packages,
  couriers,
}: {
  packages: DropoffDensityPoint[];
  couriers: CourierMapPoint[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mapSig = useMemo(() => {
    const p = packages.map((x) => `${x.orderNumber}:${x.status}:${x.lat}:${x.lng}:${x.label ?? ''}`).join('|');
    const c = couriers.map((x) => `${x.publicId}:${x.lat}:${x.lng}:${x.orderNumber}`).join('|');
    return `${p}##${c}`;
  }, [packages, couriers]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, { scrollWheelZoom: true }).setView(IST_CENTER, 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);

    for (const p of packages) {
      const icon = statusDivIcon(p.status);
      const m = L.marker([p.lat, p.lng], { icon }).addTo(group);

      const labelHtml = p.label
        ? `<div style="margin-top:4px;color:#52525b">${escapeHtml(p.label)}</div>`
        : '';
      m.bindPopup(
        `<div style="min-width:140px;font-size:12px;line-height:1.35;color:#18181b">
          <div style="font-weight:600">Paket #${p.orderNumber}</div>
          <div>${escapeHtml(deliveryStatusLabel(p.status))}</div>
          ${labelHtml}
          <a href="/orders/${p.orderNumber}" style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;color:#16B24B">Sipariş detayı →</a>
        </div>`,
      );
    }

    const cIcon = courierDivIcon();
    for (const c of couriers) {
      const m = L.marker([c.lat, c.lng], { icon: cIcon }).addTo(group);
      m.bindPopup(
        `<div style="min-width:140px;font-size:12px;line-height:1.35;color:#18181b">
          <div style="font-weight:600">Kurye ${escapeHtml(c.publicId)}</div>
          <div style="color:#52525b">Sipariş #${c.orderNumber}</div>
          <a href="/orders/${c.orderNumber}" style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;color:#16B24B">Sipariş detayı →</a>
        </div>`,
      );
    }

    const all: L.LatLngTuple[] = [
      ...packages.map((p) => [p.lat, p.lng] as L.LatLngTuple),
      ...couriers.map((c) => [c.lat, c.lng] as L.LatLngTuple),
    ];

    if (all.length === 0) {
      map.setView(IST_CENTER, 10);
    } else if (all.length === 1) {
      map.setView(all[0], 12);
    } else {
      const b = L.latLngBounds(all);
      map.fitBounds(b.pad(0.15), { maxZoom: 12 });
    }

    const t = requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      cancelAnimationFrame(t);
      map.remove();
    };
  }, [mapSig]);

  return (
    <div
      ref={containerRef}
      className="z-0 h-full min-h-[260px] w-full rounded-xl [&_.leaflet-control-attribution]:text-[10px] [&_.regional-density-marker]:border-0 [&_.regional-density-marker]:bg-transparent"
    />
  );
}
