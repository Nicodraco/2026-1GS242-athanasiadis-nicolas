import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import VanillaTilt from "vanilla-tilt";
import { ShoppingCart, Check, Zap } from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { products } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

gsap.registerPlugin(ScrollTrigger);

type UserState =
  | { id: string; primaryEmailAddress?: { emailAddress: string } | null }
  | null
  | undefined;

const PRODUCT_IMAGES: Record<string, string> = {
  "kit-balcon-basico":
    "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=640&q=85&auto=format&fit=crop",
  "kit-microverde-rapido":
    "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=640&q=85&auto=format&fit=crop",
  "kit-aromaticas-compacto":
    "https://images.unsplash.com/photo-1524159730786-4e74a1b56560?w=640&q=85&auto=format&fit=crop",
};

const ACCENTS: Record<string, string> = {
  "kit-balcon-basico":      "#39ff14",
  "kit-microverde-rapido":  "#00e5ff",
  "kit-aromaticas-compacto":"#ff9500",
};

/* ── Add to Cart button with visual feedback ─────────────────────── */
function AddToCartBtn({ productId }: { productId: string }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(productId);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <button
      className={`btn-add-cart${added ? " btn-add-cart--added" : ""}`}
      onClick={handleAdd}
      aria-label={added ? "Añadido al carrito" : "Agregar al carrito"}
    >
      {added ? (
        <><Check size={13} /> Añadido</>
      ) : (
        <><ShoppingCart size={13} /> Agregar</>
      )}
    </button>
  );
}

interface ProductCardProps {
  product: (typeof products)[number];
  user: UserState;
  index: number;
}

function ProductCard({ product, user, index }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const accent = ACCENTS[product.id] ?? "#39ff14";

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    VanillaTilt.init(el, {
      max: 10,
      speed: 500,
      glare: true,
      "max-glare": 0.18,
      perspective: 900,
      scale: 1.04,
    });
    return () => {
      (el as HTMLElement & { vanillaTilt?: { destroy(): void } }).vanillaTilt?.destroy();
    };
  }, []);

  const isHot = product.tag === "Más vendido";

  return (
    <article
      ref={cardRef}
      className="product-card-v2"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      {/* Image */}
      <div className="pcv2-img-wrap">
        <img
          src={PRODUCT_IMAGES[product.id]}
          alt={product.name}
          className="pcv2-img"
          loading={index === 0 ? "eager" : "lazy"}
        />
        <div className="pcv2-img-overlay" />
        {isHot && (
          <span className="pcv2-hot-badge">
            <Zap size={11} /> Más vendido
          </span>
        )}
      </div>

      {/* Body */}
      <div className="pcv2-body">
        <div className="pcv2-header">
          <h3 className="pcv2-name">{product.name}</h3>
          <span className="pcv2-tag">{product.tag}</span>
        </div>

        <p className="pcv2-desc">{product.description}</p>

        <div className="pcv2-footer">
          <div className="pcv2-price-block">
            <span className="pcv2-price">${product.priceUsd.toFixed(2)}</span>
            <span className="pcv2-currency">USD</span>
          </div>
          <div className="pcv2-actions">
            <AddToCartBtn productId={product.id} />
            <CheckoutButton
              productId={product.id}
              userId={user?.id ?? null}
              userEmail={user?.primaryEmailAddress?.emailAddress ?? null}
            />
          </div>
        </div>
      </div>

      {/* Accent line */}
      <div className="pcv2-accent-line" />
    </article>
  );
}

export function ProductsSection({ user }: { user: UserState }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".products-v2-header", {
        opacity: 0, y: 40, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: ".products-v2-header", start: "top 82%" },
      });
      gsap.from(".product-card-v2", {
        opacity: 0, y: 70, scale: 0.95,
        stagger: 0.15, duration: 0.8, ease: "back.out(1.4)",
        scrollTrigger: { trigger: ".products-v2-grid", start: "top 78%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="catalogo" className="section products-v2-section" ref={ref} data-section="products">
      <div className="container">
        <div className="products-v2-header section-header">
          <span className="section-label">Catálogo</span>
          <h2 className="section-title">Elige tu kit.</h2>
          <p className="section-sub">
            Tres opciones. Todo incluido. Sin experiencia previa.
          </p>
        </div>

        <div className="products-v2-grid">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} user={user} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
