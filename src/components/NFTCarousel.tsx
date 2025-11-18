"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

type StaticCarouselItem = {
  id: string;
  name: string;
  image: string;
};

// Minimal typing for Helius asset responses
type HeliusFile = { uri?: string };
type HeliusAsset = {
  id?: string;
  tokenAddress?: string;
  mint?: string;
  name?: string;
  content?: {
    metadata?: { mint?: string; name?: string; image?: string };
    files?: HeliusFile[];
    links?: { image?: string };
  };
};

const SAMPLE_NFTS: StaticCarouselItem[] = [
  {
    id: "realmkin-1",
    name: "WardenKin Vanguard",
    image: "/realmkin-1.webp",
  },
  {
    id: "realmkin-2",
    name: "Solaris Sentinel",
    image: "/realmkin-2.webp",
  },
  {
    id: "realmkin-3",
    name: "Auric Enforcer",
    image: "/realmkin-3.webp",
  },
  {
    id: "realmkin-4",
    name: "Voidwalker Primus",
    image: "/realmkin-4.webp",
  },
  {
    id: "realmkin-5",
    name: "Eclipsed Warden",
    image: "/realmkin-5.webp",
  },
  {
    id: "realmkin-6",
    name: "Arcane Vanguard",
    image: "/realmkin-6.webp",
  },
];

type NFTCarouselProps = {
  contain?: boolean;
};

export default function NFTCarousel({ contain = true }: NFTCarouselProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [items, setItems] = useState<StaticCarouselItem[]>(SAMPLE_NFTS);
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch NFTs for the featured COLLECTION (contract) via Helius RPC (if API key provided)
  useEffect(() => {
    let cancelled = false;
    const COLLECTION_ADDRESS = "EzjhzaTBqXohJTsaMKFSX6fgXcDJyXAV85NK7RK79u3Z"; // Solana collection (verified collection) address
    const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const fetchAssets = async () => {
      if (!apiKey) {
        console.debug("NFTCarousel: NEXT_PUBLIC_HELIUS_API_KEY not set; using sample images.");
        return;
      }
      try {
        const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
        let assets: HeliusAsset[] | null = null;

        // 1) Try getAssetsByGroup (groupKey: collection)
        try {
          const res = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "realmkin-carousel",
              method: "getAssetsByGroup",
              params: {
                groupKey: "collection",
                groupValue: COLLECTION_ADDRESS,
                page: 1,
                limit: 10,
              },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data?.result?.items) ? (data.result.items as HeliusAsset[]) : [];
            assets = list;
          }
        } catch {}

        // 2) Fallback to searchAssets
        if (!assets || assets.length === 0) {
          try {
            const res = await fetch(rpcUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: "realmkin-carousel",
                method: "searchAssets",
                params: {
                  grouping: [{ groupKey: "collection", groupValue: COLLECTION_ADDRESS }],
                  page: 1,
                  limit: 10,
                },
              }),
            });
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data?.result?.items) ? (data.result.items as HeliusAsset[]) : [];
              assets = list;
            }
          } catch {}
        }

        if (!assets || assets.length === 0) return;
        // Map to images
        const parsed: StaticCarouselItem[] = assets
          .map((a: HeliusAsset) => {
            const id = a?.id || a?.tokenAddress || a?.content?.metadata?.mint || a?.mint;
            const name = a?.content?.metadata?.name || a?.name || "NFT";
            const files: HeliusFile[] = a?.content?.files || [];
            const fileImg = files.find((f) => typeof f?.uri === "string" && /\.(png|jpg|jpeg|webp|gif)$/i.test(f.uri))?.uri;
            const metaImg = a?.content?.links?.image || a?.content?.metadata?.image;
            const image = fileImg || metaImg;
            if (!id || !image) return null;
            return { id: String(id), name: String(name), image: String(image) } as StaticCarouselItem;
          })
          .filter((x): x is StaticCarouselItem => Boolean(x))
          .slice(0, 10);
        if (!cancelled && parsed.length) {
          setItems(parsed);
        }
      } catch (e) {
        console.warn("NFTCarousel: failed to fetch NFTs for featured address; using samples.", e);
      }
    };
    fetchAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items.length) return;

    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
    }

    carouselIntervalRef.current = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % items.length);
    }, 4500);

    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [items.length]);

  const handleMouseEnter = () => {
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      carouselIntervalRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (!carouselIntervalRef.current && items.length) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % items.length);
      }, 4500);
    }
  };

  if (!items.length) {
    return null;
  }

  return (
    <div className="carousel-container">
      <div className="carousel-shell-inner">
        {items.map((item, idx) => {
          const isActive = idx === carouselIndex;
          return (
            <div
              key={item.id}
              className={`carousel-slide ${isActive ? "active" : ""}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="carousel-frame">
                <Image
                  src={item.image}
                  alt={`Realmkin preview ${idx + 1}`}
                  width={300}
                  height={300}
                  className="carousel-image"
                  priority={idx === 0}
                />
              </div>
            </div>
          );
        })}

        <div className="carousel-dots">
          {items.map((item, idx) => (
            <button
              key={`${item.id}-dot`}
              className={`carousel-dot ${idx === carouselIndex ? "active" : ""}`}
              aria-label={`View preview ${idx + 1}`}
              onClick={() => setCarouselIndex(idx)}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        /* NFT Carousel Styles */
.carousel-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.carousel-shell-inner {
  position: relative;
  width: 100%;
  height: 100%;
}

.carousel-slide {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.carousel-slide.active {
  opacity: 1;
  z-index: 2;
}

.carousel-frame {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.carousel-image {
  object-fit: contain;
  max-width: 100%;
  max-height: 100%;
  width: auto !important;
  height: auto !important;
}

.carousel-dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 40;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.carousel-dot.active {
  background: #DA9C2F;
  width: 24px;
  border-radius: 4px;
}
      `}</style>
    </div>
  );
}
