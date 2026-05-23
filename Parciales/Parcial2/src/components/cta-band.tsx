import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

type UserState = { id: string } | null | undefined;

interface CTABandProps {
  user: UserState;
  clerkReady: boolean;
}

export function CTABandSection({ user, clerkReady }: CTABandProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".cta-band-inner", {
        opacity: 0,
        scale: 0.96,
        y: 24,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".cta-band-inner", start: "top 80%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="cta-band" ref={ref}>
      <div className="container cta-band-inner">
        <span className="section-label">Empieza hoy</span>
        <h2 className="section-title">¿Listo para tu primera cosecha?</h2>
        <p className="section-sub">
          En menos de tres semanas puedes estar comiendo lo que cultivaste tú mismo en casa.
        </p>
        <div className="cta-band-actions">
          <a href="#catalogo" className="button button-white button-lg">
            Ver los kits
            <ArrowRight size={16} />
          </a>
          {!user && clerkReady && (
            <Link to="/sign-up" className="button button-outline-white button-lg">
              Crear cuenta gratis
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
