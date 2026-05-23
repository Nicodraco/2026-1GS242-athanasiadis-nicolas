import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import { CheckCircle2, Package, Truck, Leaf, Mail, ArrowRight } from "lucide-react";

const STEPS = [
  { icon: CheckCircle2, label: "Pago confirmado",    desc: "Stripe procesó tu pago con éxito." },
  { icon: Package,      label: "Preparando tu kit",  desc: "Estamos armando tu pedido." },
  { icon: Truck,        label: "Envío en 48 h",      desc: "Recibirás tracking por email." },
  { icon: Leaf,         label: "A plantar",          desc: "¡Primera cosecha en 7-21 días!" },
];

export function CheckoutSuccessPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Circle burst
      tl.fromTo(".cs-circle",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }
      );
      // Check icon
      tl.fromTo(".cs-check-icon",
        { scale: 0, rotation: -90 },
        { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(2)" },
        "-=0.25"
      );
      // Title
      tl.fromTo(".cs-title",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" },
        "-=0.1"
      );
      // Subtitle
      tl.fromTo(".cs-sub",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
        "-=0.3"
      );
      // Steps stagger
      tl.fromTo(".cs-step",
        { opacity: 0, x: -24 },
        { opacity: 1, x: 0, stagger: 0.1, duration: 0.45, ease: "power3.out" },
        "-=0.1"
      );
      // Session badge
      tl.fromTo(".cs-session",
        { opacity: 0 },
        { opacity: 1, duration: 0.4 },
        "-=0.1"
      );
      // CTAs
      tl.fromTo(".cs-actions",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
        "-=0.15"
      );

      // Confetti particles
      const colors = ["#39ff14", "#00e5ff", "#ff9500", "#0c2218", "#a8d5a2"];
      const container = document.querySelector(".cs-confetti");
      if (container) {
        for (let i = 0; i < 28; i++) {
          const dot = document.createElement("div");
          dot.className = "cs-particle";
          dot.style.cssText = `
            position: absolute;
            width: ${6 + Math.random() * 8}px;
            height: ${6 + Math.random() * 8}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
            left: 50%; top: 50%;
          `;
          container.appendChild(dot);
          gsap.to(dot, {
            x: (Math.random() - 0.5) * 320,
            y: -80 - Math.random() * 200,
            opacity: 0,
            rotation: Math.random() * 720,
            duration: 0.8 + Math.random() * 0.6,
            ease: "power2.out",
            delay: 0.3 + Math.random() * 0.4,
          });
        }
      }
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="cs-page" ref={pageRef}>
      <div className="cs-card">

        {/* Confetti layer */}
        <div className="cs-confetti" aria-hidden />

        {/* Circle + icon */}
        <div className="cs-hero">
          <div className="cs-circle">
            <CheckCircle2 size={56} className="cs-check-icon" strokeWidth={1.8} />
          </div>
        </div>

        {/* Heading */}
        <h1 className="cs-title">¡Pedido confirmado!</h1>
        <p className="cs-sub">
          Tu pago fue procesado con éxito. Estamos preparando tu kit 🌱
        </p>

        {/* Progress steps */}
        <div className="cs-steps">
          {STEPS.map(({ icon: Icon, label, desc }, i) => (
            <div key={i} className="cs-step">
              <div className={`cs-step-dot${i === 0 ? " cs-step-dot--done" : i === 1 ? " cs-step-dot--active" : ""}`}>
                {i === 0 ? <CheckCircle2 size={14} /> : <Icon size={14} />}
              </div>
              <div className="cs-step-body">
                <span className="cs-step-label">{label}</span>
                <span className="cs-step-desc">{desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Email hint */}
        <div className="cs-email-hint">
          <Mail size={14} />
          Recibirás una confirmación por email con los detalles del envío.
        </div>

        {/* Session ID (for test mode reference) */}
        {sessionId && (
          <div className="cs-session">
            <span className="cs-session-label">Nº de sesión Stripe</span>
            <code className="cs-session-id">{sessionId.slice(0, 24)}…</code>
          </div>
        )}

        {/* CTAs */}
        <div className="cs-actions">
          <Link to="/dashboard" className="button button-primary cs-btn-primary">
            Ver mis compras <ArrowRight size={15} />
          </Link>
          <a href="/#catalogo" className="button button-ghost">
            Seguir comprando
          </a>
        </div>

      </div>
    </div>
  );
}
