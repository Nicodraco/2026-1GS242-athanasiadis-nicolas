import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/env";
import { getUserRole } from "@/lib/roles";

export default async function AdminPage() {
  const clerkConfigured = isClerkConfigured();
  const authData = clerkConfigured ? await auth() : null;
  const userId = authData?.userId ?? null;
  const sessionClaims = authData?.sessionClaims;
  if (!userId) {
    return (
      <main className="container" style={{ paddingBlock: "2rem" }}>
        <section className="panel stack" style={{ maxWidth: "720px" }}>
          <h1 className="section-title">Panel admin</h1>
          <p>Activa Clerk y define un admin para acceder a esta vista.</p>
          <Link className="button button-outline" href="/">
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  const user = clerkConfigured ? await currentUser() : null;
  const role = getUserRole(sessionClaims, user?.primaryEmailAddress?.emailAddress ?? null);
  if (role !== "admin") {
    return (
      <main className="container" style={{ paddingBlock: "2rem" }}>
        <section className="panel stack" style={{ maxWidth: "720px" }}>
          <h1 className="section-title">Acceso restringido</h1>
          <p>Solo usuarios con rol admin pueden entrar a esta vista.</p>
          <Link className="button button-outline" href="/dashboard">
            Volver a mi cuenta
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      <section className="panel stack" style={{ maxWidth: "720px" }}>
        <h1 className="section-title">Panel admin</h1>
        <p>Vista simple para administración inicial de UrbanSprout.</p>
        <div className="stack">
          <p>1. Revisar pagos de Stripe en dashboard oficial.</p>
          <p>2. Coordinar despachos de kits por zona urbana.</p>
          <p>3. Actualizar catálogo y precios por temporada.</p>
        </div>
      </section>
    </main>
  );
}
