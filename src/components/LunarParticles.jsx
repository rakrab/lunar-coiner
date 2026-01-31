import { useEffect, useRef } from "react";

export function LunarParticles({ intensity = "normal", danger = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ intensity, danger });
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const dimensionsRef = useRef({ width: window.innerWidth, height: window.innerHeight });

  // Update state ref without causing re-render
  useEffect(() => {
    stateRef.current = { intensity, danger };
  }, [intensity, danger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Create particle using current dimensions
    const createParticle = (isNew = false) => {
      const { width, height } = dimensionsRef.current;
      return {
        x: Math.random() * width,
        y: isNew ? height + 20 : Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -Math.random() * 0.5 - 0.2,
        opacity: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.02 + 0.01,
        baseHue: 200 + Math.random() * 25,
      };
    };

    const resize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const oldWidth = dimensionsRef.current.width;
      const oldHeight = dimensionsRef.current.height;

      dimensionsRef.current = { width: newWidth, height: newHeight };
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Scale existing particle positions to new dimensions
      particlesRef.current.forEach((p) => {
        p.x = (p.x / oldWidth) * newWidth;
        p.y = (p.y / oldHeight) * newHeight;
      });
    };

    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: 50 }, () => createParticle());

    const animate = () => {
      const { width, height } = dimensionsRef.current;
      ctx.clearRect(0, 0, width, height);

      const { intensity, danger } = stateRef.current;
      const isIntense = intensity === "intense";
      const isSubtle = intensity === "subtle";

      const speedMult = isIntense ? 2.5 : isSubtle ? 0.5 : 1;
      const opacityMult = isIntense ? 1.6 : isSubtle ? 0.6 : 1;
      const targetCount = isIntense ? 100 : isSubtle ? 30 : 50;

      // Adjust particle count gradually
      while (particlesRef.current.length < targetCount) {
        particlesRef.current.push(createParticle(true));
      }
      while (particlesRef.current.length > targetCount) {
        particlesRef.current.pop();
      }

      // Hue shift for danger state
      const hueShift = danger ? -50 : isIntense ? 15 : 0;
      const saturation = danger ? 70 : 80;
      const lightness = isIntense ? 80 : 70;

      particlesRef.current.forEach((p) => {
        // Update
        p.x += p.speedX * speedMult;
        p.y += p.speedY * speedMult;
        p.phase += p.phaseSpeed * (isIntense ? 2 : 1);

        // Wrap using current dimensions
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Draw
        const alpha = Math.min(1, p.opacity * (0.6 + Math.sin(p.phase) * 0.4) * opacityMult);
        const hue = p.baseHue + hueShift;
        const glowSize = p.size * (isIntense ? 4 : 3);

        // Glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
        gradient.addColorStop(0.4, `hsla(${hue}, ${saturation - 10}%, ${lightness - 10}%, ${alpha * 0.4})`);
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `hsla(${hue + 10}, 90%, 90%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
