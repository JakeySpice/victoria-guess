import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import {
  INITIAL_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  VICTORIA_BOUNDS,
  VICTORIA_CENTER,
} from '../game/scoring';
import type { LatLng, RoundState } from '../game/types';

interface Props {
  round: RoundState;
  pendingGuess: LatLng | null;
  onPlace: (g: LatLng) => void;
}

function ClickCapture({
  enabled,
  onPlace,
}: {
  enabled: boolean;
  onPlace: (g: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPlace({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitResult({
  aLat,
  aLng,
  bLat,
  bLng,
}: {
  aLat: number;
  aLng: number;
  bLat: number;
  bLng: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [aLat, aLng],
        [bLat, bLng],
      ],
      { padding: [70, 70], maxZoom: MAX_ZOOM, animate: true },
    );
  }, [aLat, aLng, bLat, bLng, map]);
  return null;
}

export function MapView({ round, pendingGuess, onPlace }: Props) {
  const revealed = round.status === 'revealed';
  const truth = { lat: round.place.lat, lng: round.place.lng };
  const guess = revealed ? round.guess : pendingGuess;

  return (
    <MapContainer
      key={round.place.id}
      center={VICTORIA_CENTER}
      zoom={INITIAL_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={VICTORIA_BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom
      className="h-full w-full"
      worldCopyJump={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        attribution="© CARTO © OpenStreetMap contributors"
        subdomains="abcd"
        maxZoom={MAX_ZOOM}
      />
      {revealed && (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          attribution="© CARTO © OpenStreetMap contributors"
          subdomains="abcd"
          maxZoom={MAX_ZOOM}
          opacity={0.9}
        />
      )}

      <ClickCapture enabled={!revealed} onPlace={onPlace} />

      {guess && (
        <CircleMarker
          center={[guess.lat, guess.lng]}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: '#2563eb',
            fillOpacity: 0.9,
          }}
        />
      )}

      {revealed && (
        <>
          <CircleMarker
            center={[truth.lat, truth.lng]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: '#dc2626',
              fillOpacity: 0.95,
            }}
          />
          {guess && (
            <>
              <Polyline
                positions={[
                  [guess.lat, guess.lng],
                  [truth.lat, truth.lng],
                ]}
                pathOptions={{ color: '#334155', weight: 2, dashArray: '6 6' }}
              />
              <FitResult
                aLat={guess.lat}
                aLng={guess.lng}
                bLat={truth.lat}
                bLng={truth.lng}
              />
            </>
          )}
        </>
      )}
    </MapContainer>
  );
}
