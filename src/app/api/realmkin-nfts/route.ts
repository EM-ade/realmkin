import { NextResponse } from "next/server";

const MAGIC_EDEN_BASE = "https://api-mainnet.magiceden.dev/v2";
const COLLECTION = "the_realmkin_kins";
const LISTING_LIMIT = 20;

interface MagicEdenListing {
  tokenMint?: string;
  tokenName?: string;
  price?: number;
  seller?: string;
}

interface MagicEdenTokenMetadata {
  mintAddress?: string;
  image?: string;
  name?: string;
  attributes?: Array<{ trait_type?: string; value?: string }>;
}

export async function GET() {
  try {
    const listingsRes = await fetch(
      `${MAGIC_EDEN_BASE}/collections/${COLLECTION}/listings?offset=0&limit=${LISTING_LIMIT}`,
      {
        headers: {
          accept: "application/json",
        },
        // Magic Eden API requires a POST for some endpoints, but listings respects GET with no-cache.
        // Avoid caching so users always see the freshest collection items.
        cache: "no-store",
      }
    );

    if (!listingsRes.ok) {
      const message = await listingsRes.text();
      return NextResponse.json(
        { error: "Failed to fetch collection listings", detail: message },
        { status: listingsRes.status }
      );
    }

    const listingsData: MagicEdenListing[] = await listingsRes.json();
    const listingMints = (listingsData ?? [])
      .map((listing) => listing.tokenMint)
      .filter(Boolean) as string[];

    if (!listingMints.length) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const tokenRequests = listingMints.map(async (mint) => {
      try {
        const tokenRes = await fetch(`${MAGIC_EDEN_BASE}/tokens/${mint}`, {
          headers: {
            accept: "application/json",
          },
          cache: "no-store",
        });

        if (!tokenRes.ok) {
          return null;
        }

        const tokenData: MagicEdenTokenMetadata = await tokenRes.json();
        if (!tokenData?.image) {
          return null;
        }

        return {
          mint: tokenData.mintAddress ?? mint,
          name: tokenData.name ?? listingsData.find((item) => item.tokenMint === mint)?.tokenName ?? "Realmkin Warden",
          image: tokenData.image,
          attributes: tokenData.attributes ?? [],
          price: listingsData.find((item) => item.tokenMint === mint)?.price ?? null,
          seller: listingsData.find((item) => item.tokenMint === mint)?.seller ?? null,
        };
      } catch (error) {
        return null;
      }
    });

    const tokens = await Promise.all(tokenRequests);
    const items = tokens.filter(Boolean);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Magic Eden fetch failed", error);
    return NextResponse.json(
      { error: "Unexpected error fetching Realmkin NFTs" },
      { status: 500 }
    );
  }
}
