import React from "react";
import { cn } from "../../lib/utils";

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative flex flex-col h-full items-center justify-center bg-bg-dark text-slate-950 transition-bg overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            `
            absolute -inset-[10px] opacity-40 will-change-transform
            [--dark-gradient:repeating-linear-gradient(100deg,var(--color-bg-dark)_0%,var(--color-bg-dark)_7%,transparent_10%,transparent_12%,var(--color-bg-dark)_16%)]
            [--aurora:repeating-linear-gradient(100deg,var(--color-primary)_10%,var(--color-accent)_20%,var(--color-secondary)_30%,var(--color-accent)_40%,var(--color-primary)_50%)]
            [background-image:var(--dark-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[15px] invert-0
            after:content-[''] after:absolute after:inset-0 
            after:[background-image:var(--dark-gradient),var(--aurora)]
            after:[background-size:200%,_100%] 
            after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference
            `,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
          )}
        ></div>
      </div>
      {children}
    </div>
  );
};