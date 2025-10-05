"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

type StaticCarouselItem = {
  id: string;
  name: string;
  image: string;
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
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!SAMPLE_NFTS.length) return;

    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
    }

    carouselIntervalRef.current = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % SAMPLE_NFTS.length);
    }, 4500);

    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      carouselIntervalRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (!carouselIntervalRef.current && SAMPLE_NFTS.length) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % SAMPLE_NFTS.length);
      }, 4500);
    }
  };

  if (!SAMPLE_NFTS.length) {
    return null;
  }

  return (
    <div className="carousel-container">
      <div className="carousel-shell-inner">
        {SAMPLE_NFTS.map((item, idx) => {
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
                <div className="carousel-overlay"></div>
              </div>
              <div className="carousel-caption">
                <div className="carousel-status" style={{ fontFamily: "var(--font-amnestia)" }}>
                  COMING SOON
                </div>
              </div>
            </div>
          );
        })}

        <div className="carousel-dots">
          {SAMPLE_NFTS.map((item, idx) => (
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

.carousel-caption {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  pointer-events: none;
  width: 100%;
  text-align: center;
}

.carousel-status {
  display: inline-block;
  padding: 8px 24px;
  background: rgba(218, 156, 47, 0.9);
  color: #000;
  font-weight: bold;
  font-size: 14px;
  letter-spacing: 0.1em;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(218, 156, 47, 0.3);
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
