import { SignIn, SignInButton, SignUp, UserButton, useUser } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CheckoutButton } from "@/components/checkout-button";
import { products, type Product } from "@/lib/catalog";
import { getAdminAppUrl, getApiUrl, isClerkConfigured } from "@/lib/env";
import { getUserRole } from "@/lib/roles";

function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkReady = isClerkConfigured();
  const { user } = useUser();
  const role = getUserRole(user);
  const adminAppUrl = getAdminAppUrl();

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="Ir al inicio de UrbanSprout">
            <span aria-hidden="true">🌿</span>
            UrbanSprout
          </Link>
          <div className="nav-actions">
            {clerkReady && user ? (
              <>
                <Link to="/dashboard" className="button button-outline">
                  Panel
                </Link>
                {role === "admin" ? (
                  <a href={adminAppUrl} className="button button-outline" target="_blank" rel="noreferrer">
                    Admin
                  </a>
                ) : null}
                <UserButton />
              </>
            ) : clerkReady ? (
              <SignInButton mode="modal">
                <button className="button button-outline" type="button">
                  Iniciar sesión
                </button>
              </SignInButton>
            ) : (
              <button className="button button-outline" type="button" disabled>
                Configura Clerk para login
              </button>
            )}
          </div>
        </div>
      </header>
      {children}
      <footer className="footer">
        <div className="container">
          <p>UrbanSprout · Frontend React + Vite · Auth Clerk · Pagos Stripe</p>
        </div>
      </footer>
    </>
  );
}

function HomePage() {
  const { user } = useUser();
  const clerkReady = isClerkConfigured();
  const apiUrl = getApiUrl();
  const [catalog, setCatalog] = useState<Product[] | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const url = `${apiUrl}/products`;

    async function loadCatalog() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return;

        const body = (await response.json()) as {
          data: Array<Product & { isActive: boolean }>;
        };
        if (!alive) return;

        setCatalog(
          body.data.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            priceUsd: product.priceUsd,
            tag: product.tag,
          })),
        );
      } catch {
        if (!alive) return;
        setCatalog(null);
      }
    }

    void loadCatalog();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [apiUrl]);

  const productsToRender = catalog ?? products;

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="hero-badge">Sostenible sin salir de casa</span>
            <h1>Tu mini huerto en casa, aunque vivas en un apartamento.</h1>
            <p>
              Kits pequeños de cultivo con semillas, sustrato y guía práctica para cosechar en
              espacios reducidos o zonas con poco acceso a tierra fértil.
            </p>
            <div className="cta-row">
              <a className="button button-primary" href="#catalogo">
                Empezar a cultivar hoy
              </a>
              {!user ? (
                clerkReady ? (
                  <Link to="/sign-up" className="button button-outline">
                    Crear cuenta
                  </Link>
                ) : (
                  <button className="button button-outline" type="button" disabled>
                    Habilita Clerk para registro
                  </button>
                )
              ) : (
                <Link className="button button-outline" to="/dashboard">
                  Mi cuenta
                </Link>
              )}
            </div>
          </div>
          <div className="hero-card">
            <h3>¿Qué incluye cada kit?</h3>
            <ul>
              <li>Semillas para microcultivos de ciclo corto.</li>
              <li>Macetas compactas y sustrato ligero.</li>
              <li>Guía de riego y luz para espacios pequeños.</li>
              <li>Soporte básico para primeras 2 semanas.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="catalogo" className="products">
        <div className="container">
          <h2 className="section-title">Kits para arrancar en una tarde</h2>
          <div className="grid">
            {productsToRender.map((product) => (
              <article className="product" key={product.id}>
                <span className="pill">{product.tag}</span>
                <h3>{product.name}</h3>
                <p className="meta">{product.description}</p>
                <p className="price">${product.priceUsd.toFixed(2)} USD</p>
                <CheckoutButton
                  productId={product.id}
                  userId={user?.id ?? null}
                  userEmail={user?.primaryEmailAddress?.emailAddress ?? null}
                />
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardPage() {
  const { user } = useUser();
  const role = getUserRole(user);
  const location = useLocation();
  const adminAppUrl = getAdminAppUrl();
  const payment = useMemo(() => new URLSearchParams(location.search).get("payment"), [location.search]);

  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      <section className="stack panel" style={{ maxWidth: "760px" }}>
        <h1 className="section-title">Mi cuenta</h1>
        <p className="role-badge">Tipo de usuario: {role}</p>
        {payment === "success" ? (
          <p>Pago completado. Tu kit está en preparación 🌿</p>
        ) : payment === "cancelled" ? (
          <p>Pago cancelado. Puedes intentarlo otra vez cuando quieras.</p>
        ) : (
          <p>Desde aquí gestionas tus compras y accesos.</p>
        )}
        <div className="cta-row">
          <Link className="button button-primary" to="/">
            Volver al catálogo
          </Link>
          {role === "admin" ? (
            <a className="button button-outline" href={adminAppUrl} target="_blank" rel="noreferrer">
              Ir al backoffice
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function AdminBridgePage() {
  const adminAppUrl = getAdminAppUrl();
  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      <section className="panel stack" style={{ maxWidth: "720px" }}>
        <h1 className="section-title">Backoffice separado</h1>
        <p>El panel admin de UrbanSprout corre en una app independiente de React + Vite.</p>
        <div className="stack">
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

function SignInPage() {
  return (
    <main className="container auth-center">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </main>
  );
}

function SignUpPage() {
  return (
    <main className="container auth-center">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </main>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  if (user) return <>{children}</>;

  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      <section className="stack panel" style={{ maxWidth: "760px" }}>
        <h1 className="section-title">Mi cuenta</h1>
        <p>Debes iniciar sesión para continuar.</p>
        <Link className="button button-primary" to="/sign-in">
          Ir a iniciar sesión
        </Link>
      </section>
    </main>
  );
}

function AppWithClerk() {
  return (
    <RootLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route path="/admin" element={<AdminBridgePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RootLayout>
  );
}

function AppWithoutClerk() {
  const adminAppUrl = getAdminAppUrl();

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="Ir al inicio de UrbanSprout">
            <span aria-hidden="true">🌿</span>
            UrbanSprout
          </Link>
          <div className="nav-actions">
            <button className="button button-outline" type="button" disabled>
              Configura Clerk para login
            </button>
          </div>
        </div>
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <main>
              <section className="hero">
                <div className="container hero-grid">
                  <div>
                    <span className="hero-badge">Sostenible sin salir de casa</span>
                    <h1>Tu mini huerto en casa, aunque vivas en un apartamento.</h1>
                    <p>
                      Kits pequeños de cultivo con semillas, sustrato y guía práctica para cosechar
                      en espacios reducidos o zonas con poco acceso a tierra fértil.
                    </p>
                  </div>
                  <div className="hero-card">
                    <h3>¿Qué incluye cada kit?</h3>
                    <ul>
                      <li>Semillas para microcultivos de ciclo corto.</li>
                      <li>Macetas compactas y sustrato ligero.</li>
                      <li>Guía de riego y luz para espacios pequeños.</li>
                      <li>Soporte básico para primeras 2 semanas.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="catalogo" className="products">
                <div className="container">
                  <h2 className="section-title">Kits para arrancar en una tarde</h2>
                  <div className="grid">
                    {products.map((product) => (
                      <article className="product" key={product.id}>
                        <span className="pill">{product.tag}</span>
                        <h3>{product.name}</h3>
                        <p className="meta">{product.description}</p>
                        <p className="price">${product.priceUsd.toFixed(2)} USD</p>
                        <CheckoutButton productId={product.id} userId={null} userEmail={null} />
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </main>
          }
        />
        <Route
          path="/sign-in"
          element={
            <main className="container auth-center">
              <section className="panel stack" style={{ maxWidth: "560px", width: "100%" }}>
                <h1 className="section-title">Sign in</h1>
                <p>Configura Clerk para habilitar inicio de sesión.</p>
              </section>
            </main>
          }
        />
        <Route
          path="/sign-up"
          element={
            <main className="container auth-center">
              <section className="panel stack" style={{ maxWidth: "560px", width: "100%" }}>
                <h1 className="section-title">Sign up</h1>
                <p>Configura Clerk para habilitar registro.</p>
              </section>
            </main>
          }
        />
        <Route
          path="/dashboard"
          element={
            <main className="container" style={{ paddingBlock: "2rem" }}>
              <section className="stack panel" style={{ maxWidth: "760px" }}>
                <h1 className="section-title">Mi cuenta</h1>
                <p>Activa Clerk con tus llaves reales para usar autenticación y panel de usuario.</p>
              </section>
            </main>
          }
        />
        <Route
          path="/admin"
          element={
            <main className="container" style={{ paddingBlock: "2rem" }}>
              <section className="panel stack" style={{ maxWidth: "720px" }}>
                <h1 className="section-title">Backoffice separado</h1>
                <p>El panel admin de UrbanSprout corre en una app independiente de React + Vite.</p>
                <a className="button button-primary" href={adminAppUrl} target="_blank" rel="noreferrer">
                  Abrir backoffice
                </a>
              </section>
            </main>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="footer">
        <div className="container">
          <p>UrbanSprout · Frontend React + Vite · Auth Clerk · Pagos Stripe</p>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return isClerkConfigured() ? <AppWithClerk /> : <AppWithoutClerk />;
}
