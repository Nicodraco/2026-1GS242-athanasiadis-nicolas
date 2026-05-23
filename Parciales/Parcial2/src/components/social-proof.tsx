import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
  {
    quote:
      "Cosecho lechuga fresca cada semana desde mi cocina. No puedo creer lo fácil que fue arrancar.",
    name: "María G.",
    city: "Ciudad de México",
    initials: "MG",
  },
  {
    quote:
      "El kit de aromáticas transformó mi balcón pequeño. Albahaca fresca para todas mis pastas.",
    name: "Carlos R.",
    city: "Buenos Aires",
    initials: "CR",
  },
  {
    quote:
      "Llegó todo incluido, seguí la guía y en 10 días ya tenía mis primeros microbrotes. Impresionante.",
    name: "Ana P.",
    city: "Bogotá",
    initials: "AP",
  },
];

export function SocialProofSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".social-header", {
        opacity: 0,
        y: 28,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: ".social-header", start: "top 82%" },
      });
      gsap.from(".testimonial", {
        opacity: 0,
        y: 50,
        stagger: 0.13,
        duration: 0.65,
        ease: "power2.out",
        scrollTrigger: { trigger: ".testimonials-grid", start: "top 78%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section social-bg" ref={ref}>
      <div className="container">
        <div className="section-header section-header-center social-header">
          <span className="section-label">Lo que dicen</span>
          <h2 className="section-title">Más de 2,000 cosechas este año.</h2>
          <p className="section-sub">
            Personas en apartamentos que empezaron igual que tú.
          </p>
        </div>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <article className="testimonial" key={t.name}>
              <div className="testimonial-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.initials}</div>
                <div>
                  <p className="testimonial-name">{t.name}</p>
                  <p className="testimonial-city">{t.city}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
