import {
  SignIn,
  SignInButton,
  SignUp,
  UserButton,
  UserProfile,
  useUser,
} from "@clerk/clerk-react";
import { useEffect, useMemo, useRef } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DashboardOrders } from "@/components/dashboard-orders";

import { Nav } from "@/components/nav";
import { HeroSection } from "@/components/hero";
import { FeaturesSection } from "@/components/features";
import { ProductsSection } from "@/components/products";
import { SocialProofSection } from "@/components/social-proof";
import { CTABandSection } from "@/components/cta-band";
import { FAQSection } from "@/components/faq";
import { SiteFooter } from "@/components/site-footer";
import { Marquee } from "@/components/marquee";
import { StatsSection } from "@/components/stats";
import { CustomCursor } from "@/components/cursor";
import { CartDrawer, CartTrigger } from "@/components/cart-drawer";
import { ProductPage } from "@/components/product-page";
import { CartProvider } from "@/lib/cart";
import { useLenis } from "@/lib/useLenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import { getAdminAppUrl, isClerkConfigured } from "@/lib/env";
import { getUserRole } from "@/lib/roles";

// ── Tipos ──────────────────────────────────────────────────────────
type UserState = ReturnType<typeof useUser>["user"];

// ── Home page ──────────────────────────────────────────────────────
function HomePage({ user, clerkReady }: { user: UserState; clerkReady: boolean }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useLenis();

  // IntersectionObserver for sticky CTA
  useEffect(() => {
    const hero = heroRef.current;
    const sticky = stickyRef.current;
    if (!hero || !sticky) return;
    const observer = new IntersectionObserver(
      ([entry]) => { sticky.style.display = entry.isIntersecting ? "none" : "block"; },
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Color shift on scroll per section
  useEffect(() => {
    const shifts = [
      { selector: "[data-section='hero']",     bg: "#faf9f7" },
      { selector: "[data-section='products']", bg: "#f0ede5" },
      { selector: ".features-bg",              bg: "#0c2218" },
      { selector: ".cta-band",                 bg: "#174230" },
    ];
    const triggers = shifts.map(({ selector, bg }) =>
      ScrollTrigger.create({
        trigger: selector,
        start: "top 55%",
        end: "bottom 45%",
        onEnter:     () => gsap.to("body", { backgroundColor: bg, duration: 0.7, ease: "power2.out" }),
        onEnterBack: () => gsap.to("body", { backgroundColor: bg, duration: 0.7, ease: "power2.out" }),
      }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <main>
      <div ref={heroRef}>
        <HeroSection user={user} clerkReady={clerkReady} />
      </div>

      {/* Marquee strip 1 */}
      <Marquee direction="left" speed={30} />

      <StatsSection />
      <FeaturesSection />

      {/* Marquee strip 2 — dark accent */}
      <Marquee direction="right" speed={24} accent />

      <ProductsSection user={user} />
      <SocialProofSection />
      <CTABandSection user={user} clerkReady={clerkReady} />
      <FAQSection />

      {/* Sticky CTA mobile */}
      <div ref={stickyRef} className="sticky-cta" style={{ display: "none" }}>
        <div className="sticky-cta-inner">
          <span className="sticky-cta-text">Kits desde $24.90 USD</span>
          <a href="#catalogo" className="button button-white">Ver kits →</a>
        </div>
      </div>
    </main>
  );
}

// Extrae datos de Clerk y los pasa como props a la HomePage
function HomePageWithClerk() {
  const { user } = useUser();
  return <HomePage user={user} clerkReady={isClerkConfigured()} />;
}

// ── Cart drawer conectado a Clerk (obtiene userId/email) ───────────
function CartDrawerWithClerk() {
  const { user } = useUser();
  return (
    <CartDrawer
      userId={user?.id ?? null}
      userEmail={user?.primaryEmailAddress?.emailAddress ?? null}
    />
  );
}

// ── Nav con datos de Clerk ─────────────────────────────────────────
function NavWithClerk() {
  const { user } = useUser();
  const role = getUserRole(user);
  const adminAppUrl = getAdminAppUrl();

  return (
    <Nav
      right={
        <>
          {/* Cart siempre visible */}
          <CartTrigger />

          {user ? (
            <>
              <Link to="/dashboard" className="button button-ghost">
                Mi cuenta
              </Link>
              {role === "admin" && (
                <a
                  href={adminAppUrl}
                  className="button button-outline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Admin
                </a>
              )}
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <button className="button button-primary" type="button">
                Iniciar sesión
              </button>
            </SignInButton>
          )}
        </>
      }
    />
  );
}

// ── Páginas de auth ────────────────────────────────────────────────
function SignInPage() {
  return (
    <main className="auth-center">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </main>
  );
}

function SignUpPage() {
  return (
    <main className="auth-center">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </main>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────
function DashboardPage() {
  const { user } = useUser();
  const role = getUserRole(user);
  const adminAppUrl = getAdminAppUrl();
  const location = useLocation();
  const payment = useMemo(
    () => new URLSearchParams(location.search).get("payment"),
    [location.search],
  );

  return (
    <main className="container page-pad">
      <div className="stack" style={{ maxWidth: "720px", gap: "var(--s4)" }}>
        <section className="stack panel">
          <h1 className="section-title" style={{ marginBottom: 0 }}>
            Mi cuenta
          </h1>
          <span className="role-badge">Tipo de usuario: {role}</span>

          {payment === "success" && (
            <p className="status-success">
              Pago completado. Tu kit está en preparación 🌱
            </p>
          )}
          {payment === "cancelled" && (
            <p className="status-error">
              Pago cancelado. Puedes intentarlo otra vez cuando quieras.
            </p>
          )}
          {!payment && (
            <p style={{ color: "var(--ash)" }}>
              Desde aquí gestionas tus compras y accesos.
            </p>
          )}

          <div className="cta-row">
            <Link className="button button-primary" to="/">
              Volver al catálogo
            </Link>
            <Link className="button button-outline" to="/perfil">
              Mi perfil
            </Link>
            {role === "admin" && (
              <a
                className="button button-outline"
                href={adminAppUrl}
                target="_blank"
                rel="noreferrer"
              >
                Ir al backoffice
              </a>
            )}
          </div>
        </section>

        <section className="panel stack">
          <h2 className="section-title" style={{ fontSize: "var(--t-xl)", marginBottom: 0 }}>
            Mis compras
          </h2>
          {user && <DashboardOrders userId={user.id} />}
        </section>
      </div>
    </main>
  );
}

function AdminBridgePage() {
  const adminAppUrl = getAdminAppUrl();
  return (
    <main className="container page-pad">
      <section className="panel stack" style={{ maxWidth: "680px" }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>
          Backoffice separado
        </h1>
        <p style={{ color: "var(--ash)" }}>
          El panel admin de UrbanSprout corre en una app independiente de React + Vite.
        </p>
        <div className="cta-row">
          <a className="button button-primary" href={adminAppUrl} target="_blank" rel="noreferrer">
            Abrir backoffice
          </a>
          <Link className="button button-outline" to="/dashboard">
            Volver a mi cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}

// ── Legal placeholder pages ────────────────────────────────────────
const LEGAL_CONTENT: Record<string, { title: string; body: string }> = {
  terminos: {
    title: "Términos de servicio",
    body: "Al adquirir un kit de UrbanSprout aceptas nuestras condiciones de venta. Los pedidos se procesan en 1-2 días hábiles. El precio mostrado incluye el kit completo. Los pagos se gestionan de forma segura a través de Stripe y nunca almacenamos datos de tu tarjeta.",
  },
  privacidad: {
    title: "Política de privacidad",
    body: "UrbanSprout recopila únicamente el correo electrónico y datos de envío necesarios para completar tu pedido. No vendemos ni compartimos tu información con terceros. Puedes solicitar la eliminación de tus datos escribiéndonos a hola@urbansprout.com en cualquier momento.",
  },
  devoluciones: {
    title: "Política de devoluciones",
    body: "Ofrecemos garantía de 2 semanas desde la recepción del kit. Si tus plantas no germinan siguiendo las instrucciones incluidas, te enviamos un kit de reemplazo sin costo. Para iniciar una devolución contáctanos en hola@urbansprout.com indicando tu número de pedido.",
  },
};

function LegalPage({ slug }: { slug: "terminos" | "privacidad" | "devoluciones" }) {
  const { title, body } = LEGAL_CONTENT[slug];
  return (
    <main className="container page-pad">
      <section className="panel stack" style={{ maxWidth: "680px" }}>
        <Link className="button button-ghost" to="/" style={{ alignSelf: "flex-start", marginBottom: "var(--s2)" }}>
          ← Volver
        </Link>
        <h1 className="section-title" style={{ marginBottom: "var(--s2)" }}>{title}</h1>
        <p style={{ color: "var(--ash)", lineHeight: 1.75 }}>{body}</p>
        <p style={{ color: "var(--ash)", marginTop: "var(--s3)" }}>
          ¿Tienes dudas? Escríbenos a{" "}
          <a href="mailto:hola@urbansprout.com" style={{ color: "var(--forest)", textDecoration: "underline" }}>
            hola@urbansprout.com
          </a>
        </p>
      </section>
    </main>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  if (user) return <>{children}</>;

  return (
    <main className="container page-pad">
      <section className="stack panel" style={{ maxWidth: "560px" }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>
          Mi cuenta
        </h1>
        <p style={{ color: "var(--ash)" }}>
          Debes iniciar sesión para continuar.
        </p>
        <Link className="button button-primary" to="/sign-in">
          Ir a iniciar sesión
        </Link>
      </section>
    </main>
  );
}

// ── App con Clerk ──────────────────────────────────────────────────
function AppWithClerk() {
  return (
    <>
      <CustomCursor />
      <NavWithClerk />
      <CartDrawerWithClerk />
      <Routes>
        <Route path="/"            element={<HomePageWithClerk />} />
        <Route path="/sign-in/*"   element={<SignInPage />} />
        <Route path="/sign-up/*"   element={<SignUpPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/perfil/*"
          element={
            <RequireAuth>
              <main className="container page-pad">
                <UserProfile path="/perfil" routing="path" />
              </main>
            </RequireAuth>
          }
        />
        <Route path="/admin"       element={<AdminBridgePage />} />
        <Route path="/producto/:id" element={<ProductPage />} />
        <Route path="/terminos"    element={<LegalPage slug="terminos" />} />
        <Route path="/privacidad"  element={<LegalPage slug="privacidad" />} />
        <Route path="/devoluciones" element={<LegalPage slug="devoluciones" />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </>
  );
}

// ── App sin Clerk (Clerk no configurado) ───────────────────────────
function AppWithoutClerk() {
  const adminAppUrl = getAdminAppUrl();

  return (
    <>
      <CustomCursor />
      <Nav
        right={
          <>
            <CartTrigger />
            <a href="#catalogo" className="button button-primary">Ver kits</a>
          </>
        }
      />
      <CartDrawer userId={null} userEmail={null} />
      <Routes>
        <Route path="/" element={<HomePage user={null} clerkReady={false} />} />
        <Route
          path="/sign-in/*"
          element={
            <main className="auth-center">
              <section className="panel stack" style={{ maxWidth: "480px", width: "100%" }}>
                <h1 className="section-title" style={{ marginBottom: 0 }}>
                  Iniciar sesión
                </h1>
                <p style={{ color: "var(--ash)" }}>
                  Configura Clerk para habilitar autenticación.
                </p>
              </section>
            </main>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <main className="auth-center">
              <section className="panel stack" style={{ maxWidth: "480px", width: "100%" }}>
                <h1 className="section-title" style={{ marginBottom: 0 }}>
                  Crear cuenta
                </h1>
                <p style={{ color: "var(--ash)" }}>
                  Configura Clerk para habilitar registro.
                </p>
              </section>
            </main>
          }
        />
        <Route
          path="/dashboard"
          element={
            <main className="container page-pad">
              <section className="stack panel" style={{ maxWidth: "680px" }}>
                <h1 className="section-title" style={{ marginBottom: 0 }}>
                  Mi cuenta
                </h1>
                <p style={{ color: "var(--ash)" }}>
                  Activa Clerk con tus llaves para usar autenticación.
                </p>
                <Link className="button button-primary" to="/">
                  Volver al catálogo
                </Link>
              </section>
            </main>
          }
        />
        <Route
          path="/admin"
          element={
            <main className="container page-pad">
              <section className="panel stack" style={{ maxWidth: "680px" }}>
                <h1 className="section-title" style={{ marginBottom: 0 }}>
                  Backoffice
                </h1>
                <a className="button button-primary" href={adminAppUrl} target="_blank" rel="noreferrer">
                  Abrir backoffice
                </a>
              </section>
            </main>
          }
        />
        <Route path="/producto/:id" element={<ProductPage />} />
        <Route path="/terminos"    element={<LegalPage slug="terminos" />} />
        <Route path="/privacidad"  element={<LegalPage slug="privacidad" />} />
        <Route path="/devoluciones" element={<LegalPage slug="devoluciones" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </>
  );
}

// ── Root — CartProvider envuelve todo ──────────────────────────────
export default function App() {
  return (
    <CartProvider>
      {isClerkConfigured() ? <AppWithClerk /> : <AppWithoutClerk />}
    </CartProvider>
  );
}
