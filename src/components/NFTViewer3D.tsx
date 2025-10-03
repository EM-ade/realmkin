"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import * as THREE from "three";
import { NFTMetadata } from "@/services/nftService";

interface NFTViewer3DProps {
  nft: NFTMetadata | null;
  autoRotate?: boolean;
}

// 3D Card component that displays NFT image as texture
function NFTCard3D({ imageUrl, rarity }: { imageUrl: string; rarity?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.minFilter = THREE.LinearFilter;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error("Error loading texture:", error);
      }
    );
  }, [imageUrl]);

  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const getRarityColor = (rarity?: string) => {
    switch (rarity?.toUpperCase()) {
      case "LEGENDARY":
        return "#d4af37";
      case "EPIC":
        return "#9333ea";
      case "RARE":
        return "#3b82f6";
      case "COMMON":
        return "#6b7280";
      default:
        return "#DA9C2F";
    }
  };

  const frameColor = getRarityColor(rarity);

  return (
    <group>
      {/* Main card with NFT image */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[2.5, 3.5, 0.1]} />
        {texture ? (
          <meshStandardMaterial
            map={texture}
            metalness={0.3}
            roughness={0.4}
          />
        ) : (
          <meshStandardMaterial color="#2d2d2d" />
        )}
      </mesh>

      {/* Gold/Rarity colored frame */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[2.7, 3.7, 0.05]} />
        <meshStandardMaterial
          color={frameColor}
          metalness={0.8}
          roughness={0.2}
          emissive={frameColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Back panel */}
      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[2.8, 3.8, 0.02]} />
        <meshStandardMaterial color="#0B0B09" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

// 3D Model loader (for NFTs with actual 3D models)
function Model3D({ url }: { url: string }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  // This is a placeholder - you'd use GLTFLoader for actual 3D models
  return (
    <group ref={meshRef}>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#DA9C2F" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Main scene component
function Scene({ nft, autoRotate }: { nft: NFTMetadata | null; autoRotate: boolean }) {
  if (!nft) {
    return (
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#404040" wireframe />
      </mesh>
    );
  }

  // Check if NFT has 3D model URL (you can add this field to NFTMetadata)
  const has3DModel = false; // (nft as any).modelUrl;

  return (
    <>
      {has3DModel ? (
        <Model3D url={(nft as any).modelUrl} />
      ) : (
        <NFTCard3D imageUrl={nft.image} rarity={nft.rarity} />
      )}
    </>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#DA9C2F" wireframe />
    </mesh>
  );
}

export default function NFTViewer3D({ nft, autoRotate = true }: NFTViewer3DProps) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        className="bg-gradient-to-br from-[#080806] via-[#0B0B09] to-[#080806]"
      >
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        
        {/* Lighting setup */}
        <ambientLight intensity={0.3} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          castShadow
          color="#DA9C2F"
        />
        <spotLight
          position={[-10, -10, -10]}
          angle={0.3}
          penumbra={1}
          intensity={0.5}
          color="#ffffff"
        />
        <pointLight position={[0, 0, 5]} intensity={0.5} color="#DA9C2F" />

        {/* Scene content */}
        <Suspense fallback={<LoadingFallback />}>
          <Scene nft={nft} autoRotate={autoRotate} />
        </Suspense>

        {/* Environment for reflections */}
        <Environment preset="night" />

        {/* Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={1}
          minDistance={4}
          maxDistance={15}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>

      {/* Overlay info */}
      {!nft && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-[#DA9C2F]">
            <p className="text-xl font-semibold mb-2">Select an NFT to view</p>
            <p className="text-sm text-gray-400">Choose from your collection below</p>
          </div>
        </div>
      )}
    </div>
  );
}
