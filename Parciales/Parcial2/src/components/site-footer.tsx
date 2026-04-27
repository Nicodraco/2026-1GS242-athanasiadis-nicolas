import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <div className="brand-icon">
                <Sprout size={16} />
              </div>
              UrbanSprout
            </Link>
            <p className="footer-tagline">
              Kits de cultivo para espacios reducidos. Cosecha fresco cada semana sin necesitar jardín.
            </p>
          </div>

          <div>
            <span className="footer-col-title">Productos</span>
            <div className="footer-links">
              <a href="#catalogo">Kit Balcón Básico</a>
              <a href="#catalogo">Kit Microverde Rápido</a>
              <a href="#catalogo">Kit Aromáticas Compacto</a>
            </div>
          </div>

          <div>
            <span className="footer-col-title">Empresa</span>
            <div className="footer-links">
              <a href="#catalogo">Sobre nosotros</a>
              <a href="#faq">Preguntas frecuentes</a>
              <a href="#catalogo">Contacto</a>
            </div>
          </div>

          <div>
            <span className="footer-col-title">Legal</span>
            <div className="footer-links">
              <a href="#catalogo">Términos de servicio</a>
              <a href="#catalogo">Política de privacidad</a>
              <a href="#catalogo">Política de devoluciones</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 UrbanSprout. Todos los derechos reservados.</span>
          <span>React + Vite · Auth Clerk · Pagos Stripe</span>
        </div>
      </div>
    </footer>
  );
}
