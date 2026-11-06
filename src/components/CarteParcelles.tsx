"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

type Parcelle = {
  id: number;
  numero: string;
  localisation: string;
  latitude: number;
  longitude: number;
  cid: string;
  proprietaire: string;
  date: string;
};

type Props = {
  parcelles: Parcelle[];
};
function AjusterCarte({ parcelles }: Props) {
  const map = useMap();
console.log("Parcelles reçues par la carte :", parcelles);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (parcelles.length === 0) {
        map.flyTo([-3.5, 23.5], 5, { duration: 1 });
      } else if (parcelles.length === 1) {
        map.flyTo(
          [parcelles[0].latitude, parcelles[0].longitude],
          15,
          { duration: 1.2 }
        );
      } else {
        const limites = parcelles.map(
          (p) => [p.latitude, p.longitude] as [number, number]
        );

        map.flyToBounds(limites, {
          padding: [50, 50],
          maxZoom: 15,
          duration: 1.2,
        });
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [parcelles, map]);

  return null;
}

export default function CarteParcelles({ parcelles }: Props) {
  return (
    <MapContainer
      center={[-3.5, 23.5]}
      zoom={5}
      scrollWheelZoom={true}
      className="h-[500px] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AjusterCarte parcelles={parcelles} />

      {parcelles.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.latitude, p.longitude]}
          radius={9}
          pathOptions={{
            color: "#10b981",
            fillColor: "#10b981",
            fillOpacity: 0.8,
          }}
        >
          <Popup>
            <strong>{p.numero}</strong>
            <br />
            {p.localisation}
            <br />
            Propriétaire : {p.proprietaire}
            <br />
            Latitude : {p.latitude}
            <br />
            Longitude : {p.longitude}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}