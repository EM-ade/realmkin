"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function Orb() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.2;
      ref.current.rotation.x += delta * 0.1;
    }
  });
  return (
    <Float speed={1} rotationIntensity={0.3} floatIntensity={1}>
      <mesh ref={ref}>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshStandardMaterial
          color="#b0862f" // base gold
          metalness={0.65}
          roughness={0.25}
          emissive="#DA9C2F"
          emissiveIntensity={0.12}
        />
      </mesh>
    </Float>
  );
}

export default function HeroComingSoon() {
  const [showOrb, setShowOrb] = useState(false);

  useEffect(() => {
    const update = () => setShowOrb(window.innerWidth >= 480);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[var(--background)] min-h-[420px]">
      {/* Visual background */}
      {showOrb ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 4.8], fov: 50 }}>
            <ambientLight intensity={0.55} />
            <pointLight position={[2, 3, 2]} intensity={2.8} color="#DA9C2F" />
            <pointLight position={[-2, -3, -1]} intensity={1.2} color="#FFD788" />
            <directionalLight position={[-5, 5, -5]} intensity={0.5} />
            <Orb />
          </Canvas>
          {/* subtle radial gradient vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(218,156,47,0.12),rgba(0,0,0,0)_60%)]" />
        </div>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-80"
          style={{
            background:
              "radial-gradient(1200px 600px at 50% 10%, rgba(218,156,47,0.20), rgba(10,11,13,0.1)), radial-gradient(600px 400px at 80% 20%, rgba(255,191,0,0.14), transparent)",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#DA9C2F' }} />
            Coming soon
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl gold-gradient-text">
            Marketplace
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
            List NFTs, accept offers, and settle in MKIN. Non‑custodial by design. Royalties respected.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/discord"
              className="rounded-md px-4 py-2 text-sm font-semibold text-black shadow-sm transition focus:outline-none focus:ring-2"
              style={{ background: '#DA9C2F' }}
            >
              Join Discord
            </a>
            <Link
              href="/"
              className="rounded-md border px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition focus:outline-none"
              style={{ borderColor: 'var(--border-color)', background: 'rgba(255,255,255,0.05)' }}
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
