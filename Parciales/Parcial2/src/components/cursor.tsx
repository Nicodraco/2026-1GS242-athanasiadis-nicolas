import { useEffect, useRef } from "react";
import gsap from "gsap";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current!;
    const ring = ringRef.current!;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      gsap.to(dot, { x: mouseX, y: mouseY, duration: 0.08, ease: "power2.out" });
    };

    const ticker = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      gsap.set(ring, { x: ringX, y: ringY });
    };

    const onEnterLink = () => {
      gsap.to(ring, { scale: 2.2, duration: 0.3, ease: "power2.out" });
      gsap.to(dot, { scale: 0, duration: 0.2 });
    };

    const onLeaveLink = () => {
      gsap.to(ring, { scale: 1, duration: 0.4, ease: "elastic.out(1,0.5)" });
      gsap.to(dot, { scale: 1, duration: 0.3, ease: "elastic.out(1,0.5)" });
    };

    const onEnterButton = () => {
      gsap.to(ring, { scale: 0, duration: 0.2 });
      gsap.to(dot, { scale: 3, duration: 0.3, ease: "power2.out" });
    };

    window.addEventListener("mousemove", onMove);
    gsap.ticker.add(ticker);

    const links = document.querySelectorAll("a, [data-cursor-link]");
    const buttons = document.querySelectorAll("button, [data-cursor-btn]");

    links.forEach((el) => {
      el.addEventListener("mouseenter", onEnterLink);
      el.addEventListener("mouseleave", onLeaveLink);
    });
    buttons.forEach((el) => {
      el.addEventListener("mouseenter", onEnterButton);
      el.addEventListener("mouseleave", onLeaveLink);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      gsap.ticker.remove(ticker);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
