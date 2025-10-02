import { useState, useEffect } from "react";

export type CarouselItem = {
  mint: string;
  name: string;
  image: string;
  price: number | null;
  seller: string | null;
  attributes: Array<{ trait_type?: string; value?: string }>;
};

export function useRealmkinNFTs() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNFTs() {
      try {
        setLoading(true);
        const res = await fetch("/api/realmkin-nfts", { cache: "no-store" });
        
        if (!res.ok) {
          throw new Error("Failed to fetch NFTs");
        }
        
        const data = await res.json();
        
        if (Array.isArray(data?.items) && data.items.length) {
          setItems(data.items);
        }
      } catch (err) {
        console.error("Failed to load Realmkin NFTs", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchNFTs();
  }, []);

  return { items, loading, error };
}
