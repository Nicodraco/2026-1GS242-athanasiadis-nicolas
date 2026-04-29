import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: 1200, suffix: "+", label: "Clientes activos", prefix: "" },
  { value: 3,    suffix: " sem.", label: "Primera cosecha", prefix: "" },
  { value: 98,   suffix: "%", label: "Satisfacción", prefix: "" },
  { value: 24,   suffix: "h", label: "Soporte humano", prefix: "" },
];

function Counter({ value, prefix, suffix }: { value: number; prefix: string; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const obj = { val: 0 };
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to(obj, {
            val: value,
            duration: 1.8,
            ease: "power2.out",
            onUpdate: () => {
              if (ref.current) {
                ref.current.textContent = `${prefix}${Math.round(obj.val).toLocaleString("es")}${suffix}`;
              }
            },
          });
        },
      });
    }, ref);
    return () => ctx.revert();
  }, [value, prefix, suffix]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

export function StatsSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".stat-card", {
        y: 60,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: "back.out(1.4)",
        scrollTrigger: { trigger: ".stats-grid", start: "top 80%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section-sm stats-section" ref={ref}>
      <div className="container">
        <div className="stats-grid">
          {STATS.map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-value">
                <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
