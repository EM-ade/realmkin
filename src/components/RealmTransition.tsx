"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";

interface RealmTransitionProps {
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export default function RealmTransition({ active }: RealmTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationFrame: number;
    let rotation = 0;
    let time = 0;
    
    // Particle system
    const particles: Particle[] = [];
    const maxParticles = 30;
    
    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle());
    }
    
    function createParticle(): Particle {
      if (!canvas) return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 100, size: 1 };
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 200;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      return {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random() * 100,
        maxLife: 100,
        size: 1 + Math.random() * 2
      };
    }

    const drawVortex = () => {
      // Clear with radial gradient background
      const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
      gradient.addColorStop(0, 'rgba(20, 15, 0, 1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      time += 0.016;

      // Pulsing effect
      const pulse = Math.sin(time * 2) * 0.1 + 1;

      // Draw energy pulse waves
      if (Math.floor(time * 0.4) !== Math.floor((time - 0.016) * 0.4)) {
        // Trigger new pulse
      }
      
      // Draw outer ring (slowest)
      drawRing(ctx, centerX, centerY, 280 * pulse, rotation * 0.2, 6, 40, 0.3);
      
      // Draw middle ring (medium speed, counter-clockwise)
      drawRing(ctx, centerX, centerY, 200 * pulse, -rotation * 0.35, 4, 30, 0.5);
      
      // Draw inner ring (fastest)
      drawRing(ctx, centerX, centerY, 130 * pulse, rotation * 0.5, 3, 25, 0.7);

      // Draw particles
      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;

        if (p.life >= p.maxLife) {
          particles[index] = createParticle();
          return;
        }

        const alpha = 1 - (p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.6})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.fill();
      });

      rotation += 0.02;
      animationFrame = requestAnimationFrame(drawVortex);
    };

    function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, lineWidth: number, glowSize: number, opacity: number) {
      const segments = 60;
      const dashLength = (Math.PI * 2) / segments;

      for (let i = 0; i < segments; i++) {
        if (i % 3 === 0) continue; // Create dashed effect

        const startAngle = angle + (i * dashLength);
        const endAngle = startAngle + dashLength * 0.6;

        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.shadowBlur = glowSize;
        ctx.shadowColor = 'rgba(255, 165, 0, 0.8)';
        ctx.stroke();
      }

      // Add glowing orbs on the ring
      const numOrbs = 4;
      for (let i = 0; i < numOrbs; i++) {
        const orbAngle = angle + (i * Math.PI * 2 / numOrbs);
        const orbX = x + Math.cos(orbAngle) * radius;
        const orbY = y + Math.sin(orbAngle) * radius;

        ctx.beginPath();
        ctx.arc(orbX, orbY, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${opacity + 0.3})`;
        ctx.shadowBlur = glowSize * 1.5;
        ctx.shadowColor = 'rgba(255, 215, 0, 1)';
        ctx.fill();
      }
    }

    if (active) {
      drawVortex();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [active]);

  return (
    <div className={`realm-transition${active ? " active" : ""}`}>
      <div className="vortex-container">
        <canvas ref={canvasRef} className="vortex-canvas"></canvas>
        
        {/* Centered Realmkin Logo */}
        <div className="logo-container">
          <Image
            src="/realmkin-logo.png"
            alt="Realmkin"
            width={180}
            height={180}
            className="logo-image"
            priority
          />
        </div>
      </div>

      <style jsx>{`
        .realm-transition {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          background: #000000;
          opacity: 0;
          visibility: hidden;
          transition: opacity 1000ms ease, visibility 0s linear 1000ms;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .realm-transition.active {
          opacity: 1;
          visibility: visible;
          pointer-events: all;
          transition: opacity 0ms ease;
        }

        .vortex-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vortex-canvas {
          position: absolute;
          width: 100%;
          height: 100%;
          inset: 0;
        }

        .logo-container {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: logo-pulse 3s ease-in-out infinite;
        }

        .logo-image {
          filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.6))
                  drop-shadow(0 0 60px rgba(255, 165, 0, 0.4))
                  drop-shadow(0 0 90px rgba(255, 215, 0, 0.2));
          animation: logo-glow 2s ease-in-out infinite alternate;
        }

        @keyframes logo-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes logo-glow {
          0% {
            filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))
                    drop-shadow(0 0 40px rgba(255, 165, 0, 0.3))
                    drop-shadow(0 0 60px rgba(255, 215, 0, 0.2));
          }
          100% {
            filter: drop-shadow(0 0 40px rgba(255, 215, 0, 0.8))
                    drop-shadow(0 0 80px rgba(255, 165, 0, 0.6))
                    drop-shadow(0 0 120px rgba(255, 215, 0, 0.4));
          }
        }
      `}</style>
    </div>
  );
}
