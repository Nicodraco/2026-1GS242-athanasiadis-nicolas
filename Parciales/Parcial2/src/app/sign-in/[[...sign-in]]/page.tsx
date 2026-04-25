import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { isClerkConfigured } from "@/lib/env";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="container" style={{ paddingBlock: "2rem" }}>
        <section className="panel stack" style={{ maxWidth: "680px" }}>
          <h1 className="section-title">Login no disponible</h1>
          <p>Configura las llaves reales de Clerk en `.env.local` para habilitar sign-in.</p>
          <Link className="button button-outline" href="/">
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container auth-center" style={{ paddingBlock: "2rem" }}>
      <SignIn
        path="/sign-in"
        signUpUrl="/sign-up"
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
