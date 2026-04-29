import { useRef } from "react";
import gsap from "gsap";

export function useMagneticButton<T extends HTMLElement>(strength = 0.38) {
  const ref = useRef<T>(null);

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) * strength;
    const y = (e.clientY - top - height / 2) * strength;
    gsap.to(el, { x, y, duration: 0.3, ease: "power2.out" });
  }

  function onMouseLeave() {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
  }

  return { ref, onMouseMove, onMouseLeave };
}
