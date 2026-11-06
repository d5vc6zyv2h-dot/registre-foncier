"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";

import { polygonAmoy } from "wagmi/chains";

import {
  isAddress,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";

import RegistreArtifact from "../../abi/RegistreFoncier.json";

const CONTRAT =
  "0xBc286E3CF170c8D418DdA7861FF0d1b9ACEc89E7" as Address;

const ABI = RegistreArtifact.abi as any;

export default function AdministrationPage() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [adresseCible, setAdresseCible] = useState("");
  const [message, setMessage] = useState("");

  const adresseValide = isAddress(adresseCible);
  const reseauCorrect = chainId === polygonAmoy.id;

  // Récupération des identifiants des rôles
  const { data: adminRoleData } = useReadContract({
    address: CONTRAT,
    abi: ABI,
    functionName: "DEFAULT_ADMIN_ROLE",
    chainId: polygonAmoy.id,
  });

  const { data: agentRoleData } = useReadContract({
    address: CONTRAT,
    abi: ABI,
    functionName: "AGENT_CADASTRE",
    chainId: polygonAmoy.id,
  });

  const adminRole = adminRoleData as Hex | undefined;
  const agentRole = agentRoleData as Hex | undefined;

  // Vérification des autorisations du portefeuille connecté
  const {
    data: estAdmin,
    refetch: verifierAdmin,
  } = useReadContract({
    address: CONTRAT,
    abi: ABI,
    functionName: "hasRole",
    args: [adminRole ?? zeroHash, address ?? zeroAddress],
    chainId: polygonAmoy.id,
    query: {
      enabled: Boolean(adminRole && address && reseauCorrect),
    },
  });

  const {
    data: estAgent,
    refetch: verifierAgent,
  } = useReadContract({
    address: CONTRAT,
    abi: ABI,
    functionName: "hasRole",
    args: [agentRole ?? zeroHash, address ?? zeroAddress],
    chainId: polygonAmoy.id,
    query: {
      enabled: Boolean(agentRole && address && reseauCorrect),
    },
  });

  // Vérification des autorisations du portefeuille cible
  const {
    data: cibleAdmin,
    refetch: verifierCibleAdmin,
  } = useReadContract({
    address: CONTRAT,
    abi: ABI,
    functionName: "hasRole",
    args: [adminRole ?? zeroHash, (adresseValide ? adresseCible : zeroAddress) as Address],
    chainId: polygonAmoy.id,
    query: {
      enabled: Boolean(adminRole && adresseValide && reseauCorrect),
    },
  });

  const {
    data: cibleAgent,
    refetch: verifierCibleAgent,
  } = useReadContract({
    address: CONTRAT,
    abi: ABI,
    functionName: "hasRole",
    args: [agentRole ?? zeroHash, (adresseValide ? adresseCible : zeroAddress) as Address],
    chainId: polygonAmoy.id,
    query: {
      enabled: Boolean(agentRole && adresseValide && reseauCorrect),
    },
  });

  // Transactions blockchain
  const {
    writeContractAsync,
    data: hash,
    isPending,
  } = useWriteContract();

  const {
    isLoading: confirmationEnCours,
    isSuccess: transactionConfirmee,
  } = useWaitForTransactionReceipt({
    hash,
    chainId: polygonAmoy.id,
  });

  // Actualisation des autorisations
  async function actualiser() {
    if (address && reseauCorrect) {
      await Promise.all([
        verifierAdmin(),
        verifierAgent(),
      ]);
    }

    if (adresseValide && reseauCorrect) {
      await Promise.all([
        verifierCibleAdmin(),
        verifierCibleAgent(),
      ]);
    }
  }

  useEffect(() => {
    if (transactionConfirmee) {
      actualiser();
      setMessage("Transaction confirmée. Autorisations actualisées.");
    }
  }, [transactionConfirmee]);

  // Attribution ou retrait d'un rôle
  async function modifierRole(
    role: Hex,
    action: "grantRole" | "revokeRole"
  ) {
    if (!isConnected || !address) {
      setMessage("Veuillez connecter votre portefeuille.");
      return;
    }

    if (!adresseValide) {
      setMessage("Adresse du portefeuille invalide.");
      return;
    }

    if (!reseauCorrect) {
      setMessage("Veuillez sélectionner le réseau Polygon Amoy.");
      return;
    }

    if (estAdmin !== true) {
      setMessage("Accès refusé : vous n'êtes pas administrateur.");
      return;
    }

    try {
      setMessage("Veuillez confirmer la transaction dans MetaMask...");

      await writeContractAsync({
        address: CONTRAT,
        abi: ABI,
        functionName: action,
        args: [role, adresseCible as Address],
        chainId: polygonAmoy.id,
      });

      setMessage("Transaction envoyée. En attente de confirmation...");
    } catch (error: any) {
      setMessage(
        error?.shortMessage ||
          error?.message ||
          "La transaction a échoué."
      );
    }
  }

  async function verifierAdresse() {
    if (!adresseValide) {
      setMessage("Veuillez saisir une adresse Ethereum valide.");
      return;
    }

    if (!reseauCorrect) {
      setMessage("Veuillez sélectionner Polygon Amoy.");
      return;
    }

    await actualiser();
    setMessage("Vérification effectuée.");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-400">
            Administration du cadastre
          </h1>

          <p className="mt-2 text-slate-400">
            Gestion des agents cadastraux et des administrateurs.
          </p>
        </div>

        {!isConnected ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Connexion MetaMask
            </h2>

            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                className="mr-3 rounded-lg bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500"
              >
                Connecter {connector.name}
              </button>
            ))}
          </section>
        ) : (
          <>
            <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-3 text-xl font-semibold">
                Portefeuille connecté
              </h2>

              <p className="break-all text-sm text-slate-300">
                {address}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => disconnect()}
                  className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600"
                >
                  Déconnecter
                </button>

                {!reseauCorrect && (
                  <button
                    onClick={() =>
                      switchChain({ chainId: polygonAmoy.id })
                    }
                    className="rounded-lg bg-orange-600 px-4 py-2 hover:bg-orange-500"
                  >
                    Passer sur Polygon Amoy
                  </button>
                )}
              </div>

              <div className="mt-5 border-t border-slate-700 pt-4">
                <h3 className="mb-3 font-semibold">
                  Mes autorisations
                </h3>

                <p className="mb-2">
                  Administrateur :{" "}
                  <span className={
                    estAdmin === true
                      ? "text-emerald-400"
                      : estAdmin === false
                        ? "text-red-400"
                        : "text-yellow-400"
                  }>
                    {estAdmin === undefined
                      ? "Vérification..."
                      : estAdmin
                        ? "OUI"
                        : "NON"}
                  </span>
                </p>

                <p>
                  Agent cadastral :{" "}
                  <span className={
                    estAgent === true
                      ? "text-emerald-400"
                      : estAgent === false
                        ? "text-red-400"
                        : "text-yellow-400"
                  }>
                    {estAgent === undefined
                      ? "Vérification..."
                      : estAgent
                        ? "OUI"
                        : "NON"}
                  </span>
                </p>
              </div>
            </section>

            {reseauCorrect && estAdmin === true ? (
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-xl font-semibold">
                  Gestion des rôles
                </h2>

                <label className="mb-2 block text-sm text-slate-300">
                  Adresse du portefeuille à gérer
                </label>

                <input
                  type="text"
                  value={adresseCible}
                  onChange={(e) => setAdresseCible(e.target.value.trim())}
                  placeholder="0x..."
                  className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white outline-none focus:border-emerald-500"
                />

                <button
                  onClick={verifierAdresse}
                  disabled={!adresseValide}
                  className="mb-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-40"
                >
                  Vérifier les rôles
                </button>

                {adresseValide && (
                  <div className="mb-6 rounded-xl bg-slate-800 p-4">
                    <p className="mb-2 font-semibold">
                      Autorisations du portefeuille :
                    </p>

                    <p>
                      Administrateur :{" "}
                      {cibleAdmin === undefined
                        ? "Vérification..."
                        : cibleAdmin
                          ? "OUI"
                          : "NON"}
                    </p>

                    <p>
                      Agent cadastral :{" "}
                      {cibleAgent === undefined
                        ? "Vérification..."
                        : cibleAgent
                          ? "OUI"
                          : "NON"}
                    </p>
                  </div>
                )}

                <div className="space-y-6">

                  <div className="rounded-xl border border-slate-700 p-4">
                    <h3 className="mb-3 font-semibold text-emerald-400">
                      Agent cadastral
                    </h3>

                    <button
                      onClick={() =>
                        agentRole && modifierRole(agentRole, "grantRole")
                      }
                      disabled={!adresseValide || isPending || !agentRole}
                      className="mr-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-40"
                    >
                      Attribuer le rôle
                    </button>

                    <button
                      onClick={() =>
                        agentRole && modifierRole(agentRole, "revokeRole")
                      }
                      disabled={!adresseValide || isPending || !agentRole}
                      className="rounded-lg bg-red-700 px-4 py-3 font-semibold hover:bg-red-600 disabled:opacity-40"
                    >
                      Retirer le rôle
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-700 p-4">
                    <h3 className="mb-3 font-semibold text-yellow-400">
                      Administrateur
                    </h3>

                    <button
                      onClick={() =>
                        adminRole && modifierRole(adminRole, "grantRole")
                      }
                      disabled={!adresseValide || isPending || !adminRole}
                      className="mr-2 rounded-lg bg-yellow-600 px-4 py-3 font-semibold hover:bg-yellow-500 disabled:opacity-40"
                    >
                      Attribuer le rôle
                    </button>

                    <button
                      onClick={() =>
                        adminRole && modifierRole(adminRole, "revokeRole")
                      }
                      disabled={!adresseValide || isPending || !adminRole}
                      className="rounded-lg bg-red-700 px-4 py-3 font-semibold hover:bg-red-600 disabled:opacity-40"
                    >
                      Retirer le rôle
                    </button>

                    <p className="mt-3 text-xs text-slate-400">
                      Attention : un administrateur peut gérer les
                      autorisations des autres portefeuilles.
                    </p>
                  </div>
                </div>
              </section>
            ) : reseauCorrect ? (
              <div className="rounded-xl border border-red-800 bg-red-950 p-5 text-red-300">
                Accès refusé : ce portefeuille ne possède pas le rôle
                administrateur.
              </div>
            ) : (
              <div className="rounded-xl border border-orange-700 bg-orange-950 p-5 text-orange-300">
                Connectez-vous au réseau Polygon Amoy pour gérer les rôles.
              </div>
            )}
          </>
        )}

        {(message || hash || confirmationEnCours) && (
          <section className="mt-6 break-all rounded-xl border border-slate-700 bg-slate-900 p-5">
            <p>{message}</p>

            {hash && (
              <p className="mt-2 text-sm text-slate-400">
                Transaction :{" "}
                <a
                  href={`https://amoy.polygonscan.com/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline"
                >
                  Voir sur PolygonScan
                </a>
              </p>
            )}

            {confirmationEnCours && (
              <p className="mt-2 text-yellow-400">
                Confirmation blockchain en cours...
              </p>
            )}

            {transactionConfirmee && (
              <p className="mt-3 text-emerald-400">
                Transaction confirmée sur la blockchain.
              </p>
            )}
          </section>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Registre Foncier — Polygon Amoy — Contrat intelligent sécurisé
        </p>

      </div>
    </main>
  );
}