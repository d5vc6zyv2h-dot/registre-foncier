"use client";

import { useState } from "react";
import {
  isAddress,
  parseGwei,
  encodeFunctionData,
  type Abi,
} from "viem";
import {
  useAccount,
  useChainId,
  useWalletClient,
} from "wagmi";

import Safe from "@safe-global/protocol-kit";

import mutationArtifact from "@/abi/GestionMutations.json";
import registryArtifact from "@/abi/RegistreFoncier.json";

const MUTATION_ADDRESS =
  "0x3624E855A2203612744a4b7166518Fd4ef0587AD" as `0x${string}`;

const REGISTRY_ADDRESS =
  "0xBc286E3CF170c8D418DdA7861FF0d1b9ACEc89E7" as `0x${string}`;

const SAFE_ADDRESS =
  "0x0B2F3B461E2B275Ed41d113B3DA9e614b774562c" as `0x${string}`;

const MUTATION_ABI = mutationArtifact.abi as Abi;
const REGISTRY_ABI = registryArtifact.abi as Abi;

const FRAIS = {
  maxPriorityFeePerGas: parseGwei("25"),
  maxFeePerGas: parseGwei("100"),
};

type Proposition = {
  chainId: number;
  safeAddress: string;
  tokenId: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  nonce: number;
  safeTxHash: string;
};

export default function MutationPanel() {
  const [tokenId, setTokenId] = useState("2");
  const [acheteur, setAcheteur] = useState("");

  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState("");

  const [propositionTexte, setPropositionTexte] = useState("");
  const [proposition, setProposition] =
    useState<Proposition | null>(null);

  const [approbations, setApprobations] = useState<string[]>([]);
  const [proprietaires, setProprietaires] = useState<string[]>([]);
  const [seuil, setSeuil] = useState(3);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  async function obtenirSafe() {
    if (!address || !isConnected) {
      throw new Error("Connectez votre portefeuille.");
    }

    if (chainId !== 80002) {
      throw new Error("Veuillez sélectionner Polygon Amoy.");
    }

    const ethereum = (window as any).ethereum;

    if (!ethereum) {
      throw new Error("MetaMask est introuvable.");
    }

    return Safe.init({
      provider: ethereum,
      signer: address,
      safeAddress: SAFE_ADDRESS,
    });
  }

  function verifierToken() {
    if (!tokenId || !Number.isInteger(Number(tokenId)) || Number(tokenId) <= 0) {
      throw new Error("Identifiant NFT invalide.");
    }
  }

  async function demanderMutation() {
    setMessage("");
    setHash("");

    if (!isConnected || !address || !walletClient) {
      setMessage("Connectez d'abord votre portefeuille.");
      return;
    }

    if (chainId !== 80002) {
      setMessage("Veuillez sélectionner Polygon Amoy.");
      return;
    }

    try {
      verifierToken();

      if (!isAddress(acheteur)) {
        throw new Error("Adresse de l'acheteur invalide.");
      }

      if (acheteur.toLowerCase() === address.toLowerCase()) {
        throw new Error("Le vendeur et l'acheteur doivent être différents.");
      }

      setChargement(true);
      setMessage("Confirmez la demande dans MetaMask.");

      const transactionHash = await walletClient.writeContract({
        address: MUTATION_ADDRESS,
        abi: MUTATION_ABI,
        functionName: "demanderMutation",
        args: [BigInt(tokenId), acheteur as `0x${string}`],
        ...FRAIS,
      });

      setHash(transactionHash);
      setMessage("Demande envoyée. En attente de confirmation.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Échec de la demande."
      );
    } finally {
      setChargement(false);
    }
  }

  async function accepterMutation() {
    setMessage("");
    setHash("");

    if (!isConnected || !address || !walletClient) {
      setMessage("Connectez le portefeuille acheteur.");
      return;
    }

    if (chainId !== 80002) {
      setMessage("Veuillez sélectionner Polygon Amoy.");
      return;
    }

    try {
      verifierToken();

      if (!isAddress(acheteur)) {
        throw new Error("Adresse de l'acheteur invalide.");
      }

      if (address.toLowerCase() !== acheteur.toLowerCase()) {
        throw new Error("Connectez-vous avec le portefeuille de l'acheteur.");
      }

      setChargement(true);
      setMessage("Confirmez l'acceptation dans MetaMask.");

      const transactionHash = await walletClient.writeContract({
        address: MUTATION_ADDRESS,
        abi: MUTATION_ABI,
        functionName: "accepterMutation",
        args: [BigInt(tokenId)],
        ...FRAIS,
      });

      setHash(transactionHash);
      setMessage("Acceptation envoyée.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Échec de l'acceptation."
      );
    } finally {
      setChargement(false);
    }
  }

  async function autoriserTransfert() {
    setMessage("");
    setHash("");

    if (!isConnected || !address || !walletClient) {
      setMessage("Connectez le portefeuille du vendeur.");
      return;
    }

    if (chainId !== 80002) {
      setMessage("Veuillez sélectionner Polygon Amoy.");
      return;
    }

    try {
      verifierToken();

      setChargement(true);
      setMessage("Confirmez l'autorisation dans MetaMask.");

      const transactionHash = await walletClient.writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "approve",
        args: [MUTATION_ADDRESS, BigInt(tokenId)],
        ...FRAIS,
      });

      setHash(transactionHash);
      setMessage("Autorisation du transfert envoyée.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Échec de l'autorisation."
      );
    } finally {
      setChargement(false);
    }
  }

  // Création de la proposition Safe

  async function creerProposition() {
    setMessage("");
    setHash("");

    try {
      verifierToken();

      setChargement(true);
      setMessage("Préparation de la proposition Safe...");

      const safe = await obtenirSafe();

      const nonce = await safe.getNonce();

      const data = encodeFunctionData({
        abi: MUTATION_ABI,
        functionName: "finaliserMutation",
        args: [BigInt(tokenId)],
      });

      const transaction = await safe.createTransaction({
        transactions: [
          {
            to: MUTATION_ADDRESS,
            value: "0",
            data,
            operation: 0,
          },
        ],
        options: {
          nonce,
        },
      });

      const safeTxHash = await safe.getTransactionHash(transaction);

      const nouvelleProposition: Proposition = {
        chainId: 80002,
        safeAddress: SAFE_ADDRESS,
        tokenId,
        to: MUTATION_ADDRESS,
        value: "0",
        data,
        operation: 0,
        nonce,
        safeTxHash,
      };

      setProposition(nouvelleProposition);
      setPropositionTexte(
        JSON.stringify(nouvelleProposition, null, 2)
      );

      const owners = await safe.getOwners();
      const threshold = await safe.getThreshold();

      setProprietaires(owners);
      setSeuil(threshold);

      const dejaApprouve = await safe.getOwnersWhoApprovedTx(safeTxHash);
      setApprobations(dejaApprouve);

      setMessage("Proposition créée. Partagez-la avec les propriétaires du Safe.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Création impossible."
      );
    } finally {
      setChargement(false);
    }
  }

  // Importation d'une proposition

  async function importerProposition() {
    setMessage("");

    try {
      const donnee = JSON.parse(propositionTexte) as Proposition;

      if (donnee.chainId !== 80002) {
        throw new Error("Cette proposition ne concerne pas Polygon Amoy.");
      }

      if (donnee.safeAddress.toLowerCase() !== SAFE_ADDRESS.toLowerCase()) {
        throw new Error("Adresse Safe incorrecte.");
      }

      if (!donnee.safeTxHash || !donnee.data || !donnee.to) {
        throw new Error("Proposition incomplète.");
      }

      setChargement(true);
      setMessage("Vérification de la proposition...");

      const safe = await obtenirSafe();

      const transaction = await safe.createTransaction({
        transactions: [
          {
            to: donnee.to,
            value: donnee.value,
            data: donnee.data,
            operation: donnee.operation as 0,
          },
        ],
        options: {
          nonce: donnee.nonce,
        },
      });

      const hashCalcule = await safe.getTransactionHash(transaction);

      if (hashCalcule.toLowerCase() !== donnee.safeTxHash.toLowerCase()) {
        throw new Error("Le hash ne correspond pas à la proposition.");
      }

      const owners = await safe.getOwners();
      const threshold = await safe.getThreshold();
      const dejaApprouve = await safe.getOwnersWhoApprovedTx(hashCalcule);

      setProposition(donnee);
      setTokenId(donnee.tokenId);
      setProprietaires(owners);
      setSeuil(threshold);
      setApprobations(dejaApprouve);

      setMessage("Proposition vérifiée avec succès.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Importation impossible."
      );
    } finally {
      setChargement(false);
    }
  }

  // Approbation individuelle on-chain

  async function approuverProposition() {
    setMessage("");
    setHash("");

    if (!proposition) {
      setMessage("Créez ou importez d'abord une proposition.");
      return;
    }

    try {
      setChargement(true);

      const safe = await obtenirSafe();

      const owners = await safe.getOwners();

      if (!owners.some((owner) => owner.toLowerCase() === address?.toLowerCase())) {
        throw new Error("Ce portefeuille n'est pas propriétaire du Safe.");
      }

      const dejaApprouve = await safe.getOwnersWhoApprovedTx(
        proposition.safeTxHash
      );

      if (dejaApprouve.some((owner) => owner.toLowerCase() === address?.toLowerCase())) {
        throw new Error("Ce portefeuille a déjà approuvé cette proposition.");
      }

      setMessage("Confirmez l'approbation dans MetaMask.");

      const resultat = await safe.approveTransactionHash(
        proposition.safeTxHash,
        {
          maxPriorityFeePerGas: "25000000000",
          maxFeePerGas: "100000000000",
        }
      );

      setHash(resultat.hash);
      setMessage("Approbation envoyée. Actualisez les approbations après confirmation.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Approbation impossible."
      );
    } finally {
      setChargement(false);
    }
  }

  // Actualisation des approbations on-chain

  async function actualiserApprobations() {
    if (!proposition) {
      setMessage("Aucune proposition chargée.");
      return;
    }

    try {
      setChargement(true);

      const safe = await obtenirSafe();

      const owners = await safe.getOwners();
      const threshold = await safe.getThreshold();

      const dejaApprouve = await safe.getOwnersWhoApprovedTx(
        proposition.safeTxHash
      );

      setProprietaires(owners);
      setSeuil(threshold);
      setApprobations(dejaApprouve);

      setMessage(
        `${dejaApprouve.length}/${threshold} approbations enregistrées.`
      );
    } catch (error) {
      console.error(error);
      setMessage("Impossible de lire les approbations.");
    } finally {
      setChargement(false);
    }
  }

  // Exécution après les trois approbations

  async function executerMutation() {
    if (!proposition) {
      setMessage("Aucune proposition chargée.");
      return;
    }

    try {
      setChargement(true);

      const safe = await obtenirSafe();

      const ownersApprouves = await safe.getOwnersWhoApprovedTx(
        proposition.safeTxHash
      );

      setApprobations(ownersApprouves);

      if (ownersApprouves.length < seuil) {
        throw new Error(
          `Il faut ${seuil} approbations. Actuellement : ${ownersApprouves.length}.`
        );
      }

      const nonceActuel = await safe.getNonce();

      if (nonceActuel !== proposition.nonce) {
        throw new Error(
          "Le nonce Safe a changé. Cette proposition doit être recréée."
        );
      }

      const transaction = await safe.createTransaction({
        transactions: [
          {
            to: proposition.to,
            value: proposition.value,
            data: proposition.data,
            operation: proposition.operation as 0,
          },
        ],
        options: {
          nonce: proposition.nonce,
        },
      });

      const hashCalcule = await safe.getTransactionHash(transaction);

      if (hashCalcule.toLowerCase() !== proposition.safeTxHash.toLowerCase()) {
        throw new Error("Le hash de la transaction est différent.");
      }

      setMessage("Confirmez l'exécution collective dans MetaMask.");

      const resultat = await safe.executeTransaction(transaction, {
        maxPriorityFeePerGas: "25000000000",
        maxFeePerGas: "100000000000",
      });

      setHash(resultat.hash);
      setMessage("Transaction Safe exécutée. Attendez sa confirmation.");

      const response = resultat.transactionResponse as any;

      if (response?.wait) {
        await response.wait();
      }

      setMessage("Mutation exécutée avec succès sur Polygon Amoy !");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Échec de l'exécution."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-slate-700 bg-slate-900 p-6">
      <h2 className="mb-5 text-2xl font-bold text-emerald-400">
        Gestion des mutations foncières
      </h2>

      <div className="grid gap-4">
        <input
          type="number"
          min="1"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="Identifiant NFT de la parcelle"
          className="rounded-lg border border-slate-700 bg-slate-800 p-3"
        />

        <input
          type="text"
          value={acheteur}
          onChange={(e) => setAcheteur(e.target.value)}
          placeholder="Adresse du portefeuille de l'acheteur"
          className="rounded-lg border border-slate-700 bg-slate-800 p-3"
        />

        <button
          type="button"
          onClick={demanderMutation}
          disabled={chargement || !tokenId || !acheteur}
          className="rounded-lg bg-emerald-600 p-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
        >
          Demander une mutation
        </button>

        <button
          type="button"
          onClick={accepterMutation}
          disabled={chargement || !tokenId || !acheteur}
          className="rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
        >
          Accepter la mutation
        </button>

        <button
          type="button"
          onClick={autoriserTransfert}
          disabled={chargement || !tokenId}
          className="rounded-lg bg-purple-600 p-3 font-semibold hover:bg-purple-500 disabled:opacity-50"
        >
          Autoriser le transfert NFT
        </button>
      </div>

      <div className="mt-8 border-t border-slate-700 pt-5">
        <h3 className="mb-4 text-xl font-semibold text-emerald-400">
          Validation collective du Safe (3/3)
        </h3>

        <button
          type="button"
          onClick={creerProposition}
          disabled={chargement || !tokenId}
          className="w-full rounded-lg bg-indigo-600 p-3 font-semibold hover:bg-indigo-500 disabled:opacity-50"
        >
          1. Créer la proposition de mutation
        </button>

        <textarea
          value={propositionTexte}
          onChange={(e) => setPropositionTexte(e.target.value)}
          placeholder="La proposition JSON apparaîtra ici. Les autres propriétaires pourront coller leur proposition ici."
          rows={7}
          className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs"
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={chargement || !propositionTexte}
            onClick={async () => {
              await navigator.clipboard.writeText(propositionTexte);
              setMessage("Proposition copiée. Partagez-la aux deux autres propriétaires.");
            }}
            className="rounded-lg bg-slate-700 p-3 font-semibold hover:bg-slate-600 disabled:opacity-50"
          >
            Copier la proposition
          </button>

          <button
            type="button"
            onClick={importerProposition}
            disabled={chargement || !propositionTexte}
            className="rounded-lg bg-slate-700 p-3 font-semibold hover:bg-slate-600 disabled:opacity-50"
          >
            2. Importer / vérifier
          </button>
        </div>

        {proposition && (
          <div className="mt-5 rounded-lg border border-slate-700 p-4">
            <p className="mb-2 break-all text-xs text-slate-400">
              Hash Safe : {proposition.safeTxHash}
            </p>

            <p className="mb-3 text-sm text-slate-300">
              Approbations enregistrées : {approbations.length}/{seuil}
            </p>

            <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (approbations.length / seuil) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="mb-4 space-y-2">
              {proprietaires.map((owner) => {
                const approuve = approbations.some(
                  (item) => item.toLowerCase() === owner.toLowerCase()
                );

                return (
                  <p
                    key={owner}
                    className="break-all text-xs text-slate-300"
                  >
                    {approuve ? "✅" : "⏳"} {owner}
                  </p>
                );
              })}
            </div>

            <button
              type="button"
              onClick={approuverProposition}
              disabled={chargement || approbations.some(
                (item) => item.toLowerCase() === address?.toLowerCase()
              )}
              className="mb-3 w-full rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              3. Approuver avec mon portefeuille
            </button>

            <button
              type="button"
              onClick={actualiserApprobations}
              disabled={chargement}
              className="mb-3 w-full rounded-lg bg-slate-700 p-3 font-semibold hover:bg-slate-600 disabled:opacity-50"
            >
              Actualiser les approbations
            </button>

            <button
              type="button"
              onClick={executerMutation}
              disabled={chargement || approbations.length < seuil}
              className="w-full rounded-lg bg-emerald-600 p-3 font-bold hover:bg-emerald-500 disabled:opacity-50"
            >
              4. Exécuter la mutation après validation 3/3
            </button>
          </div>
        )}
      </div>

      {message && (
        <p className="mt-5 break-words text-sm text-yellow-400">
          {message}
        </p>
      )}

      {hash && (
        <p className="mt-2 break-all text-xs text-slate-400">
          Hash de transaction : {hash}
        </p>
      )}

      {address && (
        <p className="mt-3 break-all text-xs text-slate-400">
          Portefeuille connecté : {address}
        </p>
      )}
    </section>
  );
}