"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
// no drei float; rotate image only
import * as THREE from "three";

function RotatingImage() {
  const ref = useRef<THREE.Mesh>(null!);
  const texture = useLoader(THREE.TextureLoader, "/realmkin.png");
  useEffect(() => {
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, 0.05, 0]}>
      <planeGeometry args={[4.4, 4.4]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.02}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function HeroComingSoon() {

  return (
    <section className="relative overflow-hidden bg-[var(--background)] min-h-[420px] isolate">
      {/* Visual background - always render */}
      <div className="pointer-events-none absolute inset-0 z-[2]">
        <Canvas camera={{ position: [0, 0, 5.2], fov: 50, near: 0.1, far: 100 }} gl={{ antialias: true, logarithmicDepthBuffer: true, alpha: true }}>
          <ambientLight intensity={0.55} />
          <pointLight position={[2, 3, 2]} intensity={2.8} color="#DA9C2F" />
          <pointLight position={[-2, -3, -1]} intensity={1.2} color="#FFD788" />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          <RotatingImage />
        </Canvas>
        {/* subtle radial gradient vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(218,156,47,0.12),rgba(0,0,0,0)_60%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-28 lg:py-32">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#DA9C2F' }} />
            Coming soon
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl gold-gradient-text">
            Marketplace
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg line-clamp-2 sm:line-clamp-none">
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
