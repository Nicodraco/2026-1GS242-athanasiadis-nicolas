export type Product = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  tag: string;
};

export const products: Product[] = [
  {
    id: "kit-balcon-basico",
    name: "Kit Balcón Básico",
    description: "Lechuga + cilantro + cebollín para espacios con 2-3 horas de luz.",
    priceUsd: 24.9,
    tag: "Inicio",
  },
  {
    id: "kit-microverde-rapido",
    name: "Kit Microverde Rápido",
    description: "Microbrotes listos en 7-10 días, ideal para cocina en apartamentos.",
    priceUsd: 29.9,
    tag: "Más vendido",
  },
  {
    id: "kit-aromaticas-compacto",
    name: "Kit Aromáticas Compacto",
    description: "Albahaca + menta + perejil con guía de poda y riego urbano.",
    priceUsd: 34.9,
    tag: "Premium",
  },
];

export const productsById = Object.fromEntries(products.map((p) => [p.id, p]));
