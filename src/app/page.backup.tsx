"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import {
  createPublicClient,
  http,
  type Abi,
} from "viem";

import registryArtifact from "@/abi/RegistreFoncier.json";
import mutationArtifact from "@/abi/GestionMutations.json";
import MutationPanel from "@/components/MutationPanel";

const REGISTRY = "0xBc286E3CF170c8D418DdA7861FF0d1b9ACEc89E7";
const MUTATION = "0x3624E855A2203612744a4b7166518Fd4ef0587AD";
const ABI = registryArtifact.abi as Abi;
const MUTATION_ABI = mutationArtifact.abi as Abi;

const client = createPublicClient({
  chain: polygonAmoy,
  transport: http("https://polygon-amoy.drpc.org"),
});
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

type ProprietaireHistorique = {
  adresse: string;
  date: string;
};

const CarteParcelles = dynamic(
  () => import("@/components/CarteParcelles"),
  {
    ssr: false,
    loading: () => <p className="text-slate-400">Chargement de la carte...</p>,
  }
);

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [recherche, setRecherche] = useState("");

const parcellesFiltrees = parcelles.filter((p) =>
  `${p.numero} ${p.localisation}`
    .toLowerCase()
    .includes(recherche.toLowerCase())
);
  const [historiques, setHistoriques] = useState<
    Record<number, ProprietaireHistorique[]>
  >({});

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const [numero, setNumero] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [cid, setCid] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [latitude, setLatitude] = useState("");
const [longitude, setLongitude] = useState("");

  async function chargerParcelles() {
    setChargement(true);
    setErreur("");

    try {
      const total = await client.readContract({
        address: REGISTRY,
        abi: ABI,
        functionName: "nombreParcelles",
      }) as bigint;

      const resultat: Parcelle[] = [];
      const nouveauxHistoriques: Record<
        number,
        ProprietaireHistorique[]
      > = {};

      for (let id = 1; id <= Number(total); id++) {
        const [proprietaire, informations] = await Promise.all([
          client.readContract({
            address: REGISTRY,
            abi: ABI,
            functionName: "ownerOf",
            args: [BigInt(id)],
          }),

          client.readContract({
            address: REGISTRY,
            abi: ABI,
            functionName: "obtenirParcelle",
            args: [BigInt(id)],
          }),
        ]);

       const valeurs = Array.isArray(informations)
  ? informations
  : Object.values(informations as Record<string, unknown>);

const [
  numero,
  localisation,
  latitude,
  longitude,
  cid,
  timestamp,
] = valeurs as [
  string,
  string,
  bigint,
  bigint,
  string,
  bigint
];

resultat.push({
  id,
  numero,
  localisation,
  latitude: Number(latitude) / 1_000_000,
  longitude: Number(longitude) / 1_000_000,
  cid,
  proprietaire: proprietaire as string,
  date: new Date(
    Number(timestamp) * 1000
  ).toLocaleDateString("fr-FR"),
});
        const [historiqueRegistre, historiqueMutations] =
          await Promise.all([
            client.readContract({
              address: REGISTRY,
              abi: ABI,
              functionName: "obtenirHistorique",
              args: [BigInt(id)],
            }),

            client.readContract({
              address: MUTATION,
              abi: MUTATION_ABI,
              functionName: "obtenirHistorique",
              args: [BigInt(id)],
            }),
          ]);

        const historiqueBrut = historiqueMutations as unknown[];

        const historiqueChoisi =
          historiqueBrut.length > 0
            ? historiqueBrut
            : (historiqueRegistre as unknown[]);

        nouveauxHistoriques[id] = historiqueChoisi.map((element) => {
          const valeurs = Array.isArray(element)
            ? element
            : Object.values(element as Record<string, unknown>);

          return {
            adresse: String(valeurs[0]),
            date: new Date(
              Number(valeurs[1]) * 1000
            ).toLocaleDateString("fr-FR"),
          };
        });
      }

      setParcelles(resultat);
      setHistoriques(nouveauxHistoriques);

    } catch (error) {
      console.error(error);
      setErreur(
        "Impossible de charger les parcelles. Vérifiez le réseau."
      );
    } finally {
      setChargement(false);
    }
  }

  async function enregistrerParcelle(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setErreur("");
    setMessage("");

    if (!isConnected || !address || !walletClient) {
      setErreur("Connectez d'abord MetaMask.");
      return;
    }

    if (chainId !== polygonAmoy.id) {
      setErreur("Connectez MetaMask au réseau Polygon Amoy.");
      return;
    }

    if (!numero.trim() || !localisation.trim() || !cid.trim()) {
      setErreur("Tous les champs sont obligatoires.");
      return;
    }
    const lat = Math.round(Number(latitude) * 1000000);
const lng = Math.round(Number(longitude) * 1000000);

if (
  !latitude.trim() ||
  !longitude.trim() ||
  !Number.isFinite(lat) ||
  !Number.isFinite(lng) ||
  lat < -90000000 ||
  lat > 90000000 ||
  lng < -180000000 ||
  lng > 180000000
) {
  setErreur("Coordonnées GPS invalides.");
  return;
}

    if (
      parcelles.some(
        (p) => p.numero.toLowerCase() === numero.trim().toLowerCase()
      )
    ) {
      setErreur("Ce numéro de parcelle existe déjà.");
      return;
    }
console.log("LOCALISATION ENVOYÉE :", localisation);
console.log("PROPRIÉTAIRE ENVOYÉ :", address);
    setEnregistrement(true);

    try {
      setMessage("Vérification de la blockchain...");

      const hash = await walletClient.writeContract({
  address: REGISTRY,
  abi: ABI,
  functionName: "enregistrerParcelle",
  args: [
    address,
    numero.trim(),
    localisation.trim(),
    BigInt(lat),
    BigInt(lng),
    cid.trim(),
  ],
 maxPriorityFeePerGas: BigInt("30000000000"),
maxFeePerGas: BigInt("50000000000"),
});



      setMessage("Transaction envoyée. Confirmation en cours...");

      await client.waitForTransactionReceipt({ hash });

      setMessage(
        `Parcelle ${numero} enregistrée avec succès sur Polygon Amoy !`
      );

      setNumero("");
      setLocalisation("");
      setCid("");

setLatitude("");
setLongitude("");

      await chargerParcelles();

    } catch (error) {
      console.error(error);

      setErreur(
        error instanceof Error
          ? error.message
          : "Échec de l'enregistrement."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  useEffect(() => {
    chargerParcelles();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <header className="border-b border-slate-800 px-6 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">
            REGISTRE FONCIER
          </h1>
          <p className="text-sm text-slate-400">
            Cadastre numérique sur blockchain
          </p>
        </div>

        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="bg-red-600 rounded-lg px-4 py-2"
          >
            Déconnecter
          </button>
        ) : (
          <button
            onClick={() =>
              connectors[0] && connect({ connector: connectors[0] })
            }
            disabled={isPending}
            className="bg-emerald-600 rounded-lg px-4 py-2"
          >
            {isPending ? "Connexion..." : "Connecter MetaMask"}
          </button>
        )}
      </header>

      <section className="max-w-6xl mx-auto px-6 py-10">

        <h2 className="text-3xl font-bold mb-2">
          Gestion des parcelles
        </h2>

        <p className="text-slate-400 mb-8">
          Consultez et enregistrez les terrains sur Polygon Amoy.
        </p>

        {/* FORMULAIRE D'ENREGISTREMENT */}

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 mb-10">

<input
  type="number"
  step="any"
  value={latitude}
  onChange={(e) => setLatitude(e.target.value)}
  placeholder="Latitude GPS (ex : -4.388)"
  className="bg-slate-800 border border-slate-700 rounded-lg p-3"
  required
/>

<input
  type="number"
  step="any"
  value={longitude}
  onChange={(e) => setLongitude(e.target.value)}
  placeholder="Longitude GPS (ex : 15.312)"
  className="bg-slate-800 border border-slate-700 rounded-lg p-3"
  required
/>

          <h3 className="text-xl font-semibold text-emerald-400 mb-5">
            Enregistrer une nouvelle parcelle
          </h3>

          <form onSubmit={enregistrerParcelle} className="grid gap-4">

            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Numéro de parcelle"
              className="bg-slate-800 border border-slate-700 rounded-lg p-3"
              required
            />

            <input
              value={localisation}
              onChange={(e) => setLocalisation(e.target.value)}
              placeholder="Localisation de la parcelle"
              className="bg-slate-800 border border-slate-700 rounded-lg p-3"
              required
            />

            <input
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              placeholder="CID du document IPFS (bafy...)"
              className="bg-slate-800 border border-slate-700 rounded-lg p-3"
              required
            />

            <p className="text-sm text-slate-400">
              Propriétaire : {address || "Connectez MetaMask"}
            </p>

            <button
              type="submit"
              disabled={enregistrement || !isConnected}
              className="bg-emerald-600 hover:bg-emerald-500 rounded-lg p-3 font-semibold disabled:opacity-50"
            >
              {enregistrement
                ? "Enregistrement..."
                : "Enregistrer sur la blockchain"}
            </button>

          </form>

          {message && (
            <p className="text-emerald-400 mt-4 break-all">
              {message}
            </p>
          )}

          {erreur && (
            <p className="text-red-400 mt-4 break-all">
              {erreur}
            </p>
          )}

        </div>

        {/* LISTE DES PARCELLES */}

        <div className="flex justify-between items-center mb-6">

          <h3 className="text-xl font-semibold">
            Parcelles enregistrées ({parcelles.length})
          </h3>

          <button
            onClick={chargerParcelles}
            className="bg-slate-700 rounded-lg px-4 py-2"
          >
            Actualiser
          </button>

        </div>

        {chargement && <p>Chargement des parcelles...</p>}

        {!chargement && !erreur && parcellesFiltrees.length === 0 && (
          <p className="text-slate-400">
            Aucune parcelle enregistrée.
          </p>
        )}
        <div className="mb-6">
  <input
    type="text"
    value={recherche}
    onChange={(e) => setRecherche(e.target.value)}
    placeholder="Rechercher par numéro ou localisation..."
    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 text-white"
  />
</div>

<div className="mb-8 rounded-xl border border-slate-700 bg-slate-900 p-4">
  <h3 className="mb-4 text-xl font-semibold text-emerald-400">
    Carte des parcelles
  </h3>

  <CarteParcelles parcelles={parcellesFiltrees} />
</div>

        <div className="grid gap-5 md:grid-cols-2">

          {parcellesFiltrees.map((p) => (

            <article
              key={p.id}
              className="rounded-xl border border-slate-700 bg-slate-900 p-6"
            >

              <h4 className="text-xl font-bold text-emerald-400">
                {p.numero}
              </h4>

              <p className="mt-3 text-slate-300">
                Localisation : {p.localisation}
              </p>

              <p className="mt-2 text-sm text-slate-400 break-all">
                Propriétaire : {p.proprietaire}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Enregistrée le : {p.date}
              </p>

              <p className="mt-2 text-sm text-slate-500 break-all">
                Document IPFS : {p.cid || "Aucun document associé"}
              </p>

              <div className="mt-5 border-t border-slate-700 pt-4">

                <h5 className="font-semibold text-emerald-400 mb-3">
                  Historique des propriétaires
                </h5>

                {historiques[p.id]?.length ? (
                  historiques[p.id].map((proprietaire, index) => (

                    <div key={index} className="mb-3 text-sm">

                      <p className="text-slate-300">
                        Propriétaire {index + 1}
                      </p>

                      <p className="text-slate-400 break-all">
                        {proprietaire.adresse}
                      </p>

                      <p className="text-slate-500">
                        Date : {proprietaire.date}
                      </p>

                    </div>

                  ))
                ) : (
                  <p className="text-slate-400 text-sm">
                    Aucun historique disponible.
                  </p>
                )}

              </div>

            </article>

          ))}

        </div>

        {/* PORTEFEUILLE */}

        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-900 p-6">

          <h3 className="text-xl font-semibold mb-3">
            Portefeuille
          </h3>

          {isConnected ? (
            <>
              <p className="text-emerald-400">
                Portefeuille connecté
              </p>

              <p className="break-all text-sm mt-2">
                {address}
              </p>

              <p className="mt-2 text-slate-400">
                Réseau : {chainId}
              </p>

              {chainId !== polygonAmoy.id && (
                <button
                  onClick={() =>
                    switchChain({ chainId: polygonAmoy.id })
                  }
                  className="mt-4 bg-emerald-600 rounded-lg px-4 py-2"
                >
                  Passer sur Polygon Amoy
                </button>
              )}
            </>
          ) : (
            <p className="text-slate-400">
              Connectez votre portefeuille pour effectuer des opérations.
            </p>
          )}
        </div>

      </section>

      <div className="max-w-6xl mx-auto px-6 pb-10">
        <MutationPanel />
      </div>

      <footer className="border-t border-slate-800 p-6 text-center text-slate-500">
        Registre Foncier Numérique — Polygon Amoy
      </footer>

    </main>
  );
}