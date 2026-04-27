import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Package, Clock3, Maximize2 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    Icon: Package,
    title: "Todo incluido",
    desc: "Semillas, maceta, sustrato y guía detallada en cada caja. Sin visitas a tiendas de jardinería ni compras adicionales.",
  },
  {
    Icon: Clock3,
    title: "Ciclos cortos",
    desc: "Primeras cosechas en 7 a 21 días. No es un proyecto de meses: en semanas ya estás cortando lo que cultivaste.",
  },
  {
    Icon: Maximize2,
    title: "0.5 m² es suficiente",
    desc: "Diseñados para repisas de cocina y balcones compactos. Sin jardineras grandes, sin tierra suelta, sin desorden.",
  },
];

export function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".features-header", {
        opacity: 0,
        y: 32,
        duration: 0.65,
        ease: "power2.out",
        scrollTrigger: { trigger: ".features-header", start: "top 82%" },
      });
      gsap.from(".feature-card", {
        opacity: 0,
        y: 60,
        stagger: 0.14,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".features-grid", start: "top 78%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section features-bg" ref={ref}>
      <div className="container">
        <div className="section-header features-header">
          <span className="section-label">Por qué funciona</span>
          <h2 className="section-title">
            Diseñado para quienes no tienen tiempo ni espacio.
          </h2>
          <p className="section-sub">
            Tres principios que hacen que cualquier persona pueda tener su primer cultivo en casa esta semana.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div className="feature-card" key={title}>
              <div className="feature-icon">
                <Icon size={22} />
              </div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
