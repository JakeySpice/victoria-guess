import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SCORING, VICTORIA_CENTER } from '../game/scoring';
import type { RoundState } from '../game/types';

interface Props {
  round: RoundState;
  onZoomOut: (deltaLevels: number) => void;
  showLabel?: boolean;
}

function ZoomWatcher({
  onZoomOut,
  active,
}: {
  onZoomOut: (deltaLevels: number) => void;
  active: boolean;
}) {
  const map = useMap();
  const prevZoom = useRef<number>(map.getZoom());

  useEffect(() => {
    if (!active) return;
    prevZoom.current = map.getZoom();
    const handler = () => {
      const cur = map.getZoom();
      const prev = prevZoom.current;
      if (cur < prev) {
        onZoomOut(prev - cur);
      }
      prevZoom.current = cur;
    };
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map, onZoomOut, active]);

  return null;
}

function FocusView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export function MapView({ round, onZoomOut, showLabel }: Props) {
  const { place } = round;
  const active = round.status === 'playing';

  return (
    <MapContainer
      center={VICTORIA_CENTER}
      zoom={SCORING.INITIAL_ZOOM}
      minZoom={SCORING.MIN_ZOOM}
      maxZoom={SCORING.MAX_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
      worldCopyJump={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        attribution="© CARTO © OpenStreetMap contributors"
        subdomains="abcd"
        maxZoom={SCORING.MAX_ZOOM}
      />
      {showLabel && (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          attribution="© CARTO © OpenStreetMap contributors"
          subdomains="abcd"
          maxZoom={SCORING.MAX_ZOOM}
          opacity={0.8}
        />
      )}
      <CircleMarker
        center={[place.lat, place.lng]}
        radius={8}
        pathOptions={{
          color: '#ffffff',
          weight: 2,
          fillColor: '#dc2626',
          fillOpacity: 0.9,
        }}
        eventHandlers={{
          click: (e: L.LeafletMouseEvent) => {
            e.target.closePopup?.();
          },
        }}
      />
      <ZoomWatcher onZoomOut={onZoomOut} active={active} />
      <FocusView lat={place.lat} lng={place.lng} />
    </MapContainer>
  );
}
