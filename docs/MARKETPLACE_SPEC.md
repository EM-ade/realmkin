# Realmkin Marketplace Specification

Last updated: 2025-11-12

## 1) Executive Summary

- **Goal**: Launch a non-custodial NFT marketplace on Solana where all prices and fees are in MKIN (Realmkin token).
- **Protocol**: Metaplex Auction House (AH), configured with MKIN as the treasury mint.
- **Listing Types**: Fixed-price (Buy Now) and Offers (dynamic bids). Sellers can accept offers.
- **Fees & Royalties**: AH handles royalties automatically. Platform fees are routed to a dedicated Burn Collector wallet; MKIN fees are periodically withdrawn and burned via SPL burn transactions.
- **Custody**: No user assets are held by our wallet. Listings and offers are escrowed by AH PDAs.
- **Indexing**: On-chain is the source of truth. We mirror events to Firestore via a webhook (Helius recommended) for fast UI and analytics.


## 2) Scope and Out-of-Scope

- **In scope (MVP)**
  - Browse listings, filter/sort, view NFT details
  - List NFT with fixed price or offers-only
  - Buy Now checkout in MKIN
  - Place MKIN offers (bids) and seller acceptance
  - Activity feed, basic analytics (volume, floor)
  - Collection allowlist/blocked mints enforcement via admin config

- **Out of scope (deferred)**
  - "Listed tokens to sell" (FT/OTC marketplace). Instead, we integrate a swap path (Jupiter) so buyers can acquire MKIN during checkout.
  - Custom smart contracts. We reuse AH; no new program to write/audit.
  - pNFT/authorization rules beyond standard NFTs in v1.


## 3) Architecture Overview

- **Frontend (Next.js)**: `src/app/marketplace/page.tsx` with tabs: Browse, Sell, My Listings & Offers, Activity. Components in `src/components/marketplace/`.
- **Wallet**: Uses existing `src/contexts/SolanaWalletProvider.tsx`.
- **Protocol**: Metaplex AH v2, MKIN as treasury mint. Program PDAs escrow assets and bids.
- **Indexer**: Cloud Function receives Helius webhook events and writes normalized docs to Firestore.
- **Database**: Firestore for listings/offers/sales/activity snapshots, plus config and metrics.
- **Fees**: AH fee routed to a Burn Collector wallet; CF withdraws MKIN fees and executes SPL burn.


## 4) Fees → Burn Wallet Policy (MKIN Burn Mechanism)

- **Policy**: 100% of marketplace platform fees (denominated in MKIN) are sent to a designated Burn Collector wallet and then burned to permanently reduce MKIN total supply.

- **AH Configuration**
  - Treasury mint: `MKIN` (SPL token). Env: `NEXT_PUBLIC_MKIN_MINT`, `NEXT_PUBLIC_MKIN_DECIMALS`.
  - Platform fee (BPS) set in AH. Env: `NEXT_PUBLIC_PLATFORM_FEE_BPS` (e.g., 200 = 2%).
  - Fee recipient (treasury withdrawal destination): set to Burn Collector owner wallet.

- **Operational Flow**
  1. Buyer pays in MKIN; AH accrues platform fee according to BPS config.
  2. Periodically, a Cloud Function calls AH `withdrawFromTreasury` to move MKIN fees to the Burn Collector ATA (Associated Token Account) for MKIN.
  3. The same job submits an SPL `Burn` instruction from the Burn Collector ATA, destroying MKIN and reducing total supply.

- **Why SPL Burn vs “dead” address**
  - Sending to a random or incinerator-like address does not reduce total supply for SPL tokens; it only makes tokens inaccessible. SPL `Burn` is the canonical and transparent supply‑reducing mechanism.

- **Security & Key Management**
  - The Cloud Function needs a signer (Burn Operator key) to:
    - Withdraw AH treasury fees (authority on AH) and
    - Burn MKIN from the Burn Collector ATA (ATA owner).
  - Store the key in a secure secret manager (Firebase/Google Secret Manager), never in code.
  - Restrict its permissions; rotate keys regularly; add monitoring and alerts on burn jobs.

- **Scheduling**
  - Run burn job on a schedule (e.g., hourly/daily) or threshold (e.g., ≥ X MKIN).
  - Optionally support manual/one‑off burns via an admin panel.

- **Auditability**
  - Persist every burn event in Firestore `burns/{id}` with `amount`, `txSig`, `timestamp`.
  - Public burn dashboard with total MKIN burned and historical chart.


## 5) User Flows

- **Fixed‑Price Listing (Sell → Fixed)**
  1. Seller connects wallet and selects owned NFT.
  2. Seller sets MKIN price and lists via AH `sell`.
  3. AH escrows/seals the NFT via PDA; listing appears (indexed to Firestore).

- **Buy Now**
  1. Buyer clicks Buy Now.
  2. If the buyer lacks MKIN, they are prompted with a Jupiter swap to acquire MKIN.
  3. Buyer signs purchase; AH transfers NFT to buyer; MKIN to seller; royalties and platform fee are taken automatically.

- **Offers (Dynamic)**
  1. Buyer places an MKIN offer (AH bid), escrowed by AH PDA.
  2. Seller sees offers under “My Listings & Offers”.
  3. Seller accepts an offer; AH executes sale with the selected offer.

- **Cancel**
  - Seller cancels listing; buyer cancels offer; AH unlocks escrow; indexer updates Firestore.


## 6) Firestore Data Model

Collections (read‑only to clients; writes by Cloud Functions):

- `marketplace_configs/{env}`
  - `auction_house` (address)
  - `treasury_mint` (MKIN mint)
  - `fee_bps` (number)
  - `approved_collections` (string[])
  - `blocked_mints` (string[])

- `listings/{tradeStatePDA}`
  - `mint` (string)
  - `seller` (string)
  - `price` (number)
  - `currency` = "MKIN"
  - `state` = "active" | "sold" | "canceled"
  - `auctionHouse` (address)
  - `createdAt` (timestamp)
  - `expiresAt?` (timestamp)
  - `collection` (string)
  - `name` (string)
  - `image` (string)

- `offers/{bidTradeStatePDA}`
  - `mint` (string)
  - `buyer` (string)
  - `price` (number)
  - `state` = "open" | "accepted" | "canceled"
  - `createdAt` (timestamp)
  - `expiresAt?` (timestamp)

- `sales/{txSig}`
  - `mint` (string)
  - `buyer` (string)
  - `seller` (string)
  - `price` (number)
  - `feeBps` (number)
  - `royaltiesPaid` (array: {creator, amount})
  - `executedAt` (timestamp)
  - `txSig` (string)

- `activity/{id}`
  - `type` = "list" | "offer" | "sale" | "cancel"
  - `mint` (string)
  - `actor` (string)
  - `price?` (number)
  - `ts` (timestamp)

- `burns/{id}`
  - `amount` (number)
  - `txSig` (string)
  - `timestamp` (timestamp)

Indexes: composite indices for queries on `listings` (state+collection+price, state+price), `offers` (mint+price), `activity` (type+ts).


## 7) Firestore Security Rules (High-Level)

- Public read for `listings`, `offers`, `sales`, `activity`, `marketplace_configs`, `burns`.
- Deny all client writes to those collections.
- Allow writes only from Firebase service account (Cloud Functions) via token claims or App Check.
- Enforce collection whitelist/blocked mints in the indexer (server side).


## 8) Indexing & Webhooks

- **Source**: Helius webhook (recommended) or QuickNode.
- **Handler**: `functions/src/marketplace/indexer.ts` parses AH events:
  - `sell` → upsert active `listings`
  - `execute_sale` → mark `listings` as sold, add `sales`, `activity`
  - `cancel` → mark `listings`/`offers` canceled
  - `bid` → upsert `offers`
- **Normalization**: resolve NFT name/image from metadata, map to collection, filter by `approved_collections` and `blocked_mints`.


## 9) Frontend Structure

- Page: `src/app/marketplace/page.tsx` (use client) with tabs:
  - **Browse**: Grid of cards, filters (collection, price, traits), sorting (price/time), skeleton loaders.
  - **Sell**: `SellForm.tsx` → choose NFT, set fixed price or offers‑only, list via AH client.
  - **My Listings & Offers**: `MyListings.tsx` + `OfferList.tsx` with cancel and accept actions.
  - **Activity**: Recent marketplace activity from Firestore.

- Components (`src/components/marketplace/`):
  - `Browse.tsx`, `SellForm.tsx`, `MyListings.tsx`, `OfferList.tsx`, `CheckoutDrawer.tsx`

- Hooks (`src/hooks/marketplace/`):
  - `useAuctionHouse.ts` → list, buyNow, bid, accept, cancel
  - `useMKINBalance.ts` → reads MKIN ATA balance
  - `useListings.ts`, `useOffers.ts` → Firestore queries

- Reuse from existing project:
  - Wallet context: `src/contexts/SolanaWalletProvider.tsx`
  - NFT card/3D viewer from My NFT page components
  - Admin collection config (whitelist) logic


## 10) MKIN Checkout & Jupiter Swap Integration

- If buyer MKIN balance is insufficient, `CheckoutDrawer.tsx` offers a seamless swap via Jupiter (SOL/USDC → MKIN), then retries Buy Now.
- This replaces a separate FT marketplace and simplifies v1 while maintaining great UX.


## 11) Environment Variables

- Client
  - `NEXT_PUBLIC_MKIN_MINT`
  - `NEXT_PUBLIC_MKIN_DECIMALS`
  - `NEXT_PUBLIC_AH_ADDRESS` (devnet/mainnet)
  - `NEXT_PUBLIC_PLATFORM_FEE_BPS`
  - `NEXT_PUBLIC_APPROVED_COLLECTIONS` (optional if not Firestore‑driven)

- Server (Functions)
  - `HELIUS_API_KEY`, `HELIUS_WEBHOOK_SECRET`
  - `BURN_OPERATOR_PRIVATE_KEY` (service wallet JSON), `BURN_COLLECTOR_WALLET`


## 12) Cloud Functions

- `functions/src/marketplace/indexer.ts`
  - Verify webhook signature
  - Parse AH events
  - Normalize & write to Firestore; enforce whitelist/blocklist

- `functions/src/marketplace/cleanup.ts`
  - Optional: close or mark stale listings/offers

- `functions/src/marketplace/metrics.ts`
  - Aggregations: volume, floor, unique traders

- `functions/src/marketplace/burner.ts` (scheduled)
  - `withdrawFromTreasury` to Burn Collector ATA
  - SPL `Burn` MKIN
  - Record in `burns` collection

Pseudo-code for burn job:
```ts
// Pseudocode
const ah = getAuctionHouse(NEXT_PUBLIC_AH_ADDRESS);
const burnCollector = new PublicKey(process.env.BURN_COLLECTOR_WALLET!);
const mkinMint = new PublicKey(process.env.NEXT_PUBLIC_MKIN_MINT!);
const burnCollectorAta = await getOrCreateATA(burnCollector, mkinMint);
await ah.withdrawFromTreasury({ destination: burnCollectorAta, amount: ALL_AVAILABLE });
await splToken.burn({ account: burnCollectorAta, mint: mkinMint, owner: burnCollector, amount: WITHDRAWN_AMOUNT });
await firestore.collection('burns').add({ amount, txSig, timestamp: now() });
```


## 13) Testing Plan

- Devnet AH deployed with MKIN dev-mint; sandbox wallets for buyer/seller.
- E2E flows: list (fixed), buy now, place offer, accept offer, cancel listing/offer.
- Verify royalties and platform fee distribution.
- Burn job test: simulate fee accrual, run burn, confirm supply decrease and `burns` record.


## 14) Analytics & Activity

- Track `sales` for volume and floor by collection.
- `activity` feed for UI, paginate by timestamp.
- Optional: dashboard showing total MKIN burned, marketplace revenue (pre-burn), number of traders.


## 15) Security & Compliance Notes

- Non-custodial: assets and bids are escrowed by AH PDAs, not our wallet.
- Keys in secret manager; never commit to repo.
- App Check and function auth for write access to Firestore.
- Admin panel to manage `approved_collections` and `blocked_mints`.


## 16) Setup Steps (Devnet → Mainnet)

1. Confirm MKIN mint and decimals; configure env.
2. Create Auction House with MKIN treasury; record address in env and Firestore `marketplace_configs`.
3. Configure platform fee BPS and fee recipient (Burn Collector wallet owner).
4. Deploy Helius webhook and Cloud Functions (`indexer`, `burner`).
5. Scaffold UI pages and hooks; wire Firestore queries.
6. Run devnet E2E tests; verify burn job.
7. Roll out to mainnet with increased monitoring.


## 17) Alternatives Considered

- Custodial wallet holdings: rejected due to risk and compliance.
- Custom Anchor marketplace: deferred due to cost/time; AH covers requirements.
- Token (FT) marketplace: replaced with Jupiter swap for MKIN acquisition.


## 18) File Map (planned)

- New
  - `src/app/marketplace/page.tsx`
  - `src/components/marketplace/Browse.tsx`
  - `src/components/marketplace/SellForm.tsx`
  - `src/components/marketplace/MyListings.tsx`
  - `src/components/marketplace/OfferList.tsx`
  - `src/components/marketplace/CheckoutDrawer.tsx`
  - `src/hooks/marketplace/useAuctionHouse.ts`
  - `src/hooks/marketplace/useMKINBalance.ts`
  - `functions/src/marketplace/indexer.ts`
  - `functions/src/marketplace/cleanup.ts`
  - `functions/src/marketplace/metrics.ts`
  - `functions/src/marketplace/burner.ts`
  - `src/config/marketplace.ts`

- Modify
  - `firestore.rules` (read-only public, CF writes)
  - `functions/src/index.ts` (export new functions)
  - `package.json` (Metaplex, Helius libraries if missing)


## 19) Open Questions

- Final platform fee BPS?
- Initial approved collections?
- Burn schedule (hourly/daily/threshold)?
- pNFT support timeline?
