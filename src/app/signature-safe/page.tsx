"use client";

import { useEffect, useState } from "react";
import SafeModule from "@safe-global/protocol-kit";
import {
encodeFunctionData,
parseAbi,
getAddress,
createPublicClient,
http,
type Abi,
} from "viem";
import { polygonAmoy } from "viem/chains";
import registryArtifact from "@/abi/RegistreFoncier.json";

const Safe = SafeModule as unknown as {
init: (config: any) => Promise<any>;
};

const SAFE_ADDRESS = "0x0B2F3B461E2B275Ed41d113B3DA9e614b774562c";
const GESTION_ADDRESS = "0x3624E855A2203612744a4b7166518Fd4ef0587AD";
const REGISTRY_ADDRESS = "0xBc286E3CF170c8D418DdA7861FF0d1b9ACEc89E7";

const REGISTRY_ABI = registryArtifact.abi as Abi;

const publicClient = createPublicClient({
chain: polygonAmoy,
transport: http("https://polygon-amoy.drpc.org"),
});

const OWNERS = [
"0xe272fb3d1598A836fab00bbbBa4C22F441c19d69",
"0x01D8E705A312CfCad05B5B90aa27478fA39767e2",
"0x7d48a32903Ba690270dA5c50C13B2C2175CdeA70",
];

const ABI = parseAbi([
"function finaliserMutation(uint256 tokenId)",
]);

const MUTATION_ABI = parseAbi([
"function mutations(uint256 tokenId) view returns (address vendeur, address acheteur, bool acceptee, bool terminee)",
]);

declare global {
interface Window {
ethereum: any;
}
}

export default function SignatureSafe() {
const [safe, setSafe] = useState<any>(null);
const [safeTx, setSafeTx] = useState<any>(null);
const [ownersSigned, setOwnersSigned] = useState<string[]>([]);
const [message, setMessage] = useState("En attente de connexion.");

const [parcelles, setParcelles] = useState<
  { id: number; numero: string }[]
>([]);
const [selectedTokenId, setSelectedTokenId] = useState("4");

const [mutationDisponible, setMutationDisponible] = useState(false);
const [verificationEnCours, setVerificationEnCours] = useState(true);
const [statutMutation, setStatutMutation] = useState(
"Vérification de la mutation..."
);

// Vérifie directement l'état de la mutation sur Polygon Amoy.
async function verifierMutation(tokenId: string) {
try {
const [vendeur, , acceptee, terminee] =
await publicClient.readContract({
address: GESTION_ADDRESS,
abi: MUTATION_ABI,
functionName: "mutations",
args: [BigInt(tokenId)],
});

  if (vendeur === "0x0000000000000000000000000000000000000000") {
    return {
      valide: false,
      message: "Aucune demande de mutation pour cette parcelle.",
    };
  }

  if (terminee) {
    return {
      valide: false,
      message: "Cette mutation est déjà terminée.",
    };
  }

  if (!acceptee) {
    return {
      valide: false,
      message: "En attente de l'acceptation de l'acheteur.",
    };
  }

  const proprietaire = await publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
  });

  if (
    String(proprietaire).toLowerCase() !==
    String(vendeur).toLowerCase()
  ) {
    return {
      valide: false,
      message: "Le vendeur n'est plus propriétaire de cette parcelle.",
    };
  }

  return {
    valide: true,
    message: "Mutation acceptée. Les signatures sont autorisées.",
  };
} catch (error) {
  console.error(error);

  return {
    valide: false,
    message: "Impossible de vérifier la mutation sur la blockchain.",
  };
}

}

// Chargement des parcelles.
useEffect(() => {
async function chargerParcelles() {
try {
const total = await publicClient.readContract({
address: REGISTRY_ADDRESS,
abi: REGISTRY_ABI,
functionName: "nombreParcelles",
}) as bigint;

    const resultat: { id: number; numero: string }[] = [];

    for (let id = 1; id <= Number(total); id++) {
      const informations = await publicClient.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "obtenirParcelle",
        args: [BigInt(id)],
      });

      const valeurs = Array.isArray(informations)
        ? informations
        : Object.values(informations as Record<string, unknown>);

      resultat.push({
        id,
        numero: String(valeurs[0]),
      });
    }

    setParcelles(resultat);
  } catch (error) {
    console.error(error);
    setMessage("Impossible de charger les parcelles.");
  }
}

chargerParcelles();

}, []);

// Vérification automatique à chaque changement de parcelle.
useEffect(() => {
let actif = true;

async function verifierSelection() {
  setVerificationEnCours(true);
  setMutationDisponible(false);
  setStatutMutation("Vérification de la mutation...");

  const resultat = await verifierMutation(selectedTokenId);

  if (actif) {
    setMutationDisponible(resultat.valide);
    setStatutMutation(resultat.message);
    setVerificationEnCours(false);
  }
}

if (selectedTokenId) {
  verifierSelection();
}

return () => {
  actif = false;
};

}, [selectedTokenId]);

async function connectWallet() {
if (!window.ethereum) {
throw new Error("MetaMask n'est pas installé.");
}

const accounts = await window.ethereum.request({
  method: "eth_requestAccounts",
});

if (!accounts || accounts.length === 0) {
  throw new Error("Aucun compte MetaMask connecté.");
}

const chainId = await window.ethereum.request({
  method: "eth_chainId",
});

if (Number(chainId) !== 80002) {
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x13882" }],
  });
}

const selectedAccount = window.ethereum.selectedAddress;

if (!selectedAccount) {
  throw new Error("Aucun compte MetaMask sélectionné.");
}

return getAddress(selectedAccount);

}

async function preparerTransaction() {
try {
setMessage("Vérification de la demande de mutation...");

  const verification = await verifierMutation(selectedTokenId);

  setMutationDisponible(verification.valide);
  setStatutMutation(verification.message);

  if (!verification.valide) {
    throw new Error(verification.message);
  }

  setMessage("Connexion à MetaMask...");

  const account = await connectWallet();

  if (!OWNERS.some(
    (owner) => owner.toLowerCase() === account.toLowerCase()
  )) {
    throw new Error("Ce portefeuille n'est pas propriétaire du Safe.");
  }

  const protocol = await Safe.init({
    provider: window.ethereum,
    signer: account,
    safeAddress: SAFE_ADDRESS,
  });

  const data = encodeFunctionData({
    abi: ABI,
    functionName: "finaliserMutation",
    args: [BigInt(selectedTokenId)],
  });

  const transaction = await protocol.createTransaction({
    transactions: [
      {
        to: getAddress(GESTION_ADDRESS),
        value: "0",
        data,
      },
    ],
  });

  setSafe(protocol);
  setSafeTx(transaction);
  setOwnersSigned([]);

  setMessage("Transaction préparée. Tu peux commencer les signatures.");
} catch (error: any) {
  setMessage("Erreur : " + error.message);
}

}

async function signerTransaction() {
try {
if (!safe || !safeTx) {
throw new Error("Prépare d'abord la transaction.");
}

  const account = await connectWallet();

  if (!OWNERS.some(
    (owner) => owner.toLowerCase() === account.toLowerCase()
  )) {
    throw new Error("Ce compte n'est pas propriétaire du Safe.");
  }

  if (ownersSigned.some(
    (owner) => owner.toLowerCase() === account.toLowerCase()
  )) {
    throw new Error("Ce compte a déjà signé.");
  }

  const connectedSafe = await safe.connect({
    provider: window.ethereum,
    signer: account,
  });

  setMessage("Signature en attente dans MetaMask...");

  const signedTransaction = await connectedSafe.signTransaction(
    safeTx,
    "eth_signTypedData_v4",
    SAFE_ADDRESS
  );

  setSafeTx(signedTransaction);

  const signatures = Array.from(
    signedTransaction.signatures.keys()
  ) as string[];

  setOwnersSigned(signatures);

  setMessage(`Signature enregistrée : ${signatures.length}/3`);
} catch (error: any) {
  setMessage("Erreur : " + error.message);
}

}

async function executerTransaction() {
try {
if (!safe || !safeTx || ownersSigned.length < 3) {
throw new Error("Les trois signatures sont nécessaires.");
}

  // Nouvelle vérification avant l'exécution réelle.
  setMessage("Nouvelle vérification de la mutation...");

  const verification = await verifierMutation(selectedTokenId);

  setMutationDisponible(verification.valide);
  setStatutMutation(verification.message);

  if (!verification.valide) {
    throw new Error(verification.message);
  }

  const account = await connectWallet();

  const connectedSafe = await safe.connect({
    provider: window.ethereum,
    signer: account,
  });

  setMessage("Vérification et envoi de la transaction...");

  const result = await connectedSafe.executeTransaction(safeTx);

  setMessage("Transaction envoyée ! Hash : " + result.hash);

  setSafe(null);
  setSafeTx(null);
  setOwnersSigned([]);
} catch (error: any) {
  setMessage("Erreur : " + error.message);
}

}

return (
<main className="min-h-screen bg-slate-950 p-6 text-slate-100">
<div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">

    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-xl font-bold">
        RF
      </div>

      <div>
        <h1 className="text-2xl font-bold">
          REGISTRE FONCIER
        </h1>
        <p className="text-sm text-slate-400">
          Validation sécurisée des mutations
        </p>
      </div>
    </div>

    <h2 className="mb-5 text-xl font-bold text-emerald-400">
      Signature Safe multisignature
    </h2>

    <div className="mb-5">
      <label className="mb-2 block font-semibold text-slate-300">
        Sélectionner la parcelle à muter
      </label>

      <select
        value={selectedTokenId}
        onChange={(e) => {
          setSelectedTokenId(e.target.value);
          setSafe(null);
          setSafeTx(null);
          setOwnersSigned([]);
          setMessage("Nouvelle parcelle sélectionnée.");
        }}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-500"
      >
        {parcelles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.numero} — Token ID : {p.id}
          </option>
        ))}
      </select>
    </div>

    <div className={`mb-5 rounded-xl border p-4 text-sm ${
      verificationEnCours
        ? "border-yellow-600 bg-yellow-950/30 text-yellow-300"
        : mutationDisponible
          ? "border-emerald-600 bg-emerald-950/30 text-emerald-300"
          : "border-red-600 bg-red-950/30 text-red-300"
    }`}>
      <p className="font-bold">
        {verificationEnCours
          ? "⏳ Vérification"
          : mutationDisponible
            ? "✅ Mutation autorisée"
            : "🔒 Mutation bloquée"}
      </p>

      <p className="mt-2">{statutMutation}</p>
    </div>

    <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
      <p>
        Réseau : <span className="text-emerald-400">Polygon Amoy</span>
      </p>
      <p className="mt-2">Chain ID : 80002</p>
      <p className="mt-2">
        Signatures requises : <span className="text-emerald-400">3 sur 3</span>
      </p>
    </div>

    <button
      onClick={preparerTransaction}
      disabled={!mutationDisponible || verificationEnCours}
      className="mb-3 w-full rounded-lg bg-emerald-600 p-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-700"
    >
      1. Préparer la transaction
    </button>

    <button
      onClick={signerTransaction}
      disabled={!safeTx || ownersSigned.length >= 3}
      className="mb-6 w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-700"
    >
      2. Signer avec MetaMask
    </button>

    <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950 p-4">
      <h3 className="mb-4 font-bold text-emerald-400">
        Signatures des propriétaires du Safe
      </h3>

      {OWNERS.map((owner) => (
        <p key={owner} className="mb-3 break-all text-sm text-slate-300">
          {ownersSigned.some(
            (signed) => signed.toLowerCase() === owner.toLowerCase()
          )
            ? "✅ "
            : "⏳ "}
          {owner}
        </p>
      ))}
    </div>

    <button
      onClick={executerTransaction}
      disabled={ownersSigned.length < 3}
      className="w-full rounded-lg bg-purple-600 p-3 font-semibold text-white hover:bg-purple-700 disabled:bg-slate-700"
    >
      3. Exécuter la mutation
    </button>

    <p className="mt-6 break-words rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
      {message}
    </p>

    <a
      href="/"
      className="mt-6 block text-center text-sm text-emerald-400 hover:text-emerald-300"
    >
      ← Retour au tableau de bord
    </a>

  </div>
</main>

);
}