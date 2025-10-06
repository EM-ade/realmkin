"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export default function LoginBackground() {
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
    
    // Enhanced particle system
    const particles: Particle[] = [];
    const maxParticles = 60; // Increased from 30
    
    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle());
    }
    
    function createParticle(): Particle {
      if (!canvas) return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 100, size: 1 };
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 300;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      return {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random() * 100,
        maxLife: 100,
        size: 1 + Math.random() * 2.5
      };
    }

    const drawVortex = () => {
      // Clear with radial gradient background (golden theme)
      const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
      gradient.addColorStop(0, 'rgba(30, 22, 0, 1)'); // Darker gold center
      gradient.addColorStop(0.5, 'rgba(15, 10, 0, 1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      time += 0.016;

      // Pulsing effect
      const pulse = Math.sin(time * 2) * 0.1 + 1;

      // Draw 7 rings with varying properties
      // Outermost ring (slowest)
      drawRing(ctx, centerX, centerY, 380 * pulse, rotation * 0.15, 7, 45, 0.25);
      
      // Second outer ring
      drawRing(ctx, centerX, centerY, 320 * pulse, -rotation * 0.22, 6, 40, 0.3);
      
      // Third ring
      drawRing(ctx, centerX, centerY, 260 * pulse, rotation * 0.3, 5, 35, 0.4);
      
      // Middle ring
      drawRing(ctx, centerX, centerY, 200 * pulse, -rotation * 0.38, 4, 30, 0.5);
      
      // Fourth ring
      drawRing(ctx, centerX, centerY, 150 * pulse, rotation * 0.45, 3.5, 28, 0.6);
      
      // Fifth ring
      drawRing(ctx, centerX, centerY, 110 * pulse, -rotation * 0.52, 3, 25, 0.7);
      
      // Innermost ring (fastest)
      drawRing(ctx, centerX, centerY, 70 * pulse, rotation * 0.6, 2.5, 22, 0.8);

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

    drawVortex();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div className="login-background">
      <canvas ref={canvasRef} className="login-canvas"></canvas>

      <style jsx>{`
        .login-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .login-canvas {
          position: absolute;
          width: 100%;
          height: 100%;
          inset: 0;
        }
      `}</style>
    </div>
  );
}
