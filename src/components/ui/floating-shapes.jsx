import React from "react";

export function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute top-[10%] left-[5%] w-[25rem] h-[25rem] bg-white rounded-full shadow-[0_30px_60px_rgba(44,37,77,0.08)] opacity-90 animate-float-slow"
      />
      <div 
        className="absolute bottom-[-10%] right-[5%] w-[35rem] h-[35rem] bg-white/90 rounded-[4rem] shadow-[0_40px_80px_rgba(123,30,58,0.1)] opacity-90 backdrop-blur-sm animate-float-medium delay-1000"
      />
      <div 
        className="absolute top-[20%] right-[30%] w-64 h-64 bg-primary/5 rounded-[3rem] shadow-[0_20px_40px_rgba(123,30,58,0.05)] opacity-90 backdrop-blur-md animate-float-fast delay-2000"
      />
    </div>
  );
}