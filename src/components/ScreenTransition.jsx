import { useEffect, useRef, useState } from "react";

export function ScreenTransition({ active, onMidpoint, onComplete }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const phaseRef = useRef("idle");
  const startTimeRef = useRef(null);
  const particlesRef = useRef(null);
  const callbacksCalledRef = useRef({ midpoint: false, complete: false });
  const [visible, setVisible] = useState(false);

  // Initialize particles once
  if (!particlesRef.current) {
    particlesRef.current = Array.from({ length: 50 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 2 + 0.5,
      size: Math.random() * 3 + 1,
      hue: 190 + Math.random() * 40,
      orbit: 0.4 + Math.random() * 0.3,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  useEffect(() => {
    if (active && phaseRef.current === "idle") {
      phaseRef.current = "opening";
      startTimeRef.current = null;
      callbacksCalledRef.current = { midpoint: false, complete: false };
      setVisible(true);
    }
  }, [active]);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Set canvas size and handle resizing
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    const centerX = () => canvas.width / 2;
    const centerY = () => canvas.height / 2;
    const maxRadius = () => Math.sqrt(Math.pow(canvas.width / 2, 2) + Math.pow(canvas.height / 2, 2)) * 1.2;

    const openDuration = 550;
    const holdDuration = 120;
    const closeDuration = 450;

    const particles = particlesRef.current;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let progress = 0;
      const phase = phaseRef.current;

      if (phase === "opening") {
        progress = Math.min(elapsed / openDuration, 1);
        if (progress >= 1) {
          phaseRef.current = "holding";
          startTimeRef.current = timestamp;
          if (!callbacksCalledRef.current.midpoint) {
            callbacksCalledRef.current.midpoint = true;
            onMidpoint?.();
          }
        }
      } else if (phase === "holding") {
        progress = 1;
        if (elapsed >= holdDuration) {
          phaseRef.current = "closing";
          startTimeRef.current = timestamp;
        }
      } else if (phase === "closing") {
        progress = 1 - Math.min(elapsed / closeDuration, 1);
        if (progress <= 0) {
          phaseRef.current = "idle";
          if (!callbacksCalledRef.current.complete) {
            callbacksCalledRef.current.complete = true;
            onComplete?.();
          }
          setVisible(false);
          return;
        }
      }

      // Smooth ease in-out
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const cx = centerX();
      const cy = centerY();
      const radius = eased * maxRadius();

      // Dark void fill
      const voidGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      voidGradient.addColorStop(0, "rgba(5, 5, 10, 0.98)");
      voidGradient.addColorStop(0.6, "rgba(10, 20, 40, 0.95)");
      voidGradient.addColorStop(0.85, "rgba(40, 80, 140, 0.4)");
      voidGradient.addColorStop(1, "transparent");

      ctx.fillStyle = voidGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Inner glow
      if (eased > 0.1) {
        const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.4);
        glowGradient.addColorStop(0, `rgba(200, 230, 255, ${eased * 0.7})`);
        glowGradient.addColorStop(0.5, `rgba(124, 184, 255, ${eased * 0.35})`);
        glowGradient.addColorStop(1, "transparent");

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Edge ring
      if (eased > 0.2) {
        ctx.save();
        ctx.strokeStyle = `rgba(124, 184, 255, ${eased * 0.6})`;
        ctx.lineWidth = 2 + eased * 2;
        ctx.shadowColor = "rgba(124, 184, 255, 0.7)";
        ctx.shadowBlur = 15 * eased;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Particles
      ctx.save();
      particles.forEach((p) => {
        p.angle += p.speed * 0.01;
        p.twinkle += 0.06;
        const pRadius = radius * p.orbit + Math.sin(p.angle * 3) * 15;
        const x = cx + Math.cos(p.angle) * pRadius * eased;
        const y = cy + Math.sin(p.angle) * pRadius * eased;
        const twinkleAlpha = 0.5 + Math.sin(p.twinkle) * 0.5;

        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${eased * 0.8 * twinkleAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * eased, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", updateSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visible, onMidpoint, onComplete]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    />
  );
}
