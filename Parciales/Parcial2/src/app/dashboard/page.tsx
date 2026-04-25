import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/env";
import { getUserRole } from "@/lib/roles";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const clerkConfigured = isClerkConfigured();
  const authData = clerkConfigured ? await auth() : null;
  const userId = authData?.userId ?? null;
  const sessionClaims = authData?.sessionClaims;
  if (!userId) {
    return (
      <main className="container" style={{ paddingBlock: "2rem" }}>
        <section className="stack panel" style={{ maxWidth: "760px" }}>
          <h1 className="section-title">Mi cuenta</h1>
          <p>Activa Clerk con tus llaves reales para usar autenticación y panel de usuario.</p>
          <Link className="button button-outline" href="/">
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  const user = clerkConfigured ? await currentUser() : null;
  const role = getUserRole(sessionClaims, user?.primaryEmailAddress?.emailAddress ?? null);
  const payment = (await searchParams).payment;

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
          <Link className="button button-primary" href="/">
            Volver al catálogo
          </Link>
          {role === "admin" ? (
            <Link className="button button-outline" href="/admin">
              Ir a vista admin
            </Link>
          ) : null}
        </div>
        {clerkConfigured ? <UserButton /> : null}
      </section>
    </main>
  );
}
