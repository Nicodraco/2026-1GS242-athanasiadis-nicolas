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
              <a href="#features">Sobre nosotros</a>
              <a href="#faq">Preguntas frecuentes</a>
              <a href="mailto:hola@urbansprout.com">Contacto</a>
            </div>
          </div>

          <div>
            <span className="footer-col-title">Legal</span>
            <div className="footer-links">
              <Link to="/terminos">Términos de servicio</Link>
              <Link to="/privacidad">Política de privacidad</Link>
              <Link to="/devoluciones">Política de devoluciones</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 UrbanSprout. Todos los derechos reservados.</span>
          <span className="footer-bottom-links">
            <Link to="/privacidad">Privacidad</Link>
            <span>·</span>
            <Link to="/terminos">Términos</Link>
            <span>·</span>
            <a href="mailto:hola@urbansprout.com">Contacto</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
