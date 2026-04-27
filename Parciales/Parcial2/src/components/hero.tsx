import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Leaf, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type UserState = { id: string } | null | undefined;

interface HeroProps {
  user: UserState;
  clerkReady: boolean;
}

const WORDS = ["Cosecha", "fresco", "cada", "semana,", "sin", "jardín."];
const ITALIC = new Set([1]); // "fresco" en itálica

const INCLUDES = [
  "Semillas de ciclo corto",
  "Maceta compacta + sustrato",
  "Guía de riego y luz",
  "Soporte primeras 2 semanas",
];

export function HeroSection({ user, clerkReady }: HeroProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.08 });

      tl.from(".hero-eyebrow", { opacity: 0, y: 14, duration: 0.45 })
        .from(
          ".hero-word",
          {
            opacity: 0,
            y: 44,
            rotationX: -18,
            stagger: 0.07,
            duration: 0.62,
            ease: "back.out(1.4)",
          },
          "-=0.2",
        )
        .from(".hero-sub", { opacity: 0, y: 18, duration: 0.5 }, "-=0.28")
        .from(".hero-cta-row", { opacity: 0, y: 14, duration: 0.45 }, "-=0.28")
        .from(".hero-trust", { opacity: 0, duration: 0.4 }, "-=0.2")
        .from(
          ".hero-card-bg",
          { opacity: 0, scale: 0.82, rotation: 9, duration: 0.65, ease: "back.out(1.2)" },
          0.32,
        )
        .from(
          ".hero-card-main",
          { opacity: 0, scale: 0.88, y: 22, duration: 0.7, ease: "back.out(1.2)" },
          0.46,
        );
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={ref}>
      <div className="container hero-grid">
        {/* — Columna de texto — */}
        <div>
          <div className="hero-eyebrow">
            <span className="badge">
              <Leaf size={11} />
              Sostenible desde casa
            </span>
          </div>

          <h1 className="hero-title">
            {WORDS.map((word, i) => (
              <span key={i} className="hero-word">
                {ITALIC.has(i) ? <em>{word}</em> : word}
                {i < WORDS.length - 1 ? " " : ""}
              </span>
            ))}
          </h1>

          <p className="hero-sub">
            Kits todo-incluido con semillas, macetas y guía práctica.
            Primeras cosechas en menos de tres semanas.
          </p>

          <div className="hero-cta-row">
            <a className="button button-primary button-lg" href="#catalogo">
              Ver los kits
              <ArrowRight size={16} />
            </a>
            {user ? (
              <Link to="/dashboard" className="button button-outline button-lg">
                Mi cuenta
              </Link>
            ) : clerkReady ? (
              <Link to="/sign-up" className="button button-outline button-lg">
                Crear cuenta gratis
              </Link>
            ) : null}
          </div>

          <div className="hero-trust">
            <span>Envío en 48 h</span>
            <span className="hero-trust-sep" />
            <span>Garantía 2 semanas</span>
            <span className="hero-trust-sep" />
            <span>Pago seguro con Stripe</span>
          </div>
        </div>

        {/* — Columna visual — */}
        <div className="hero-visual">
          <div className="hero-card-stack">
            <div className="hero-card-bg" />
            <div className="hero-card-main">
              <div className="hero-plant-icon">
                <Leaf size={26} />
              </div>

              <div className="hero-card-tag-row">
                <h3 className="hero-card-name">Kit Balcón Básico</h3>
                <span className="tag">Inicio</span>
              </div>

              <ul className="hero-card-includes">
                {INCLUDES.map((item) => (
                  <li key={item}>
                    <span className="hero-check">
                      <Check size={9} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="hero-card-footer">
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                    <span className="hero-card-price">$24.90</span>
                    <span className="hero-card-currency">USD</span>
                  </div>
                </div>
                <a href="#catalogo" className="button button-primary">
                  Ver kits
                  <ArrowRight size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
