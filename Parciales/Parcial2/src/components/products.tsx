import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Leaf, Sprout, Trees } from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { products } from "@/lib/catalog";

gsap.registerPlugin(ScrollTrigger);

type UserState =
  | { id: string; primaryEmailAddress?: { emailAddress: string } | null }
  | null
  | undefined;

const VISUAL_CLASS: Record<string, string> = {
  "kit-balcon-basico":      "product-visual-balcon",
  "kit-microverde-rapido":  "product-visual-micro",
  "kit-aromaticas-compacto":"product-visual-aromas",
};

const ICONS: Record<string, React.ComponentType<{ size: number }>> = {
  "kit-balcon-basico":       Leaf,
  "kit-microverde-rapido":   Sprout,
  "kit-aromaticas-compacto": Trees,
};

export function ProductsSection({ user }: { user: UserState }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".products-header", {
        opacity: 0,
        y: 28,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: ".products-header", start: "top 82%" },
      });
      gsap.from(".product-card", {
        opacity: 0,
        y: 54,
        stagger: 0.14,
        duration: 0.7,
        ease: "back.out(1.2)",
        scrollTrigger: { trigger: ".products-grid", start: "top 76%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="catalogo" className="section products-bg" ref={ref}>
      <div className="container">
        <div className="section-header section-header-center products-header">
          <span className="section-label">Catálogo</span>
          <h2 className="section-title">Elige el kit para tu espacio.</h2>
          <p className="section-sub">
            Tres opciones diseñadas para distintos niveles y espacios. Todos incluyen todo lo necesario para empezar.
          </p>
        </div>

        <div className="products-grid">
          {products.map((product) => {
            const Icon = ICONS[product.id] ?? Leaf;
            const visualClass = VISUAL_CLASS[product.id] ?? "product-visual-balcon";
            return (
              <article className="product-card" key={product.id}>
                <div className={`product-visual ${visualClass}`}>
                  <div className="product-visual-icon">
                    <Icon size={20} />
                  </div>
                </div>

                <div className="product-tag-row">
                  <h3 className="product-name">{product.name}</h3>
                  <span className={`tag${product.tag === "Más vendido" ? " tag-hot" : ""}`}>
                    {product.tag}
                  </span>
                </div>

                <p className="product-desc">{product.description}</p>

                <div className="product-price-row">
                  <span className="product-price">${product.priceUsd.toFixed(2)}</span>
                  <span className="product-currency">USD</span>
                </div>

                <CheckoutButton
                  productId={product.id}
                  userId={user?.id ?? null}
                  userEmail={user?.primaryEmailAddress?.emailAddress ?? null}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
