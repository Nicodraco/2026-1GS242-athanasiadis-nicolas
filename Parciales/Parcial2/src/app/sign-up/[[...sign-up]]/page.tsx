import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { isClerkConfigured } from "@/lib/env";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="container" style={{ paddingBlock: "2rem" }}>
        <section className="panel stack" style={{ maxWidth: "680px" }}>
          <h1 className="section-title">Registro no disponible</h1>
          <p>Configura las llaves reales de Clerk en `.env.local` para habilitar sign-up.</p>
          <Link className="button button-outline" href="/">
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container auth-center" style={{ paddingBlock: "2rem" }}>
      <SignUp
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={{
          variables: {
            colorPrimary: "#2b6f49",
            colorText: "#2e3025",
            colorBackground: "#fff8ec",
          },
        }}
      />
    </main>
  );
}
