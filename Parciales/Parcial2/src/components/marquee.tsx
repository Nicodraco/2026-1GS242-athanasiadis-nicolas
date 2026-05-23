import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ITEMS = [
  "Kit Balcón Básico",
  "$24.90 USD",
  "Cosecha en 3 semanas",
  "Kit Microverde Rápido",
  "$29.90 USD",
  "Microbrotes en 7 días",
  "Kit Aromáticas Compacto",
  "$34.90 USD",
  "Sostenible desde casa",
  "Envío en 48h",
  "Garantía 2 semanas",
  "Pago seguro con Stripe",
];

interface MarqueeProps {
  direction?: "left" | "right";
  speed?: number;
  accent?: boolean;
}

export function Marquee({ direction = "left", speed = 28, accent = false }: MarqueeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 });
      tl.to(trackRef.current, {
        xPercent: direction === "left" ? -50 : 50,
        duration: speed,
        ease: "linear",
      });
      tlRef.current = tl;

      ScrollTrigger.create({
        trigger: sectionRef.current,
        onUpdate: (self) => {
          const vel = Math.abs(self.getVelocity()) / 600;
          tl.timeScale(1 + vel);
          gsap.to(tl, { timeScale: 1, duration: 1.2, ease: "power2.out", overwrite: "auto" });
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [direction, speed]);

  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div ref={sectionRef} className={`marquee-section${accent ? " marquee-accent" : ""}`}>
      <div className="marquee-mask">
        <div ref={trackRef} className="marquee-track">
          {doubled.map((item, i) => (
            <span key={i} className="marquee-item">
              {item}
              <span className="marquee-sep">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
