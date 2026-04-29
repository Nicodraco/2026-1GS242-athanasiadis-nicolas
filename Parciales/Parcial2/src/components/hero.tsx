import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ArrowRight, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { useMagneticButton } from "@/lib/useMagneticButton";

type UserState = { id: string } | null | undefined;

interface HeroProps {
  user: UserState;
  clerkReady: boolean;
}

const WORDS = ["Cosecha", "fresco", "cada", "semana,", "sin", "jardín."];
const ITALIC = new Set([1]);

export function HeroSection({ user, clerkReady }: HeroProps) {
  const ref = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const { ref: ctaRef, onMouseMove, onMouseLeave } = useMagneticButton<HTMLAnchorElement>(0.3);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Split lines entrance
      const tl = gsap.timeline({ delay: 0.1 });

      tl.fromTo(
        ".hero-kicker",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
      )
        .fromTo(
          ".hero-word",
          { opacity: 0, yPercent: 110, rotationX: -25 },
          { opacity: 1, yPercent: 0, rotationX: 0, stagger: 0.06, duration: 0.7, ease: "back.out(1.6)" },
          "-=0.2",
        )
        .fromTo(
          ".hero-sub",
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" },
          "-=0.35",
        )
        .fromTo(
          ".hero-actions",
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
          "-=0.3",
        )
        .fromTo(
          ".hero-proof",
          { opacity: 0 },
          { opacity: 1, duration: 0.4 },
          "-=0.2",
        );

      // Image entrance — brutalist slam
      tl.fromTo(
        ".hero-img-wrap",
        { opacity: 0, scale: 0.84, rotation: -6 },
        { opacity: 1, scale: 1, rotation: 3, duration: 0.9, ease: "back.out(1.4)" },
        0.3,
      );

      // Floating label animations
      tl.fromTo(
        ".hero-float-label",
        { opacity: 0, x: 24 },
        { opacity: 1, x: 0, stagger: 0.1, duration: 0.5, ease: "power3.out" },
        "-=0.4",
      );

      // Continuous float
      gsap.to(".hero-img-wrap", {
        y: -12,
        rotation: 2,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 1.2,
      });

      // Parallax on scroll
      gsap.to(".hero-img-wrap", {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: 1.2 },
      });

      gsap.to(".hero-copy", {
        yPercent: -8,
        ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: 0.8 },
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  // Mouse parallax on image
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 18;
      const y = (e.clientY / innerHeight - 0.5) * 12;
      gsap.to(el, { rotateY: x, rotateX: -y, duration: 0.6, ease: "power2.out", transformPerspective: 800 });
    };
    const onLeave = () => {
      gsap.to(el, { rotateY: 0, rotateX: 0, duration: 1, ease: "elastic.out(1,0.4)" });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <section className="hero hero-v2" ref={ref} data-section="hero">
      {/* Grain overlay */}
      <div className="hero-grain" aria-hidden />

      <div className="container hero-v2-grid">
        {/* ── Copy ── */}
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="kicker-badge">
              <Leaf size={11} />
              Kits de cultivo urbano
            </span>
          </div>

          <h1 className="hero-v2-title" style={{ perspective: "600px" }}>
            {WORDS.map((word, i) => (
              <span key={i} className="hero-word-wrap">
                <span className="hero-word">
                  {ITALIC.has(i) ? <em>{word}</em> : word}
                </span>
                {i < WORDS.length - 1 && " "}
              </span>
            ))}
          </h1>

          <p className="hero-v2-sub hero-sub">
            Kits todo-incluido: semillas, macetas y guía práctica.
            <br />
            <strong>Primera cosecha en menos de 3 semanas.</strong>
          </p>

          <div className="hero-actions">
            <a
              ref={ctaRef}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
              href="#catalogo"
              className="button button-brutal-primary"
            >
              Ver los kits
              <ArrowRight size={17} />
            </a>

            {user ? (
              <Link to="/dashboard" className="button button-ghost-dark">
                Mi cuenta →
              </Link>
            ) : clerkReady ? (
              <Link to="/sign-up" className="button button-ghost-dark">
                Crear cuenta gratis →
              </Link>
            ) : null}
          </div>

          <div className="hero-proof">
            <span>✓ Envío en 48 h</span>
            <span>✓ Garantía 2 semanas</span>
            <span>✓ +1,200 clientes</span>
          </div>
        </div>

        {/* ── Visual ── */}
        <div className="hero-v2-visual" ref={imgRef}>
          <div className="hero-img-wrap">
            {/* Main image */}
            <img
              src="https://images.unsplash.com/photo-1585399000684-d2f72660f092?w=700&q=85&auto=format&fit=crop"
              alt="Kit de cultivo urbano en balcón"
              className="hero-main-img"
              loading="eager"
            />

            {/* Brutalist border card */}
            <div className="hero-brutal-frame" aria-hidden />

            {/* Floating label 1 */}
            <div className="hero-float-label hero-float-1">
              <span className="float-dot" />
              Lista en 3 semanas
            </div>

            {/* Floating label 2 */}
            <div className="hero-float-label hero-float-2">
              <span className="float-price">$24.90</span>
              <span className="float-unit">USD</span>
            </div>

            {/* Floating label 3 — new */}
            <div className="hero-float-label hero-float-3">
              🌱 Todo incluido
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="hero-scroll-hint">
        <span>scroll</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
