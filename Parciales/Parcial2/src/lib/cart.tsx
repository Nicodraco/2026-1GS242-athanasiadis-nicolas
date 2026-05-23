import { createContext, useContext, useEffect, useReducer } from "react";
import { products } from "@/lib/catalog";

export type CartItem = {
  productId: string;
  name: string;
  priceUsd: number;
  quantity: number;
  image: string;
};

type State = { items: CartItem[]; open: boolean };
type Action =
  | { type: "ADD"; productId: string }
  | { type: "REMOVE"; productId: string }
  | { type: "RESTORE"; item: CartItem }
  | { type: "SET_QTY"; productId: string; qty: number }
  | { type: "CLEAR" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "TOGGLE" };

const IMAGES: Record<string, string> = {
  "kit-balcon-basico":
    "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=200&q=80&auto=format&fit=crop",
  "kit-microverde-rapido":
    "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&q=80&auto=format&fit=crop",
  "kit-aromaticas-compacto":
    "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=200&q=80&auto=format&fit=crop",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD": {
      const product = products.find((p) => p.id === action.productId);
      if (!product) return state;
      const existing = state.items.find((i) => i.productId === action.productId);
      const items = existing
        ? state.items.map((i) =>
            i.productId === action.productId ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [
            ...state.items,
            {
              productId: product.id,
              name: product.name,
              priceUsd: product.priceUsd,
              quantity: 1,
              image: IMAGES[product.id] ?? "",
            },
          ];
      return { ...state, items, open: true };
    }
    case "REMOVE":
      return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
    case "RESTORE": {
      // Re-insert a previously removed item (used by undo)
      const exists = state.items.find((i) => i.productId === action.item.productId);
      if (exists) return state;
      return { ...state, items: [...state.items, action.item] };
    }
    case "SET_QTY": {
      if (action.qty <= 0) {
        return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, quantity: action.qty } : i,
        ),
      };
    }
    case "CLEAR":
      return { ...state, items: [] };
    case "OPEN":
      return { ...state, open: true };
    case "CLOSE":
      return { ...state, open: false };
    case "TOGGLE":
      return { ...state, open: !state.open };
    default:
      return state;
  }
}

const STORAGE_KEY = "urbansprout-cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

type CartContextType = {
  items: CartItem[];
  open: boolean;
  count: number;
  total: number;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  restoreItem: (item: CartItem) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartCtx = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: loadCart(), open: false });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const count = state.items.reduce((s, i) => s + i.quantity, 0);
  const total = state.items.reduce((s, i) => s + i.priceUsd * i.quantity, 0);

  return (
    <CartCtx.Provider
      value={{
        items: state.items,
        open: state.open,
        count,
        total,
        addItem: (id) => dispatch({ type: "ADD", productId: id }),
        removeItem: (id) => dispatch({ type: "REMOVE", productId: id }),
        restoreItem: (item) => dispatch({ type: "RESTORE", item }),
        setQty: (id, qty) => dispatch({ type: "SET_QTY", productId: id, qty }),
        clear: () => dispatch({ type: "CLEAR" }),
        openCart: () => dispatch({ type: "OPEN" }),
        closeCart: () => dispatch({ type: "CLOSE" }),
        toggleCart: () => dispatch({ type: "TOGGLE" }),
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
