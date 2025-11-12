"use client";

import React, { useEffect, useRef, useState } from "react";
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
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshStandardMaterial
          color="#77e1ff"
          metalness={0.4}
          roughness={0.25}
          emissive="#3dd7ff"
          emissiveIntensity={0.08}
        />
      </mesh>
    </Float>
  );
}

export default function HeroComingSoon() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#0a0b0d]">
      {/* Visual background */}
      {isDesktop ? (
        <div className="pointer-events-none absolute inset-0 -z-10">
          <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[2, 3, 2]} intensity={2} />
            <directionalLight position={[-5, 5, -5]} intensity={0.6} />
            <Orb />
          </Canvas>
          {/* subtle radial gradient vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12),rgba(0,0,0,0)_60%)]" />
        </div>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(1200px 600px at 50% 10%, rgba(61,215,255,0.22), rgba(10,11,13,0.1)), radial-gradient(600px 400px at 80% 20%, rgba(141,92,255,0.18), transparent)",
          }}
        />
      )}

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
            Coming soon
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Marketplace
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">
            List NFTs, accept offers, and settle in MKIN. Non‑custodial by design. Royalties respected.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/discord"
              className="rounded-md bg-cyan-400/90 px-4 py-2 text-sm font-medium text-[#0a0b0d] shadow-sm transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
              Join Discord
            </a>
            <a
              href="/"
              className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Back home
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
