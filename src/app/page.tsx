"use client";
import { jsPDF } from "jspdf";
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
const [provinceSelectionnee, setProvinceSelectionnee] = useState("Toutes");

const provinces = [
  "Kinshasa",
  "Kongo Central",
  "Kwango",
  "Kwilu",
  "Mai-Ndombe",
  "Équateur",
  "Mongala",
  "Nord-Ubangi",
  "Sud-Ubangi",
  "Tshuapa",
  "Tshopo",
  "Bas-Uele",
  "Haut-Uele",
  "Ituri",
  "Nord-Kivu",
  "Sud-Kivu",
  "Maniema",
  "Sankuru",
  "Kasaï",
  "Kasaï Central",
  "Kasaï Oriental",
  "Lomami",
  "Haut-Lomami",
  "Lualaba",
  "Haut-Katanga",
  "Tanganyika",
];

const parcellesFiltrees = parcelles.filter((p) => {
  const correspondRecherche =
    `${p.numero} ${p.localisation}`
      .toLowerCase()
      .includes(recherche.toLowerCase());

  const correspondProvince =
    provinceSelectionnee === "Toutes" ||
    p.localisation
      .toLowerCase()
      .includes(provinceSelectionnee.toLowerCase());

  return correspondRecherche && correspondProvince;
});
  const [historiques, setHistoriques] = useState<
    Record<number, ProprietaireHistorique[]>
  >({});

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const [numero, setNumero] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [nomProprietaire, setNomProprietaire] = useState("");
 const [cid, setCid] = useState("");
const [fichier, setFichier] = useState<File | null>(null);
const [uploadEnCours, setUploadEnCours] = useState(false);
const [enregistrement, setEnregistrement] = useState(false);
  const [latitude, setLatitude] = useState("");
const [longitude, setLongitude] = useState("");

async function genererTitrePDF() {
  if (
    !numero.trim() ||
    !nomProprietaire.trim() ||
    !localisation.trim() ||
    !latitude.trim() ||
    !longitude.trim()
  ) {
    setErreur("Remplissez toutes les informations de la parcelle et du propriétaire.");
    return;
  }

  if (!address) {
    setErreur("Connectez d'abord MetaMask.");
    return;
  }

  setUploadEnCours(true);
  setErreur("");
  setMessage("");
  setCid("");

  try {
    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("REGISTRE FONCIER NUMERIQUE", 20, 25);

    pdf.setFontSize(14);
    pdf.text("FICHE DESCRIPTIVE DE PARCELLE", 20, 40);

    pdf.setFontSize(11);
    pdf.text("DOCUMENT EXPERIMENTAL - SANS VALEUR JURIDIQUE", 20, 50);

    const lignes = [
      `Numero de parcelle : ${numero}`,
      `Proprietaire : ${nomProprietaire}`,
      `Adresse blockchain : ${address}`,
      `Localisation : ${localisation}`,
      `Latitude : ${latitude}`,
      `Longitude : ${longitude}`,
      `Date : ${new Date().toLocaleDateString("fr-FR")}`,
      "",
      "Document genere automatiquement par le prototype",
      "de registre foncier sur blockchain."
    ];

    pdf.text(lignes, 20, 70);

    const blob = pdf.output("blob");
    const fichierPDF = new File(
      [blob],
      `titre-${numero}.pdf`,
      { type: "application/pdf" }
    );

    const formData = new FormData();
    formData.append("file", fichierPDF);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const resultat = await response.json();

    if (!response.ok) {
      throw new Error(resultat.error || "Echec de l'envoi vers IPFS.");
    }

    setCid(resultat.cid);
    setMessage("Titre PDF genere et envoye sur IPFS avec succes !");
  } catch (error) {
    setErreur(
      error instanceof Error ? error.message : "Erreur lors de la generation du PDF."
    );
  } finally {
    setUploadEnCours(false);
  }
}

async function envoyerDocument() {
  if (!fichier) {
    setErreur("Veuillez sélectionner un document cadastral.");
    return;
  }

  setUploadEnCours(true);
  setErreur("");
  setMessage("");

  try {
    const formData = new FormData();
    formData.append("file", fichier);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const resultat = await response.json();

    if (!response.ok) {
      throw new Error(resultat.error || "Échec du téléversement.");
    }

    setCid(resultat.cid);
    setMessage("Document envoyé sur IPFS avec succès.");
  } catch (error) {
    setErreur(
      error instanceof Error ? error.message : "Erreur lors de l'envoi."
    );
  } finally {
    setUploadEnCours(false);
  }
}

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
  <main className="min-h-screen bg-slate-950 text-slate-100">
    {/* BARRE DE NAVIGATION */}
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-xl font-bold text-white">
            RF
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">REGISTRE FONCIER</h1>
            <p className="text-xs text-slate-400">Cadastre numérique sur blockchain</p>
          </div>
        </a>

        <nav className="hidden gap-7 text-sm text-slate-300 md:flex">
  <a href="#tableau" className="hover:text-emerald-400">Tableau de bord</a>
  <a href="#parcelles" className="hover:text-emerald-400">Parcelles</a>
  <a href="#carte" className="hover:text-emerald-400">Cartographie</a>
  <a href="#mutation" className="hover:text-emerald-400">Mutations</a>
 <a href="/signature-safe" className="hover:text-emerald-400">
  Signature Safe
</a>
<a href="/administration" className="hover:text-emerald-400">
  Administration
</a>
</nav>
        <button
          onClick={() =>
            isConnected ? disconnect() : connect({ connector: connectors[0] })
          }
          disabled={isPending}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {isPending ? "Connexion..." : isConnected ? "Déconnecter" : "Connecter MetaMask"}
        </button>
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      {/* INTRODUCTION */}
      <section id="tableau" className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-8">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-400">
          Plateforme cadastrale décentralisée
        </p>
        <h2 className="max-w-2xl text-3xl font-bold md:text-4xl">
          Gestion et sécurisation des titres fonciers sur blockchain
        </h2>
        <p className="mt-4 max-w-2xl text-slate-400">
          Enregistrez les parcelles, consultez les propriétaires et suivez
          les mutations foncières grâce à la technologie blockchain.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#enregistrement" className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600">
            + Enregistrer une parcelle
          </a>
          <a href="#parcelles" className="rounded-lg border border-slate-600 px-5 py-3 font-semibold hover:bg-slate-700">
            Consulter les parcelles
          </a>
        </div>
      </section>

      {/* INDICATEURS */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Total des parcelles</p>
          <p className="mt-2 text-3xl font-bold text-white">{parcelles.length}</p>
          <p className="mt-1 text-xs text-emerald-400">Enregistrées sur la blockchain</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Réseau blockchain</p>
          <p className="mt-2 text-2xl font-bold text-white">Polygon Amoy</p>
          <p className="mt-1 text-xs text-emerald-400">Chain ID : 80002</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">État du portefeuille</p>
          <p className="mt-2 text-xl font-bold text-white">
            {isConnected ? "Connecté" : "Non connecté"}
          </p>
          <p className="mt-1 break-all text-xs text-slate-400">
            {address || "Connectez votre portefeuille"}
          </p>
        </div>
      </section>

      {/* ENREGISTREMENT */}
      <section id="enregistrement" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Enregistrer une nouvelle parcelle</h2>
          <p className="mt-1 text-sm text-slate-400">
            Ajoutez les informations cadastrales et enregistrez le titre sur blockchain.
          </p>
        </div>

        <form onSubmit={enregistrerParcelle} className="grid gap-5 md:grid-cols-2">
          <div>
  <label className="mb-2 block text-sm text-slate-300">
    Nom complet du propriétaire
  </label>
  <input
    value={nomProprietaire}
    onChange={(e) => setNomProprietaire(e.target.value)}
    placeholder="Ex : Jean KABAMBA ILUNGA"
    required
    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-emerald-500"
  />
</div>
          <div>
  <label className="mb-2 block text-sm text-slate-300">
    Numéro de parcelle
  </label>
  <input
    value={numero}
    onChange={(e) => setNumero(e.target.value)}
    placeholder="Ex : KIN-2026-003"
    required
    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-emerald-500"
  />
</div>
         <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">

  <select
    value={provinceSelectionnee}
    onChange={(e) => setProvinceSelectionnee(e.target.value)}
    className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-500"
  >
    <option value="Toutes">Toutes les provinces</option>

    {provinces.map((province) => (
      <option key={province} value={province}>
        {province}
      </option>
    ))}
  </select>

  <input
    value={recherche}
    onChange={(e) => setRecherche(e.target.value)}
    placeholder="Numéro, commune, territoire..."
    className="rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-emerald-500"
  />

  <button
    type="button"
    onClick={() => {
      setRecherche("");
      setProvinceSelectionnee("Toutes");
    }}
    className="rounded-lg border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
  >
    Réinitialiser
  </button>

</div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Localisation</label>
            <input
              value={localisation}
              onChange={(e) => setLocalisation(e.target.value)}
              placeholder="Ex : Lemba, Kinshasa"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Latitude</label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="-4.405"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Longitude</label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="15.322"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-emerald-500"
            />
          </div>

         <div className="md:col-span-2">
  
  <label className="mb-2 block text-sm text-slate-300">
    Titre foncier numérique
  </label>

  <button
    type="button"
    onClick={genererTitrePDF}
    disabled={uploadEnCours}
    className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
  >
    {uploadEnCours
      ? "Génération et envoi vers IPFS..."
      : "Générer le titre PDF et obtenir le CID"}
  </button>

  {cid && (
    <p className="mt-3 break-all text-sm text-emerald-400">
      Titre généré ! CID : {cid}
    </p>
  )}
</div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={enregistrement}
              className="w-full rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {enregistrement ? "Enregistrement en cours..." : "Enregistrer sur la blockchain"}
            </button>
          </div>
        </form>

        {message && (
          <p className="mt-4 rounded-lg border border-emerald-700 bg-emerald-950 p-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        {erreur && (
          <p className="mt-4 rounded-lg border border-red-700 bg-red-950 p-3 text-sm text-red-300">
            {erreur}
          </p>
        )}
      </section>

      {/* PARCELLES */}
      <section id="parcelles" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Registre des parcelles</h2>
            <p className="text-sm text-slate-400">Consultez les titres fonciers enregistrés.</p>
          </div>

          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher une parcelle..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 md:w-72"
          />
        </div>

        {chargement ? (
          <p className="rounded-xl bg-slate-900 p-6 text-center text-slate-400">
            Chargement des données blockchain...
          </p>
        ) : parcellesFiltrees.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
            Aucune parcelle trouvée.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {parcellesFiltrees.map((p) => (
              <article key={p.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-400">Titre foncier #{p.id}</p>
                    <h3 className="mt-1 text-xl font-bold">{p.numero}</h3>
                  </div>
                  <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs text-emerald-400">
                    Enregistrée
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <p><span className="text-slate-400">Localisation :</span> {p.localisation}</p>
                  <p className="break-all"><span className="text-slate-400">Propriétaire :</span> {p.proprietaire}</p>
                 <p className="break-all">
  <span className="text-slate-400">CID IPFS :</span> {p.cid}
</p>

<a
  href={`https://ipfs.io/ipfs/${p.cid}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
>
  Consulter le document PDF
</a>
                  
                </div>

                <div className="mt-5 border-t border-slate-800 pt-4">
                  <h4 className="mb-3 font-semibold">Historique des propriétaires</h4>
                  {historiques[p.id]?.length ? (
                    <div className="space-y-3">
                     {historiques[p.id].map((h, index) => {
  const total = historiques[p.id].length;

  const role =
    total === 1
      ? "Propriétaire actuel"
      : index === 0
        ? "Propriétaire initial"
        : index === total - 1
          ? "Propriétaire actuel"
          : "Ancien propriétaire";

  return (
    <div key={index} className="border-l-2 border-emerald-500 pl-3 text-sm">
      <p className="mb-1 font-semibold text-emerald-400">{role}</p>
      <p className="break-all text-slate-200">{h.adresse}</p>
      <p className="text-xs text-slate-500">{h.date}</p>
    </div>
  );
})}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Aucun historique disponible.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CARTE */}
      <section id="carte" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold">Cartographie cadastrale</h2>
          <p className="text-sm text-slate-400">Visualisation géographique des parcelles.</p>
        </div>
        <CarteParcelles parcelles={parcellesFiltrees} />
      </section>

      {/* PORTEFEUILLE */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">Portefeuille blockchain</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Réseau actuel : {chainId}</p>
            <p className="mt-1 break-all text-sm">{address || "Aucun portefeuille connecté"}</p>
          </div>
          {chainId !== polygonAmoy.id && (
            <button
              onClick={() => switchChain({ chainId: polygonAmoy.id })}
              className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white hover:bg-emerald-600"
            >
              Passer sur Polygon Amoy
            </button>
          )}
        </div>
      </section>

      {/* MUTATIONS */}
      <section id="mutation" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Gestion des mutations foncières</h2>
          <p className="text-sm text-slate-400">
            Demandes, approbations et validation sécurisée avec Safe multisignature.
          </p>
        </div>
        <MutationPanel />
      </section>
    </div>

    <footer className="mt-12 border-t border-slate-800 bg-slate-950 px-6 py-8 text-center">
      <p className="font-semibold">REGISTRE FONCIER NUMÉRIQUE</p>
      <p className="mt-2 text-sm text-slate-500">
        Sécurisation des titres fonciers par blockchain — Polygon Amoy
      </p>
    </footer>
  </main>
);
}