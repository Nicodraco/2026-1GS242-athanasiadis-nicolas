import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { XCircle, ArrowLeft, ShoppingCart, HelpCircle } from "lucide-react";

export function CheckoutCancelledPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(".cc-circle",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }
      );
      tl.fromTo(".cc-icon",
        { scale: 0 },
        { scale: 1, duration: 0.35, ease: "back.out(2)" },
        "-=0.2"
      );
      tl.fromTo(".cc-title",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" },
        "-=0.05"
      );
      tl.fromTo(".cc-sub",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
        "-=0.25"
      );
      tl.fromTo(".cc-reasons li",
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, stagger: 0.08, duration: 0.35, ease: "power2.out" },
        "-=0.1"
      );
      tl.fromTo(".cc-actions",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35 },
        "-=0.05"
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="cc-page" ref={pageRef}>
      <div className="cc-card">

        {/* Icon */}
        <div className="cc-hero">
          <div className="cc-circle">
            <XCircle size={52} className="cc-icon" strokeWidth={1.8} />
          </div>
        </div>

        {/* Heading */}
        <h1 className="cc-title">Pago cancelado</h1>
        <p className="cc-sub">
          No se realizó ningún cargo. Tu carrito sigue guardado, podés volver cuando quieras.
        </p>

        {/* Possible reasons */}
        <div className="cc-reasons-wrap">
          <p className="cc-reasons-heading">
            <HelpCircle size={13} /> ¿Por qué puede pasar esto?
          </p>
          <ul className="cc-reasons">
            <li>Cerraste la ventana de pago antes de confirmar.</li>
            <li>Problemas temporales con tu tarjeta o banco.</li>
            <li>La sesión de pago expiró (más de 30 min inactiva).</li>
          </ul>
        </div>

        {/* CTAs */}
        <div className="cc-actions">
          <a href="/#catalogo" className="button button-primary cc-btn-primary">
            <ShoppingCart size={15} /> Volver al catálogo
          </a>
          <Link to="/" className="button button-ghost">
            <ArrowLeft size={14} /> Inicio
          </Link>
        </div>

        {/* Help */}
        <p className="cc-help">
          ¿Tenés problemas? Escribinos a{" "}
          <a href="mailto:hola@urbansprout.com">hola@urbansprout.com</a>
        </p>

      </div>
    </div>
  );
}
