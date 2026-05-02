import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import {
  ShoppingCart, X, Minus, Plus, Trash2, ArrowRight,
  Loader2, Leaf, Shield, RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCart, type CartItem } from "@/lib/cart";
import { isClerkConfigured, getApiUrl } from "@/lib/env";

/* ── Constants ─────────────────────────────────────────────────── */
const FREE_SHIPPING_AT = 55; // USD — umbral para envío gratis

interface CartDrawerProps {
  userId?: string | null;
  userEmail?: string | null;
}

/* ── Cart Trigger (nav button) ──────────────────────────────────── */
export function CartTrigger() {
  const { count, toggleCart } = useCart();
  return (
    <button
      className="cart-trigger"
      onClick={toggleCart}
      aria-label={`Carrito${count > 0 ? ` — ${count} ${count === 1 ? "producto" : "productos"}` : " vacío"}`}
    >
      <ShoppingCart size={18} />
      {count > 0 && (
        <span className="cart-trigger-badge" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

/* ── Free Shipping Progress Bar ─────────────────────────────────── */
function ShippingBar({ total }: { total: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_AT - total);
  const pct = Math.min((total / FREE_SHIPPING_AT) * 100, 100);
  const done = total >= FREE_SHIPPING_AT;

  return (
    <div className={`cart-shipping-bar${done ? " cart-shipping-bar--done" : ""}`}>
      <div className="csb-track">
        <div
          className="csb-fill"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="csb-label">
        {done ? (
          <>🎉 <strong>¡Envío gratis desbloqueado!</strong></>
        ) : (
          <>
            <Leaf size={11} />
            Te faltan <strong>${remaining.toFixed(2)}</strong> para envío gratis
          </>
        )}
      </p>
    </div>
  );
}

/* ── Undo Toast ─────────────────────────────────────────────────── */
interface UndoToastProps {
  item: CartItem | null;
  onUndo: () => void;
  onDismiss: () => void;
}

function UndoToast({ item, onUndo, onDismiss }: UndoToastProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item || !barRef.current) return;
    gsap.fromTo(barRef.current, { scaleX: 1 }, { scaleX: 0, duration: 5, ease: "none", onComplete: onDismiss });
  }, [item, onDismiss]);

  if (!item) return null;

  return (
    <div className="cart-undo-toast" role="status">
      <span className="cut-toast-text">
        <Trash2 size={13} />
        <strong>{item.name}</strong> eliminado
      </span>
      <button className="cart-undo-btn" onClick={onUndo} aria-label="Deshacer eliminación">
        <RotateCcw size={13} />
        Deshacer
      </button>
      <div className="cart-undo-progress" ref={barRef} />
    </div>
  );
}

/* ── Single Cart Item Row ───────────────────────────────────────── */
interface CartItemRowProps {
  item: CartItem;
  onRemove: (item: CartItem) => void;
  onSetQty: (id: string, qty: number) => void;
}

function CartItemRow({ item, onRemove, onSetQty }: CartItemRowProps) {
  return (
    <div className="cart-item">
      <div className="cart-item-img-wrap">
        <img src={item.image} alt={item.name} className="cart-item-img" loading="lazy" />
      </div>

      <div className="cart-item-body">
        <div className="cart-item-top">
          <span className="cart-item-name">{item.name}</span>
          <span className="cart-item-unit-price">${item.priceUsd.toFixed(2)}</span>
        </div>

        <div className="cart-item-bottom">
          <div className="cart-qty-stepper" role="group" aria-label="Cantidad">
            <button
              className="cart-qty-btn"
              onClick={() => onSetQty(item.productId, item.quantity - 1)}
              aria-label="Reducir cantidad"
            >
              <Minus size={12} />
            </button>
            <span className="cart-qty-val" aria-live="polite">{item.quantity}</span>
            <button
              className="cart-qty-btn"
              onClick={() => onSetQty(item.productId, item.quantity + 1)}
              aria-label="Aumentar cantidad"
            >
              <Plus size={12} />
            </button>
          </div>

          <span className="cart-item-subtotal">
            ${(item.priceUsd * item.quantity).toFixed(2)}
          </span>

          <button
            className="cart-remove-btn"
            onClick={() => onRemove(item)}
            aria-label={`Eliminar ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ────────────────────────────────────────────────── */
function CartEmpty({ onClose }: { onClose: () => void }) {
  return (
    <div className="cart-empty">
      <div className="cart-empty-visual">
        <div className="cart-empty-icon-ring">
          <ShoppingCart size={28} strokeWidth={1.5} />
        </div>
        <div className="cart-empty-leaf1">🌱</div>
        <div className="cart-empty-leaf2">🌿</div>
      </div>
      <h3 className="cart-empty-title">Tu canasta está vacía</h3>
      <p className="cart-empty-sub">
        Elige un kit y empieza a cosechar en casa en menos de 3 semanas.
      </p>
      <a href="#catalogo" className="button-brutal-primary cart-empty-cta" onClick={onClose}>
        Ver kits <ArrowRight size={15} />
      </a>
    </div>
  );
}

/* ── Main Cart Drawer ───────────────────────────────────────────── */
export function CartDrawer({ userId, userEmail }: CartDrawerProps) {
  const { items, open, count, total, removeItem, restoreItem, setQty, clear, closeCart } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [undoItem, setUndoItem] = useState<CartItem | null>(null);

  /* ── GSAP drawer animation ── */
  useEffect(() => {
    const drawer = drawerRef.current;
    const overlay = overlayRef.current;
    if (!drawer || !overlay) return;

    const isMobile = window.innerWidth <= 768;

    if (open) {
      document.body.style.overflow = "hidden";
      gsap.set(overlay, { display: "block" });
      gsap.to(overlay, { opacity: 1, duration: 0.3, ease: "power2.out" });

      if (isMobile) {
        gsap.fromTo(drawer, { y: "100%" }, { y: "0%", duration: 0.5, ease: "power4.out" });
      } else {
        gsap.fromTo(drawer, { x: "100%" }, { x: "0%", duration: 0.45, ease: "power4.out" });
      }
    } else {
      document.body.style.overflow = "";
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.25,
        onComplete: () => gsap.set(overlay, { display: "none" }),
      });

      if (isMobile) {
        gsap.to(drawer, { y: "100%", duration: 0.4, ease: "power3.in" });
      } else {
        gsap.to(drawer, { x: "100%", duration: 0.4, ease: "power3.in" });
      }
    }

    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* ── Remove with undo ── */
  const handleRemove = useCallback(
    (item: CartItem) => {
      setUndoItem(item);
      removeItem(item.productId);
    },
    [removeItem],
  );

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    restoreItem(undoItem);
    setUndoItem(null);
  }, [undoItem, restoreItem]);

  const handleDismissUndo = useCallback(() => setUndoItem(null), []);

  /* ── Checkout ── */
  const handleCheckout = async () => {
    setCheckoutError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/cart-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          userId: userId ?? null,
          userEmail: userEmail ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar el carrito.");
      if (data.checkoutUrl) {
        clear();
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Error inesperado. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const showLoginGate = !userId && isClerkConfigured();

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        ref={overlayRef}
        className="cart-overlay"
        style={{ display: "none", opacity: 0 }}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <aside
        ref={drawerRef}
        className="cart-drawer"
        style={{ transform: window.innerWidth <= 768 ? "translateY(100%)" : "translateX(100%)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <ShoppingCart size={20} />
            <span className="cart-header-title">Tu pedido</span>
            {count > 0 && <span className="cart-header-count">{count}</span>}
          </div>
          <button className="cart-header-close" onClick={closeCart} aria-label="Cerrar carrito">
            <X size={20} />
          </button>
        </div>

        {/* Shipping progress */}
        {items.length > 0 && <ShippingBar total={total} />}

        {/* Content */}
        {items.length === 0 ? (
          <CartEmpty onClose={closeCart} />
        ) : (
          <>
            {/* Items list */}
            <div className="cart-items-list">
              {items.map((item) => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  onRemove={handleRemove}
                  onSetQty={setQty}
                />
              ))}
            </div>

            {/* Undo toast */}
            <UndoToast item={undoItem} onUndo={handleUndo} onDismiss={handleDismissUndo} />

            {/* Footer */}
            <div className="cart-footer">
              {/* Order summary */}
              <div className="cart-summary">
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)} USD</span>
                </div>
                <div className="cart-summary-row cart-summary-shipping">
                  <span>Envío</span>
                  <span className={total >= FREE_SHIPPING_AT ? "cart-free-tag" : ""}>
                    {total >= FREE_SHIPPING_AT ? "¡GRATIS!" : "Calculado al pagar"}
                  </span>
                </div>
                <div className="cart-summary-divider" />
                <div className="cart-summary-row cart-summary-total">
                  <span>Total</span>
                  <span className="cart-total-amount">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Error message */}
              {checkoutError && (
                <p className="cart-checkout-error" role="alert">{checkoutError}</p>
              )}

              {/* CTA */}
              {showLoginGate ? (
                <Link
                  to="/sign-in"
                  className="cart-checkout-btn button-brutal-primary"
                  onClick={closeCart}
                >
                  Iniciar sesión para pagar
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  className="cart-checkout-btn button-brutal-primary"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 size={16} className="spin" /> Redirigiendo a Stripe…</>
                  ) : (
                    <>Pagar ahora <ArrowRight size={16} /></>
                  )}
                </button>
              )}

              {/* Trust signals */}
              <div className="cart-trust">
                <span><Shield size={12} /> Pago 100% seguro</span>
                <span>·</span>
                <span>Garantía 2 semanas</span>
                <span>·</span>
                <span>Envío en 48 h</span>
              </div>

              {/* Clear cart */}
              {items.length > 1 && (
                <button className="cart-clear-link" onClick={clear}>
                  Vaciar carrito
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
