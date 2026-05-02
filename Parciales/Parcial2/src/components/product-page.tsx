import { useEffect, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { gsap } from "gsap";
import { ArrowLeft, Check, ShoppingCart, Leaf, Clock, Package, Star, ChevronRight } from "lucide-react";
import { products } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

/* ── Per-product rich content ──────────────────────────────────── */
const DETAIL: Record<string, {
  tagline: string;
  image: string;
  imageAlt: string;
  accentColor: string;
  includes: string[];
  specs: { label: string; value: string }[];
  steps: { step: string; text: string }[];
  testimonial: { quote: string; author: string; city: string };
}> = {
  "kit-balcon-basico": {
    tagline: "El punto de partida perfecto para tu huerto en casa.",
    accentColor: "#39ff14",
    image:
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&q=90&auto=format&fit=crop",
    imageAlt: "Plantas de lechuga, cilantro y cebollín en macetas de balcón",
    includes: [
      "3 macetas de plástico reciclado (Ø 15 cm con bandeja)",
      "Semillas de lechuga hoja de roble",
      "Semillas de cilantro criollo",
      "Semillas de cebollín",
      "1.5 L de sustrato pre-fertilizado",
      "Guía de cultivo impresa paso a paso",
      "Acceso a soporte por email 30 días",
    ],
    specs: [
      { label: "Primera cosecha", value: "14 – 21 días" },
      { label: "Luz necesaria", value: "2 – 3 h de sol directo" },
      { label: "Espacio requerido", value: "30 × 30 cm" },
      { label: "Dificultad", value: "Principiante" },
      { label: "Riego", value: "Cada 2 días" },
    ],
    steps: [
      { step: "Día 1", text: "Coloca el sustrato en las macetas, siembra las semillas y humedece bien." },
      { step: "Días 3-7", text: "Aparecen los primeros brotes. Asegúrate de tener luz y riego constante." },
      { step: "Días 14-21", text: "¡Tu primera cosecha! Corta las hojas externas y deja crecer el centro." },
    ],
    testimonial: {
      quote:
        "En dos semanas tenía lechuga fresca para mis ensaladas. Mi balcón nunca había olido tan bien.",
      author: "Sofía M.",
      city: "Madrid",
    },
  },
  "kit-microverde-rapido": {
    tagline: "Los brotes más nutritivos del mundo, listos en menos de 10 días.",
    accentColor: "#00e5ff",
    image:
      "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=1200&q=90&auto=format&fit=crop",
    imageAlt: "Bandejas con microbrotes verdes en una cocina de apartamento",
    includes: [
      "2 bandejas de germinación con tapa de humedad",
      "Mix de semillas de rabanito, mostaza y girasol",
      "Semillas de trigo sarraceno (pack extra)",
      "500 g de vermiculita + tierra especial microbrotes",
      "Aspersor manual de niebla fina",
      "Guía de oscuridad/luz para germinación",
      "Acceso a soporte por email 30 días",
    ],
    specs: [
      { label: "Primera cosecha", value: "7 – 10 días" },
      { label: "Luz necesaria", value: "Luz indirecta (sin sol directo)" },
      { label: "Espacio requerido", value: "20 × 40 cm" },
      { label: "Dificultad", value: "Fácil" },
      { label: "Riego", value: "2 veces al día con aspersor" },
    ],
    steps: [
      { step: "Día 1-2", text: "Remoja las semillas 8 h, distribúyelas en la bandeja y cúbrelas para oscuridad." },
      { step: "Días 3-5", text: "Retira la tapa, exponlos a luz indirecta. Riega dos veces al día." },
      { step: "Días 7-10", text: "Cosecha con tijeras cuando midan 5-8 cm. Úsalos en ensaladas o sándwiches." },
    ],
    testimonial: {
      quote:
        "Son increíblemente fáciles y el sabor es mucho más intenso que los del supermercado. Los hago cada semana.",
      author: "Carlos R.",
      city: "Barcelona",
    },
  },
  "kit-aromaticas-compacto": {
    tagline: "Albahaca, menta y perejil frescos a mano para cocinar cada día.",
    accentColor: "#ff9500",
    image:
      "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=1200&q=90&auto=format&fit=crop",
    imageAlt: "Macetas compactas de albahaca, menta y perejil en repisa de cocina",
    includes: [
      "3 macetas cerámica blanca mate (Ø 12 cm)",
      "Semillas de albahaca genovesa",
      "Semillas de menta piperita",
      "Semillas de perejil liso italiano",
      "1.2 L de sustrato ligero para aromáticas",
      "Guía de poda, riego y uso en cocina",
      "Pequeñas etiquetas identificadoras de madera",
      "Acceso a soporte por email 30 días",
    ],
    specs: [
      { label: "Primera cosecha", value: "18 – 28 días" },
      { label: "Luz necesaria", value: "4 – 6 h de sol (o luz artificial)" },
      { label: "Espacio requerido", value: "40 × 15 cm en repisa" },
      { label: "Dificultad", value: "Fácil" },
      { label: "Riego", value: "Cada 2-3 días según temperatura" },
    ],
    steps: [
      { step: "Semana 1", text: "Siembra y coloca en zona con buena luz. No riegues en exceso." },
      { step: "Semana 2-3", text: "Primer raleo: retira los brotes más débiles para que crezcan los fuertes." },
      { step: "Semana 3-4", text: "Empieza a podar las puntas para que la planta se vuelva más densa y productiva." },
    ],
    testimonial: {
      quote:
        "El kit de aromáticas transformó mi cocina. Siempre tengo albahaca fresca para la pasta y menta para los cócteles.",
      author: "Valentina G.",
      city: "Buenos Aires",
    },
  },
};

/* ── Add-to-cart button (large variant) ───────────────────────── */
function AddToCartLarge({ productId }: { productId: string }) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(productId);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 900);
  };

  return (
    <button
      className={`btn-add-cart-lg${added ? " btn-add-cart-lg--added" : ""}`}
      onClick={handleAdd}
      aria-label={added ? "Añadido al carrito" : "Agregar al carrito"}
    >
      {added ? (
        <><Check size={18} /> ¡Añadido al carrito!</>
      ) : (
        <><ShoppingCart size={18} /> Agregar al carrito</>
      )}
    </button>
  );
}

/* ── Product Page ──────────────────────────────────────────────── */
export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const pageRef = useRef<HTMLDivElement>(null);

  const product = products.find((p) => p.id === id);
  const detail = id ? DETAIL[id] : undefined;

  // GSAP entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.05 });
      tl.fromTo(".pp-breadcrumb",  { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" });
      tl.fromTo(".pp-img-hero",    { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.5)" }, 0.1);
      tl.fromTo(".pp-tag",         { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, 0.2);
      tl.fromTo(".pp-title",       { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, 0.3);
      tl.fromTo(".pp-tagline",     { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, "-=0.25");
      tl.fromTo(".pp-price-block", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, "-=0.25");
      tl.fromTo(".pp-cta-area",    { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, "-=0.2");
      tl.fromTo(".pp-trust-row",   { opacity: 0 }, { opacity: 1, duration: 0.3 }, "-=0.1");
      tl.fromTo(".pp-section",     { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.6, ease: "power3.out" }, "-=0.1");
    }, pageRef);
    return () => ctx.revert();
  }, [id]);

  if (!product || !detail) return <Navigate to="/" replace />;

  const otherProducts = products.filter((p) => p.id !== product.id);

  return (
    <div className="product-page" ref={pageRef}>
      <div className="container">

        {/* Breadcrumb */}
        <nav className="pp-breadcrumb" aria-label="Ruta de navegación">
          <Link to="/" className="pp-breadcrumb-link">Inicio</Link>
          <ChevronRight size={13} className="pp-breadcrumb-sep" />
          <a href="/#catalogo" className="pp-breadcrumb-link">Catálogo</a>
          <ChevronRight size={13} className="pp-breadcrumb-sep" />
          <span className="pp-breadcrumb-current">{product.name}</span>
        </nav>

        {/* Hero grid */}
        <div className="pp-hero-grid">

          {/* Left — image */}
          <div className="pp-img-side">
            <div className="pp-img-frame" style={{ "--pp-accent": detail.accentColor } as React.CSSProperties}>
              <img
                src={detail.image}
                alt={detail.imageAlt}
                className="pp-img-hero"
                loading="eager"
              />
              <div className="pp-img-border-card" aria-hidden />
              <span className="pp-img-badge">
                <Leaf size={11} /> Kit completo
              </span>
            </div>
          </div>

          {/* Right — info */}
          <div className="pp-info-side">
            <div className="pp-tag">{product.tag}</div>
            <h1 className="pp-title">{product.name}</h1>
            <p className="pp-tagline">{detail.tagline}</p>

            {/* Price */}
            <div className="pp-price-block">
              <span className="pp-price">${product.priceUsd.toFixed(2)}</span>
              <span className="pp-currency">USD</span>
              <span className="pp-price-note">· Todo incluido</span>
            </div>

            {/* Quick specs */}
            <ul className="pp-quick-specs">
              {detail.specs.slice(0, 3).map((s) => (
                <li key={s.label} className="pp-spec-item">
                  <span className="pp-spec-label">{s.label}</span>
                  <span className="pp-spec-value">{s.value}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="pp-cta-area">
              <AddToCartLarge productId={product.id} />
              <a href="/#catalogo" className="pp-back-link">
                <ArrowLeft size={14} />
                Ver todos los kits
              </a>
            </div>

            {/* Trust signals */}
            <div className="pp-trust-row">
              <span><Check size={12} /> Envío en 48 h</span>
              <span><Check size={12} /> Garantía 2 semanas</span>
              <span><Check size={12} /> Pagos seguros</span>
            </div>
          </div>
        </div>

        {/* ── Detail sections ── */}
        <div className="pp-details">

          {/* What's included */}
          <div className="pp-section pp-includes-section">
            <div className="pp-section-icon"><Package size={20} /></div>
            <h2 className="pp-section-title">¿Qué incluye el kit?</h2>
            <ul className="pp-includes-list">
              {detail.includes.map((item) => (
                <li key={item} className="pp-includes-item">
                  <Check size={14} className="pp-check-icon" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Specs grid */}
          <div className="pp-section pp-specs-section">
            <div className="pp-section-icon"><Clock size={20} /></div>
            <h2 className="pp-section-title">Especificaciones</h2>
            <div className="pp-specs-grid">
              {detail.specs.map((s) => (
                <div key={s.label} className="pp-spec-card">
                  <span className="pp-spec-card-label">{s.label}</span>
                  <span className="pp-spec-card-value">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="pp-section pp-steps-section">
            <div className="pp-section-icon">🌱</div>
            <h2 className="pp-section-title">Cómo funciona</h2>
            <div className="pp-steps-list">
              {detail.steps.map((s, i) => (
                <div key={i} className="pp-step">
                  <div className="pp-step-badge">{s.step}</div>
                  <p className="pp-step-text">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="pp-section pp-testimonial-section" style={{ "--pp-accent": detail.accentColor } as React.CSSProperties}>
            <div className="pp-testimonial">
              <div className="pp-testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <blockquote className="pp-testimonial-quote">"{detail.testimonial.quote}"</blockquote>
              <p className="pp-testimonial-author">
                — {detail.testimonial.author}, {detail.testimonial.city}
              </p>
            </div>
          </div>

        </div>

        {/* ── Other kits ── */}
        <div className="pp-section pp-other-section">
          <h2 className="pp-section-title pp-other-title">También te puede interesar</h2>
          <div className="pp-other-grid">
            {otherProducts.map((op) => (
              <Link
                key={op.id}
                to={`/producto/${op.id}`}
                className="pp-other-card"
                style={{ "--pp-accent": DETAIL[op.id]?.accentColor } as React.CSSProperties}
              >
                <img
                  src={DETAIL[op.id]?.image}
                  alt={op.name}
                  className="pp-other-img"
                  loading="lazy"
                />
                <div className="pp-other-body">
                  <span className="pp-other-name">{op.name}</span>
                  <span className="pp-other-price">${op.priceUsd.toFixed(2)} USD</span>
                </div>
                <div className="pp-other-accent-line" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
