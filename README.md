# 🏛️ Registre Foncier Numérique sur Blockchain

**Plateforme décentralisée de gestion et de sécurisation des titres fonciers à l'aide de la technologie Blockchain.**

## 📌 Présentation du projet

Le Registre Foncier Numérique est une application décentralisée (DApp) conçue dans le but de moderniser la gestion des propriétés foncières grâce à la technologie Blockchain.

Le projet vise à améliorer la transparence, la traçabilité et la sécurité des transactions foncières, tout en réduisant les risques de falsification des titres de propriété et de conflits liés aux mutations immobilières.

Chaque parcelle est représentée par un NFT (Non-Fungible Token) basé sur le standard ERC-721. Les informations et l'historique des propriétaires sont gérés à travers des contrats intelligents.

## 🎯 Objectifs

- Numériser l'enregistrement des parcelles foncières.
- Garantir la traçabilité des changements de propriétaires.
- Sécuriser les mutations grâce aux signatures numériques.
- Conserver les documents fonciers sur IPFS.
- Permettre la consultation publique des informations cadastrales.
- Renforcer la transparence dans la gestion foncière.

## ⚙️ Fonctionnalités principales

### 1. Gestion des parcelles
- Enregistrement de nouvelles parcelles.
- Attribution d'un identifiant unique à chaque parcelle.
- Création d'un NFT représentant le titre foncier.
- Conservation des informations cadastrales.

### 2. Gestion des propriétaires
- Identification du propriétaire d'une parcelle.
- Consultation de l'historique des propriétaires.
- Traçabilité des changements de propriété.

### 3. Mutation foncière
Le processus de mutation permet le transfert d'une parcelle d'un propriétaire à un autre.

Il repose sur un mécanisme de validation nécessitant les signatures des parties concernées :
- Le vendeur.
- L'acheteur.
- Le conservateur des titres fonciers.

La validation est organisée à travers un portefeuille multisignature Safe.

### 4. Stockage décentralisé
Les documents et métadonnées associés aux parcelles peuvent être stockés sur IPFS à l'aide de Pinata.

### 5. Consultation des parcelles
- Recherche des parcelles.
- Consultation des informations cadastrales.
- Visualisation géographique des parcelles sur une carte interactive.

## 🧰 Technologies utilisées

| Technologie | Utilisation |
|---|---|
| Next.js | Framework de développement frontend |
| React | Interface utilisateur |
| TypeScript | Typage et structuration du code |
| Solidity | Développement des contrats intelligents |
| Ethereum ERC-721 | Représentation des parcelles sous forme de NFT |
| OpenZeppelin | Bibliothèques de contrats intelligents |
| Polygon Amoy | Réseau Blockchain de test |
| Ethers.js | Interaction avec les contrats intelligents |
| MetaMask | Connexion des portefeuilles |
| Safe | Gestion des signatures multisignatures |
| IPFS | Stockage décentralisé des documents |
| Pinata | Gestion du stockage IPFS |
| Leaflet / OpenStreetMap | Cartographie interactive |
| Vercel | Hébergement de l'application |

## 🔗 Informations Blockchain

**Réseau :** Polygon Amoy  
**Chain ID :** 80002

### Contrats déployés

| Contrat | Adresse |
|---|---|
| Registre Foncier | `0xBc286E3CF170c8D418DdA7861FF0d1b9ACEc89E7` |
| Gestion des Mutations | `0x3624E855A2203612744a4b7166518Fd4ef0587AD` |
| Safe Multisignature | `0x0B2F3B461E2B275Ed41d113B3DA9e614b774562c` |

## 🚀 Démonstration en ligne

L'application est accessible à l'adresse suivante :

**https://registre-foncier-beryl.vercel.app/**

## 💻 Installation et exécution locale

### Prérequis

- Node.js
- npm
- Git
- Un navigateur web
- MetaMask pour les interactions Blockchain

### 1. Cloner le dépôt

```bash
git clone https://github.com/d5vc6zyv2h-dot/registre-foncier.git
```

### 2. Accéder au projet

```bash
cd registre-foncier
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Configurer les variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```env
PINATA_JWT=votre_cle_secrete_pinata
NEXT_PUBLIC_GATEWAY_URL=votre_adresse_gateway
```

Remplacer les valeurs par vos propres informations.

**Important :** Ne jamais publier le fichier `.env.local` ni partager la clé secrète Pinata.

### 5. Démarrer l'application

```bash
npm run dev
```

Ouvrir ensuite :

http://localhost:3000

## 🗂️ Structure générale du projet

```text
registre-foncier/
│
├── public/
│
├── src/
│   ├── abi/
│   │   ├── GestionMutations.json
│   │   └── RegistreFoncier.json
│   │
│   ├── app/
│   │   ├── administration/
│   │   ├── api/
│   │   ├── signature-safe/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   │
│   ├── components/
│   │   ├── CarteParcelles.tsx
│   │   └── MutationPanel.tsx
│   │
│   └── lib/
│       └── wagmi.ts
│
├── .env.local
├── package.json
├── package-lock.json
└── README.md
```

## 🔐 Sécurité

Le projet utilise plusieurs mécanismes de sécurité :

- Contrôle des accès avec OpenZeppelin AccessControl.
- Vérification des rôles administratifs.
- Validation des opérations par contrats intelligents.
- Signatures multisignatures pour les mutations.
- Conservation décentralisée des documents sur IPFS.

## 📚 Contexte académique

Ce projet est réalisé dans un cadre académique afin d'étudier et de mettre en pratique les possibilités offertes par la technologie Blockchain dans la modernisation du système cadastral.

Il constitue un prototype expérimental destiné à illustrer l'utilisation des contrats intelligents, des NFT, du stockage décentralisé et des mécanismes de signatures numériques dans la gestion foncière.

**Statut :** Prototype fonctionnel sur le réseau de test Polygon Amoy.

---

## 👨‍💻 Auteur

**Jordan Mvuezolo Tshitshi**

Projet académique — Registre Foncier Numérique sur Blockchain.