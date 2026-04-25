import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { CheckoutButton } from "@/components/checkout-button";
import { products } from "@/lib/catalog";
import { isClerkConfigured } from "@/lib/env";
import { getUserRole } from "@/lib/roles";

export default async function Home() {
  const clerkConfigured = isClerkConfigured();
  const authData = clerkConfigured ? await auth() : null;
  const userId = authData?.userId ?? null;
  const sessionClaims = authData?.sessionClaims;
  const user = clerkConfigured && userId ? await currentUser() : null;
  const role = getUserRole(sessionClaims, user?.primaryEmailAddress?.emailAddress ?? null);

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" className="brand" aria-label="Ir al inicio de UrbanSprout">
            <Image
              src="/logo-urbansprout.svg"
              alt="Logo UrbanSprout"
              width={34}
              height={34}
              className="brand-logo"
            />
            UrbanSprout
          </Link>
          <div className="nav-actions">
            {clerkConfigured && userId ? (
              <>
                <Link href="/dashboard" className="button button-outline">
                  Panel
                </Link>
                {role === "admin" ? (
                  <Link href="/admin" className="button button-outline">
                    Admin
                  </Link>
                ) : null}
                <UserButton />
              </>
            ) : (
              <>
                {clerkConfigured ? (
                  <Link href="/sign-in" className="button button-outline">
                    Iniciar sesión
                  </Link>
                ) : (
                  <button className="button button-outline" type="button" disabled>
                    Configura Clerk para login
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="hero-badge">Sostenible sin salir de casa</span>
              <h1>Tu mini huerto en casa, aunque vivas en un apartamento.</h1>
              <p>
                Kits pequeños de cultivo con semillas, sustrato y guía práctica para
                cosechar en espacios reducidos o zonas con poco acceso a tierra fértil.
              </p>
              <div className="cta-row">
                <a className="button button-primary" href="#catalogo">
                  Empezar a cultivar hoy
                </a>
                {!userId ? (
                  clerkConfigured ? (
                    <Link href="/sign-up" className="button button-outline">
                      Crear cuenta
                    </Link>
                  ) : (
                    <button className="button button-outline" type="button" disabled>
                      Habilita Clerk para registro
                    </button>
                  )
                ) : (
                  <Link className="button button-outline" href="/dashboard">
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
              {products.map((product) => (
                <article className="product" key={product.id}>
                  <span className="pill">{product.tag}</span>
                  <h3>{product.name}</h3>
                  <p className="meta">{product.description}</p>
                  <p className="price">${product.priceUsd.toFixed(2)} USD</p>
                  <CheckoutButton productId={product.id} />
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>
            UrbanSprout · Ecommerce B2C para kits de cultivo pequeños. Autenticación con
            Clerk (Google, Microsoft y OTP) y pagos con Stripe.
          </p>
        </div>
      </footer>
    </>
  );
}
