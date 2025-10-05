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
                  width={640}
                  height={640}
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
        .carousel-container {
          width: 100%;
          margin: 0 auto 1.5rem;
          padding: 0 1rem;
          max-width: 720px;
        }

        @media (min-width: 768px) {
          .carousel-container {
            padding: 0 1.5rem;
          }
        }

        .carousel-shell-inner {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          height: auto;
          max-height: clamp(320px, 60vh, 640px);
          border-radius: 22px 22px 0 0;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(46, 30, 10, 0.3));
        }

        .carousel-slide {
          position: absolute;
          inset: 0;
          border-radius: 22px 22px 0 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px) scale(0.96);
          transition: opacity 600ms ease, transform 600ms ease;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .carousel-slide.active {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .carousel-frame {
          position: absolute;
          inset: 0;
        }

        .carousel-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: ${contain ? "contain" : "cover"};
          background: radial-gradient(circle at center, rgba(255, 227, 150, 0.2), rgba(5, 3, 2, 0.95));
          filter: saturate(1.05) brightness(1.02);
          transition: transform 6s ease;
        }

        .carousel-slide.active .carousel-image {
          transform: scale(1.02);
        }

        .carousel-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%);
        }

        .carousel-caption {
          position: relative;
          z-index: 2;
          padding: 24px 24px 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          color: #f7dca1;
          text-align: center;
        }

        .carousel-status {
          font-size: clamp(1.6rem, 2.4vw, 2.6rem);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-shadow: 0 0 24px rgba(255, 195, 96, 0.75);
        }

        .carousel-dots {
          position: absolute;
          left: 50%;
          bottom: 16px;
          transform: translateX(-50%);
          display: inline-flex;
          gap: 8px;
          z-index: 10;
        }

        .carousel-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 214, 124, 0.3);
          border: none;
          transition: background 200ms ease, transform 200ms ease;
          cursor: pointer;
        }

        .carousel-dot.active {
          background: rgba(255, 214, 124, 0.9);
          transform: scale(1.3);
          box-shadow: 0 0 12px rgba(255, 214, 124, 0.7);
        }
      `}</style>
    </div>
  );
}
