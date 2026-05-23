import { useState } from "react";
import { Plus } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "¿Necesito experiencia en jardinería?",
    a: "No. Cada kit incluye una guía paso a paso diseñada para personas que nunca han cultivado antes. El proceso es sencillo y todo lo que necesitas está incluido en la caja.",
  },
  {
    q: "¿Qué pasa si mis plantas no crecen?",
    a: "Ofrecemos soporte activo durante las primeras dos semanas y política de reemplazo si el kit presenta defectos de empaque o semillas defectuosas. Estamos contigo desde el día uno.",
  },
  {
    q: "¿Cuánta luz necesita mi espacio?",
    a: "Los kits están diseñados para 2 a 4 horas de luz natural indirecta. Si tu espacio tiene menos luz, también funcionan con luz artificial LED estándar de uso doméstico.",
  },
  {
    q: "¿Cuánto tiempo hasta la primera cosecha?",
    a: "Depende del kit: los microbrotes están listos en 7-10 días. El Kit Balcón y el de Aromáticas demoran entre 14 y 21 días para la primera cosecha completa.",
  },
  {
    q: "¿Hacen envíos internacionales?",
    a: "Por ahora operamos dentro del país con envío express en 48 horas hábiles. La expansión a Latinoamérica está planificada para el segundo semestre de 2026.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i);
  }

  return (
    <section id="faq" className="section faq-bg">
      <div className="container">
        <div className="section-header section-header-center">
          <span className="section-label">Preguntas frecuentes</span>
          <h2 className="section-title">Todo lo que necesitas saber.</h2>
          <p className="section-sub">
            Resolvemos las dudas más comunes antes de tu primer pedido.
          </p>
        </div>

        <ul className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <li key={i} className={`faq-item${openIndex === i ? " open" : ""}`}>
              <button className="faq-trigger" onClick={() => toggle(i)} type="button">
                <span>{item.q}</span>
                <span className="faq-icon">
                  <Plus size={14} strokeWidth={2.5} />
                </span>
              </button>
              <div className="faq-body">
                <div className="faq-body-inner">
                  <p className="faq-answer">{item.a}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
