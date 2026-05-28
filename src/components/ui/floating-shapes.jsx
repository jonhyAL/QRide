import React from "react";

export function FloatingShapes({ variant = "default" }) {
  const isEmergency = variant === "emergency";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Círculo superior izquierdo */}
      <div 
        className={"absolute top-[-5%] md:top-[10%] left-[-10%] md:left-[5%] w-[30rem] h-[30rem] md:w-[25rem] md:h-[25rem] rounded-full animate-float-slow " + 
          (isEmergency 
            ? "bg-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.1)] opacity-100" 
            : "bg-white rounded-full shadow-[0_30px_60px_rgba(44,37,77,0.08)] opacity-90")}
      />
      {/* Cuadrado redondeado inferior derecho */}
      <div 
        className={"absolute bottom-[-5%] md:bottom-[-10%] right-[-15%] md:right-[5%] w-[36rem] h-[36rem] md:w-[35rem] md:h-[35rem] rounded-[3rem] md:rounded-[4rem] animate-float-medium delay-1000 backdrop-blur-sm " + 
          (isEmergency 
            ? "bg-black/5 shadow-[0_40px_80px_rgba(0,0,0,0.2)] opacity-80" 
            : "bg-white/90 shadow-[0_40px_80px_rgba(123,30,58,0.1)] opacity-90")}
      />
      {/* Forma pequeña central/derecha */}
      <div 
        className={"absolute top-[20%] md:top-[20%] right-[5%] md:right-[30%] w-64 h-64 md:w-64 md:h-64 rounded-[2rem] md:rounded-[3rem] backdrop-blur-md animate-float-fast delay-2000 " + 
          (isEmergency 
            ? "bg-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.1)] opacity-60" 
            : "bg-primary/5 shadow-[0_20px_40px_rgba(123,30,58,0.05)] opacity-90")}
      />
    </div>
  );
}
