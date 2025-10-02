"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRealmkinNFTs, type CarouselItem } from "@/hooks/useRealmkinNFTs";

export default function NFTCarousel() {
  const { items: carouselItems } = useRealmkinNFTs();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!carouselItems.length) return;

    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
    }

    carouselIntervalRef.current = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
    }, 4500);

    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [carouselItems.length]);

  const handleMouseEnter = () => {
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      carouselIntervalRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (!carouselIntervalRef.current && carouselItems.length) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
      }, 4500);
    }
  };

  if (!carouselItems.length) {
    return null;
  }

  return (
    <div className="carousel-container -mx-6 sm:-mx-10 -mt-10 mb-6">
      <div className="carousel-shell-inner">
        {carouselItems.map((item, idx) => {
          const isActive = idx === carouselIndex;
          return (
            <div
              key={item.mint}
              className={`carousel-slide ${isActive ? "active" : ""}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="carousel-frame">
                <Image
                  src={item.image}
                  alt={item.name ?? "Realmkin NFT"}
                  width={640}
                  height={640}
                  className="carousel-image"
                  priority={idx === 0}
                />
                <div className="carousel-overlay"></div>
              </div>
              <div className="carousel-caption">
                <div className="carousel-title" style={{ fontFamily: "var(--font-amnestia)" }}>
                  {item.name}
                </div>
                {/* <div className="carousel-meta">
                  {item.price ? (
                    <span className="carousel-price">{item.price.toLocaleString()} ◎</span>
                  ) : (
                    <span className="carousel-price">Price on request</span>
                  )}
                </div> */}
              </div>
            </div>
          );
        })}

        <div className="carousel-dots">
          {carouselItems.map((item, idx) => (
            <button
              key={`${item.mint}-dot`}
              className={`carousel-dot ${idx === carouselIndex ? "active" : ""}`}
              aria-label={`View ${item.name}`}
              onClick={() => setCarouselIndex(idx)}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .carousel-container {
          width: calc(100% + 3rem);
          margin-bottom: 1.5rem;
        }

        @media (min-width: 640px) {
          .carousel-container {
            width: calc(100% + 5rem);
          }
        }

        .carousel-shell-inner {
          position: relative;
          width: 100%;
          height: 400px;
          border-radius: 22px 22px 0 0;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(46, 30, 10, 0.3));
        }

        @media (min-width: 768px) {
          .carousel-shell-inner {
            height: 600px;
          }
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
          object-fit: cover;
          filter: saturate(1.05) brightness(1.02);
          transition: transform 6s ease;
        }

        .carousel-slide.active .carousel-image {
          transform: scale(1.08);
        }

        .carousel-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%);
        }

        .carousel-caption {
          position: relative;
          z-index: 2;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          color: #f7dca1;
        }

        .carousel-title {
          font-size: clamp(1.5rem, 2.2vw, 2.4rem);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-shadow: 0 0 22px rgba(255, 195, 96, 0.7);
        }

        .carousel-meta {
          font-size: 0.95rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.88;
        }

        .carousel-price {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 214, 124, 0.14);
          border: 1px solid rgba(255, 214, 124, 0.32);
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          letter-spacing: 0.14em;
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
