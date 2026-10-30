import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, Info, MapPin } from 'lucide-react';
import { ItineraryDay } from '../types.ts';

interface ItineraryMapProps {
  days: ItineraryDay[];
}

export const ItineraryMap: React.FC<ItineraryMapProps> = ({ days }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [boundaryLoaded, setBoundaryLoaded] = useState<boolean>(false);

  const allStops = days.flatMap((d) =>
    d.stops.map((s) => ({
      dayNumber: d.day_number,
      orderInDay: s.order_in_day,
      destination: s.destination,
    }))
  );

  useEffect(() => {
    if (!mapContainerRef.current || allStops.length === 0) return;

    try {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Karnataka geographic bounds: 11.0°N to 19.0°N, 73.5°E to 79.0°E
      const karnatakaBounds = L.latLngBounds([11.0, 73.5], [19.0, 79.0]);

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        maxBounds: karnatakaBounds,
        maxBoundsViscosity: 0.8,
        minZoom: 6,
      });
      mapInstanceRef.current = map;

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 18,
      });

      let tileErrorCount = 0;
      tileLayer.on('tileerror', () => {
        tileErrorCount += 1;
        if (tileErrorCount > 6) {
          setMapError('Map unavailable.');
        }
      });

      tileLayer.addTo(map);

      // Load authentic Karnataka boundary GeoJSON from DataMeet / GADM (ODbL open license)
      fetch('/karnataka-boundary.geojson')
        .then((res) => {
          if (!res.ok) throw new Error('Boundary file not available');
          return res.json();
        })
        .then((boundaryGeoJson) => {
          if (mapInstanceRef.current) {
            L.geoJSON(boundaryGeoJson, {
              style: {
                fillColor: '#F4B400',
                fillOpacity: 0.14,
                color: '#B3141F',
                weight: 1.5,
                opacity: 0.8,
              },
            }).addTo(mapInstanceRef.current);
            setBoundaryLoaded(true);
          }
        })
        .catch(() => {
          // If boundary file fails to load, keep map usable without hand-drawn approximation
          setBoundaryLoaded(false);
        });

      const latLngs: L.LatLngExpression[] = [];

      allStops.forEach((item) => {
        const { lat, lng, name, kannada_name, region, district, verified, coords_approx } =
          item.destination;
        const pos: [number, number] = [lat, lng];
        latLngs.push(pos);

        // Itinerary markers numbered by day, alternating red-on-yellow and yellow-on-red
        const isOddDay = item.dayNumber % 2 !== 0;
        const bg = isOddDay ? '#F4B400' : '#B3141F';
        const fg = isOddDay ? '#B3141F' : '#F4B400';
        const borderColor = isOddDay ? '#8E0F18' : '#F4B400';

        // Red teardrop pin with yellow center or alternating numbered day badge
        const customIcon = L.divIcon({
          className: 'namma-daari-day-marker',
          html: `
            <div style="position:relative;width:32px;height:42px;display:flex;flex-direction:column;align-items:center;">
              <div style="background:${bg};color:${fg};border:2px solid ${borderColor};border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.35);">
                <span style="transform:rotate(45deg);font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:12px;line-height:1;">${item.dayNumber}</span>
              </div>
              <div style="width:4px;height:4px;background:#8E0F18;border-radius:50%;margin-top:-2px;"></div>
            </div>
          `,
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -40],
        });

        const marker = L.marker(pos, { icon: customIcon }).addTo(map);

        // Tapping a marker shows place name, region and compact travel information
        const travelInfoBadges = [];
        if (!verified) {
          travelInfoBadges.push(`<span style="display:inline-block;background:#FFF2D6;color:#5C4033;border:1px solid #E5D5BA;border-radius:2px;font-size:10px;font-weight:600;padding:1px 5px;">Draft record</span>`);
        }
        if (coords_approx) {
          travelInfoBadges.push(`<span style="display:inline-block;background:#FFF2D6;color:#5C4033;border:1px solid #E5D5BA;border-radius:2px;font-size:10px;font-weight:600;padding:1px 5px;">Approx coords</span>`);
        }

        const travelInfoHtml = travelInfoBadges.length > 0
          ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">${travelInfoBadges.join('')}</div>
             <div style="font-size:10px;color:#5C4033;margin-top:3px;line-height:1.3;">${!verified ? 'Draft data, verify before travelling.' : ''} ${coords_approx ? 'Coordinates are approximate; verify exact monument entrance locally.' : ''}</div>`
          : '';

        marker.bindPopup(
          `<div style="font-family:'Plus Jakarta Sans',sans-serif;color:#2B1D14;min-width:180px;padding:2px;">
            <div style="font-size:11px;font-weight:700;color:#B3141F;text-transform:uppercase;letter-spacing:0.5px;">Day ${item.dayNumber} · Stop ${item.orderInDay}</div>
            <div style="font-size:15px;font-weight:700;color:#8E0F18;margin-top:2px;">${name}</div>
            <div style="font-size:13px;color:#2B1D14;font-family:'Noto Serif Kannada',serif;">${kannada_name}</div>
            <div style="font-size:11px;color:#2B1D14;margin-top:2px;font-weight:600;">Region: ${region} (${district} dist.)</div>
            ${travelInfoHtml}
          </div>`
        );
      });

      // Draw route as a dashed line labelled "Approximate straight-line connection, not a road route."
      if (latLngs.length > 1) {
        L.polyline(latLngs, {
          color: '#B3141F',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.85,
        }).addTo(map);
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 9);
      } else if (latLngs.length > 1) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch {
      setMapError('Map unavailable.');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [days]);

  if (allStops.length === 0) return null;

  return (
    <section
      aria-labelledby="map-section-heading"
      className="my-8 kasuti-border bg-[#FFF0C7]/80 p-5 rounded-xs no-print"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3
            id="map-section-heading"
            className="text-lg font-bold text-[#8E0F18] font-kannada flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-[#B3141F]" aria-hidden="true" />
            <span>ಕರ್ನಾಟಕ ಪ್ರವಾಸ ನಕ್ಷೆ · Karnataka Journey Map</span>
          </h3>
          <p className="text-xs text-[#2B1D14] mt-0.5 font-medium">
            Dashed line: <strong>Approximate straight-line connection, not a road route.</strong>
          </p>
        </div>
        <span className="text-xs font-mono-tabular font-bold text-[#8E0F18] bg-[#FFF6DC] px-2.5 py-1 border border-[#F4B400] rounded-xs self-start sm:self-center">
          {allStops.length} mapped stop{allStops.length === 1 ? '' : 's'}
        </span>
      </div>

      {mapError ? (
        <div
          role="region"
          aria-label="Map unavailable fallback"
          className="p-4 bg-[#FFF6DC] border border-[#B3141F] rounded-xs text-sm text-[#2B1D14]"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#B3141F] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-[#8E0F18]">Map unavailable.</p>
              <p className="text-xs mt-1 text-[#2B1D14]">
                The interactive map could not be loaded on your network, but your full itinerary below remains completely active and detailed.
              </p>
              <ul className="mt-3 text-xs space-y-1 font-mono-tabular">
                {allStops.map((s, i) => (
                  <li key={s.destination.id} className="text-[#2B1D14]">
                    {i + 1}. Day {s.dayNumber}: {s.destination.name} ({s.destination.district}, {s.destination.region}) — {s.destination.lat.toFixed(3)}°N, {s.destination.lng.toFixed(3)}°E
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            ref={mapContainerRef}
            tabIndex={0}
            role="application"
            aria-label="Interactive Leaflet map of Karnataka stops with dashed sequence line"
            className="w-full h-80 sm:h-96 rounded-xs border border-[#F4B400] bg-[#FFF6DC] z-0 focus:outline-none focus:ring-2 focus:ring-[#B3141F]"
          />

          {/* Map Legend */}
          <div className="p-3 bg-[#FFF6DC] border border-[#E2D2B4] rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs text-[#2B1D14]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-[#8E0F18] uppercase tracking-wider text-[11px]">
                Map Legend:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded-full bg-[#F4B400] border border-[#8E0F18] text-[#B3141F] text-[10px] font-bold text-center leading-3">
                  1
                </span>
                <span>Day (Odd): Red on Yellow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded-full bg-[#B3141F] border border-[#F4B400] text-[#F4B400] text-[10px] font-bold text-center leading-3">
                  2
                </span>
                <span>Day (Even): Yellow on Red</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-6 border-t-2 border-dashed border-[#B3141F]"></span>
                <span>Approximate straight-line connection, not a road route</span>
              </div>
            </div>

            <div className="text-[11px] text-[#2B1D14]/75 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#B3141F]" aria-hidden="true" />
              <span>
                Boundary: DataMeet / GADM (ODbL License) · Tiles: OpenStreetMap
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
