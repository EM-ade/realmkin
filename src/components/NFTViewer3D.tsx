"use client";

import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, useGLTF, useTexture, useProgress, Html } from "@react-three/drei";
import * as THREE from "three";
import { NFTMetadata } from "@/services/nftService";

interface NFTViewer3DProps {
  nft: NFTMetadata | null;
  autoRotate?: boolean;
}

// Extended NFT metadata with optional 3D model URL
interface ExtendedNFTMetadata extends NFTMetadata {
  modelUrl?: string;
}

// 3D Card component that displays NFT image as texture
function NFTCard3D({ imageUrl, rarity }: { imageUrl: string; rarity?: string }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Load texture - Suspense will handle loading/errors
  const texture = useTexture(imageUrl);

  // Set texture properties for better quality
  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Gentle floating animation only (no rotation for 2D images)
  useFrame((state) => {
    if (groupRef.current) {
      // Only float up and down, no rotation to avoid showing edges
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      // Keep facing camera (billboard effect)
      groupRef.current.rotation.y = 0;
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
    <group ref={groupRef}>
      {/* Main card with NFT image */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.2}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Gold/Rarity colored frame - Made very thin */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[2.65, 2.65]} />
        <meshStandardMaterial
          color={frameColor}
          metalness={0.8}
          roughness={0.2}
          emissive={frameColor}
          emissiveIntensity={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Back panel - Very close to avoid edge visibility */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[2.7, 2.7]} />
        <meshStandardMaterial color="#0B0B09" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

// 3D Model loader (for NFTs with actual 3D models)
function Model3D({ url, autoRotate }: { url: string; autoRotate: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  
  // Load GLTF - Suspense will handle loading/errors
  const gltf = useGLTF(url);

  useFrame(() => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={meshRef}>
      <primitive object={gltf.scene} scale={2} />
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
  const extendedNFT = nft as ExtendedNFTMetadata;
  const has3DModel = extendedNFT.modelUrl && typeof extendedNFT.modelUrl === 'string';

  return (
    <>
      {has3DModel ? (
        <Model3D url={extendedNFT.modelUrl!} autoRotate={autoRotate} />
      ) : (
        <NFTCard3D imageUrl={nft.image} rarity={nft.rarity} />
      )}
    </>
  );
}

// Loading fallback with animation and progress
function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { progress } = useProgress();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });
  
  return (
    <>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#DA9C2F" wireframe />
      </mesh>
      {/* Progress text */}
      <Html center>
        <div className="text-[#DA9C2F] text-sm font-bold">
          Loading... {Math.round(progress)}%
        </div>
      </Html>
    </>
  );
}

function NFTViewer3D({ nft, autoRotate = true }: NFTViewer3DProps) {
  // Check if NFT has 3D model
  const extendedNFT = nft as ExtendedNFTMetadata;
  const has3DModel = !!(extendedNFT?.modelUrl && typeof extendedNFT.modelUrl === 'string');
  
  // Detect mobile for performance optimizations
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Preload test models on mount
  useEffect(() => {
    // Preload the test NFT model for faster loading
    useGLTF.preload('/models/test-nft.glb');
    
    // Cleanup function
    return () => {
      // Clear any cached models when component unmounts
      useGLTF.clear('/models/test-nft.glb');
    };
  }, []);
  
  // Preload model when NFT changes (for dynamic models)
  useEffect(() => {
    if (has3DModel && extendedNFT?.modelUrl) {
      useGLTF.preload(extendedNFT.modelUrl);
    }
  }, [has3DModel, extendedNFT?.modelUrl]);
  
  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows={!isMobile}
        dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 2)}
        performance={{ min: 0.5 }}
        gl={{
          antialias: !isMobile,
          powerPreference: isMobile ? 'low-power' : 'high-performance',
          alpha: false
        }}
        className="bg-gradient-to-br from-[#080806] via-[#0B0B09] to-[#080806]"
      >
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        
        {/* Lighting setup - Simplified on mobile */}
        <ambientLight intensity={isMobile ? 0.5 : 0.3} />
        {!isMobile && (
          <>
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
          </>
        )}
        <pointLight position={[0, 0, 5]} intensity={isMobile ? 0.8 : 0.5} color="#DA9C2F" />

        {/* Scene content - Key forces remount on NFT change */}
        <Suspense key={nft?.id || 'empty'} fallback={<LoadingFallback />}>
          <Scene nft={nft} autoRotate={autoRotate} />
        </Suspense>

        {/* Environment for reflections */}
        <Environment preset="night" />

        {/* Controls - Disable rotation for 2D images */}
        <OrbitControls
          enableZoom={true}
          enablePan={!isMobile || has3DModel} // Disable pan on mobile for 2D images
          enableRotate={has3DModel} // Only allow rotation for 3D models
          autoRotate={has3DModel && autoRotate} // Only auto-rotate 3D models
          autoRotateSpeed={1}
          panSpeed={has3DModel ? 1 : 2.5} // Faster panning for 2D images
          screenSpacePanning={!has3DModel} // Screen-space panning for 2D (easier scrolling)
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

// Memoize component to prevent unnecessary re-renders
export default React.memo(NFTViewer3D, (prevProps, nextProps) => {
  // Only re-render if nft ID or autoRotate changes
  return prevProps.nft?.id === nextProps.nft?.id && 
         prevProps.autoRotate === nextProps.autoRotate;
});
