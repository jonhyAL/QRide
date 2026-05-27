import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";

export const AmbientBackground = () => {
  // SVG Grid Base64 (estilo Aceternity)
  const gridSvg =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgNDBWMGg0MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=";
  
  const mouseRef = useRef(null);

  useEffect(() => {
    // Spotlight magnético usando GSAP quickTo
    const xTo = gsap.quickTo(mouseRef.current, "x", { duration: 1.5, ease: "power3" });
    const yTo = gsap.quickTo(mouseRef.current, "y", { duration: 1.5, ease: "power3" });

    const onMouseMove = (e) => {
      // Ajustamos el offset para centrar el cursor en el spotlight
      xTo(e.clientX - 300); 
      yTo(e.clientY - 300);
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Malla (Grid) de fondo */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${gridSvg})`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* 2. Viñeta radial oscura para suavizar los bordes de la malla */}
      <div className="absolute inset-0 bg-secondary [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_100%)]" />

      {/* 3. GSAP Mouse Spotlight interactivo */}
      <div
        ref={mouseRef}
        className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/20 blur-[100px] rounded-full mix-blend-screen opacity-60 will-change-transform"
      />

      {/* 4. Orbes etéreos estáticos con Framer Motion (para contraste y profundidad) */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
          y: [0, -50, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-accent/20 blur-[130px] rounded-full mix-blend-screen"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.3, 0.1],
          x: [0, 50, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-primary/10 blur-[150px] rounded-full mix-blend-screen"
      />
    </div>
  );
};