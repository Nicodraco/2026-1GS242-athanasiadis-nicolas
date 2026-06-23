from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
import os

GREEN = HexColor("#2d6a4f")
LIGHT_GREEN = HexColor("#d8f3dc")
DARK = HexColor("#1b1b1b")
GRAY = HexColor("#555555")
WHITE = colors.white

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "UrbanSprout-HistoriasUsuario.pdf")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    "CoverTitle", fontName="Helvetica-Bold", fontSize=26,
    textColor=GREEN, alignment=TA_CENTER, spaceAfter=6*mm
))
styles.add(ParagraphStyle(
    "CoverSub", fontName="Helvetica", fontSize=13,
    textColor=DARK, alignment=TA_CENTER, spaceAfter=4*mm
))
styles.add(ParagraphStyle(
    "SectionTitle", fontName="Helvetica-Bold", fontSize=16,
    textColor=GREEN, spaceBefore=10*mm, spaceAfter=4*mm,
    borderPadding=(0, 0, 2, 0), borderWidth=0.5, borderColor=GREEN
))
styles.add(ParagraphStyle(
    "StoryRef", fontName="Helvetica-Bold", fontSize=10,
    textColor=GREEN, spaceBefore=4*mm, spaceAfter=1*mm
))
styles.add(ParagraphStyle(
    "StoryText", fontName="Helvetica", fontSize=9.5,
    textColor=DARK, alignment=TA_JUSTIFY,
    leading=13, spaceAfter=1*mm, leftIndent=8*mm
))
styles.add(ParagraphStyle(
    "AcTitle", fontName="Helvetica-Bold", fontSize=9,
    textColor=GRAY, spaceBefore=1*mm, leftIndent=12*mm
))
styles.add(ParagraphStyle(
    "AcItem", fontName="Helvetica", fontSize=9,
    textColor=DARK, leading=12, leftIndent=16*mm, spaceAfter=0.5*mm
))
styles.add(ParagraphStyle(
    "MCPBox", fontName="Helvetica", fontSize=8.5,
    textColor=HexColor("#1a5276"), leading=11,
    leftIndent=12*mm, spaceAfter=2*mm
))
styles.add(ParagraphStyle(
    "FooterNote", fontName="Helvetica-Oblique", fontSize=8,
    textColor=GRAY, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    "SmallText", fontName="Helvetica", fontSize=8.5,
    textColor=GRAY, leading=10
))

def story(stories, ac_index, section_label):
    """Build a list of flowables for one user story."""
    elements = []
    counter = 1
    for s in stories:
        ref = s["id"]
        is_mcp = "[MCP]" in ref
        story_line = s["text"]
        if is_mcp:
            story_line = f'<font color="#1a5276"><b>[MCP]</b></font> {story_line}'

        elements.append(Paragraph(
            f'<b>{ref}</b> — {story_line}',
            styles["StoryRef"] if not is_mcp else styles["StoryRef"]
        ))
        elements.append(Spacer(1, 1*mm))

        for ac in s["ac"]:
            elements.append(Paragraph(
                f'&bull; CA-{ac_index}: {ac}',
                styles["AcItem"]
            ))
            ac_index += 1

        if is_mcp:
            mcp = s.get("mcp", {})
            elements.append(Paragraph(
                f'<b>Tool:</b> {mcp.get("tool", "")} &nbsp;|&nbsp; '
                f'<b>Auth:</b> {mcp.get("auth", "")} &nbsp;|&nbsp; '
                f'<b>Agente:</b> {mcp.get("agent", "")}',
                styles["MCPBox"]
            ))

        elements.append(Spacer(1, 2*mm))
        counter += 1

    return elements, ac_index


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=15*mm, bottomMargin=15*mm
    )

    story_width = A4[0] - 40*mm
    elements = []
    ac_index = 1

    # ── PORTADA ──
    elements.append(Spacer(1, 50*mm))
    elements.append(Paragraph("UrbanSprout", styles["CoverTitle"]))
    elements.append(Paragraph("Historias de Usuario — MVP + Production-Ready", styles["CoverSub"]))
    elements.append(Spacer(1, 8*mm))
    elements.append(Paragraph(
        "E-commerce B2C · Kits de cultivo urbano · Stripe · Clerk · Bun + SQLite",
        styles["CoverSub"]
    ))
    elements.append(Spacer(1, 15*mm))
    elements.append(Paragraph(
        "Grupo: [Completar nombre del grupo]  &nbsp;|&nbsp;  Parcial #2 — 2026",
        styles["CoverSub"]
    ))
    elements.append(Spacer(1, 5*mm))
    elements.append(Paragraph(
        "Asignatura: Desarrollo de Software IX · 1GS242",
        styles["SmallText"]
    ))
    elements.append(PageBreak())

    # ── TABLA DE CONTENIDO ──
    elements.append(Paragraph("Contenido", styles["SectionTitle"]))
    toc_items = [
        "1. Inventario MVP — Funcionalidades implementadas (HU-001 a HU-024)",
        "2. Production-Ready — Funcionalidades faltantes (HU-025 a HU-068)",
        "   [MCP] Historias expuestas vía Model Context Protocol",
        "3. Anexo: Resumen de herramientas MCP"
    ]
    for item in toc_items:
        elements.append(Paragraph(item, styles["StoryText"]))
    elements.append(PageBreak())

    # ================================================================
    # SECCION 1: INVENTARIO MVP (IMPLEMENTADO)
    # ================================================================
    elements.append(Paragraph("1. Inventario MVP — Funcionalidades Implementadas", styles["SectionTitle"]))
    elements.append(Spacer(1, 3*mm))

    mvp_stories = [
        # ── Auth ──
        {
            "id": "HU-001",
            "text": "Como visitante, quiero registrarme e iniciar sesión con Clerk (Google, Microsoft, OTP), para acceder a mi dashboard y comprar.",
            "ac": [
                "El formulario de registro y login se integra con Clerk y ofrece al menos 2 proveedores sociales.",
                "Al autenticarse, el usuario es redirigido al dashboard con su sesión activa.",
                "El token de Clerk se valida en cada solicitud a rutas protegidas."
            ]
        },
        {
            "id": "HU-002",
            "text": "Como usuario autenticado, quiero gestionar mi perfil desde un panel de usuario embebido de Clerk, para mantener mis datos actualizados.",
            "ac": [
                "El perfil permite editar nombre, email, foto y métodos de autenticación.",
                "Los cambios persisten en Clerk y se reflejan al volver al dashboard."
            ]
        },
        {
            "id": "HU-003",
            "text": "Como administrador, quiero ser identificado por rol mediante publicMetadata de Clerk o lista blanca de emails, para acceder al panel de administración.",
            "ac": [
                "El rol se determina por clerk.publicMetadata.role === 'admin' o por email en ADMIN_EMAILS.",
                "El dashboard del admin muestra un enlace al backoffice.",
                "El backoffice rechaza acceso si el usuario no tiene rol admin."
            ]
        },
        # ── Landing / Catálogo ──
        {
            "id": "HU-004",
            "text": "Como visitante, quiero ver una landing page con hero, propuesta de valor, estadísticas y CTA, para entender qué ofrece UrbanSprout.",
            "ac": [
                "La landing incluye hero con CTA principal, sección de estadísticas animadas y marquee promocional.",
                "Las animaciones (GSAP + Lenis) se ejecutan sin errores en Chrome y Firefox."
            ]
        },
        {
            "id": "HU-005",
            "text": "Como visitante, quiero navegar el catálogo de productos con animaciones 3D (VanillaTilt), para conocer los kits disponibles.",
            "ac": [
                "El catálogo muestra 3 productos con imagen, nombre, precio y etiqueta (Inicio / Más vendido / Premium).",
                "Cada tarjeta responde con efecto tilt 3D al pasar el mouse."
            ]
        },
        {
            "id": "HU-006",
            "text": "Como visitante, quiero ver la página de detalle de cada producto (especificaciones, contenido, instrucciones), para decidir mi compra.",
            "ac": [
                "La ruta /producto/:id muestra breadcrumb, especificaciones, lista de incluidos, pasos, testimonial y productos relacionados.",
                "El botón 'Agregar al carrito' agrega el producto al carrito contextual."
            ]
        },
        # ── Carrito ──
        {
            "id": "HU-007",
            "text": "Como cliente, quiero agregar múltiples productos a un carrito de compras persistente, para comprar varios kits en una sola transacción.",
            "ac": [
                "El carrito se persiste en localStorage y sobrevive a recargas de página.",
                "Se puede incrementar, decrementar y eliminar items individualmente.",
                "El badge del carrito refleja la cantidad total de productos."
            ]
        },
        {
            "id": "HU-008",
            "text": "Como cliente, quiero ver un resumen del carrito con barra de envío gratis y opción de deshacer eliminaciones, para gestionar mi compra visualmente.",
            "ac": [
                "El carrito lateral (drawer) se abre con animación GSAP desde la derecha.",
                "Muestra subtotal, barra de progreso para envío gratis (> $55 USD) y botón de pago.",
                "Al eliminar un producto aparece un toast 'Deshacer' por 5 segundos."
            ]
        },
        # ── Checkout / Pagos ──
        {
            "id": "HU-009",
            "text": "Como cliente, quiero pagar con Stripe Checkout (unitario o multi-item), para completar mi compra de forma segura.",
            "ac": [
                "El botón de pago crea una Stripe Checkout Session vía POST /api/checkout o /api/cart-checkout.",
                "Stripe Checkout redirige al usuario a la página de éxito o cancelación.",
                "El checkout rechaza si Stripe no está configurado, el producto no existe o el producto está inactivo."
            ]
        },
        {
            "id": "HU-010",
            "text": "Como cliente, quiero ver una página de éxito con confetti y pasos de progreso al completar el pago, para confirmar que la transacción fue exitosa.",
            "ac": [
                "La página /checkout/success muestra animación de confetti, resumen y pasos siguientes.",
                "El parámetro ?session_id se valida y muestra datos coherentes."
            ]
        },
        {
            "id": "HU-011",
            "text": "Como cliente, quiero ver una página informativa si cancelo el pago, para entender qué ocurrió y poder reintentar.",
            "ac": [
                "La página /checkout/cancelled lista razones comunes de cancelación.",
                "Incluye botón para volver al catálogo o reintentar la compra."
            ]
        },
        # ── Dashboard / Órdenes ──
        {
            "id": "HU-012",
            "text": "Como cliente, quiero ver el historial de mis órdenes en el dashboard con su estado actual y monto, para dar seguimiento a mis compras.",
            "ac": [
                "El dashboard lista órdenes del usuario con ID, producto, monto, estado y fecha.",
                "Cada orden muestra un badge de color según su estado (pending/paid/cancelled).",
                "Las órdenes pendientes se sincronizan con Stripe automáticamente."
            ]
        },
        # ── Admin Backoffice ──
        {
            "id": "HU-013",
            "text": "Como administrador, quiero listar y gestionar órdenes desde un panel backoffice independiente, para administrar los pedidos.",
            "ac": [
                "El backoffice (app React independiente, puerto 5173) lista todas las órdenes con ID, producto, cliente, monto, estado y fecha.",
                "Se puede cambiar el estado de cada orden mediante un dropdown."
            ]
        },
        {
            "id": "HU-014",
            "text": "Como administrador, quiero cambiar el estado operativo de las órdenes (pending/paid/cancelled), para reflejar el progreso de cada pedido.",
            "ac": [
                "El cambio de estado se persiste vía PATCH /orders/:id.",
                "El nuevo estado se refleja inmediatamente en la UI del backoffice."
            ]
        },
        {
            "id": "HU-015",
            "text": "Como administrador, quiero gestionar el inventario (stock y stock mínimo por SKU), para mantener la disponibilidad de productos.",
            "ac": [
                "La tabla de inventario muestra SKU, stock actual, stock mínimo y alerta visual si stock < mínimo.",
                "Los valores se actualizan vía PATCH /inventory/:sku."
            ]
        },
        {
            "id": "HU-016",
            "text": "Como administrador, quiero crear, editar, desactivar y eliminar productos, para mantener actualizado el catálogo.",
            "ac": [
                "El formulario de producto permite name, description, price_usd, tag e is_active.",
                "Eliminar un producto con órdenes asociadas es bloqueado (se sugiere desactivar)."
            ]
        },
        # ── API / Webhooks ──
        {
            "id": "HU-017",
            "text": "Como sistema, quiero recibir webhooks de Stripe con validación de firma para registrar órdenes automáticamente al confirmarse un pago.",
            "ac": [
                "El endpoint POST /webhooks/stripe valida la firma HTTP con stripe-webhook-secret.",
                "Al recibir checkout.session.completed, crea un registro en orders y actualiza checkout_attempts.",
                "Los eventos duplicados se ignoran mediante deduplicación por event.id."
            ]
        },
        {
            "id": "HU-018",
            "text": "Como desarrollador, quiero consultar un endpoint de health check, para verificar que el API está operativa.",
            "ac": [
                "GET /health retorna status 200 con JSON { status: 'ok', db: 'path', uptime: '...' }.",
                "El health check funciona sin autenticación."
            ]
        },
        # ── Infraestructura ──
        {
            "id": "HU-019",
            "text": "Como desarrollador, quiero ejecutar el stack completo con Docker Compose (storefront + backoffice + API + SQLite), para simplificar el entorno.",
            "ac": [
                "docker compose up levanta los 3 servicios y expone storefront en :3000, backoffice en :5173, API en :4000.",
                "Los datos persisten en un volumen de SQLite."
            ]
        },
        {
            "id": "HU-020",
            "text": "Como desarrollador, quiero tener tests E2E con Playwright para rutas críticas, para validar el funcionamiento general.",
            "ac": [
                "Los tests cubren home, sign-in, sign-up, dashboard, admin y API de checkout.",
                "Los tests se ejecutan con npm run test:e2e sin intervención manual."
            ]
        },
        # ── UI/UX ──
        {
            "id": "HU-021",
            "text": "Como visitante, quiero experimentar animaciones suaves (GSAP, Lenis, cursor personalizado), para tener una navegación agradable.",
            "ac": [
                "El hero tiene animación de entrada con GSAP (títulos, labels flotantes, parallax).",
                "El scroll suave con Lenis está activo en toda la página.",
                "El cursor personalizado (dot + ring) aparece en toda la aplicación."
            ]
        },
        {
            "id": "HU-022",
            "text": "Como visitante, quiero consultar las preguntas frecuentes en formato acordeón, para resolver dudas comunes.",
            "ac": [
                "La sección FAQ contiene 5 preguntas expandibles con animación.",
                "Al hacer clic en una pregunta, se expande/colapsa su respuesta."
            ]
        },
        {
            "id": "HU-023",
            "text": "Como visitante, quiero leer testimonios de otros clientes y ver estadísticas, para generar confianza en la compra.",
            "ac": [
                "La sección de social proof muestra 3 testimonios con estrellas y nombre.",
                "La sección de estadísticas muestra 4 contadores animados (clientes, semanas, satisfacción, envío)."
            ]
        },
        {
            "id": "HU-024",
            "text": "Como visitante, quiero acceder a las páginas legales (términos, privacidad, devoluciones), para conocer las políticas del sitio.",
            "ac": [
                "Las rutas /terminos, /privacidad y /devoluciones muestran contenido legal completo.",
                "Los enlaces están disponibles en el footer del sitio."
            ]
        }
    ]

    se, ac_index = story(mvp_stories, ac_index, "MVP")
    elements.extend(se)

    # ================================================================
    # SECCION 2: PRODUCTION-READY (FALTANTE)
    # ================================================================
    elements.append(PageBreak())
    elements.append(Paragraph("2. Production-Ready — Funcionalidades Faltantes", styles["SectionTitle"]))
    elements.append(Paragraph(
        "A continuación se listan las historias de usuario necesarias para considerar UrbanSprout "
        "como production-ready. Las historias marcadas con <font color='#1a5276'><b>[MCP]</b></font> "
        "se exponen a través de un servidor MCP (Model Context Protocol) bajo autenticación, "
        "importables desde Claude Code o Codex.",
        styles["StoryText"]
    ))
    elements.append(Spacer(1, 3*mm))

    prod_stories = [
        # ── Seguridad y Autorización ──
        {
            "id": "HU-025 [MCP]",
            "text": "Como administrador, quiero que los endpoints del API verifiquen roles y permisos mediante middleware de autorización, para garantizar que solo usuarios autorizados accedan a operaciones sensibles.",
            "ac": [
                "Cada endpoint protegido rechaza con 403 si el rol no tiene el permiso requerido.",
                "El middleware usa el token JWT de Clerk para extraer roles y permisos.",
                "La matriz de permisos es configurable desde variables de entorno o base de datos."
            ],
            "mcp": {
                "tool": "authorize_user",
                "auth": "Clerk JWT (Bearer token)",
                "agent": "Validar si un usuario tiene el permiso necesario para ejecutar una acción antes de proceder."
            }
        },
        {
            "id": "HU-026 [MCP]",
            "text": "Como administrador, quiero configurar rate limiting por endpoint y por usuario, para proteger el API contra abusos y ataques de fuerza bruta.",
            "ac": [
                "Los límites se definen por ruta (ej. 100 req/min para GET /products, 10 req/min para POST /checkout).",
                "Al exceder el límite, el API responde con 429 Too Many Requests y header Retry-After.",
                "Las configuraciones de rate limit son ajustables sin reiniciar el servidor."
            ],
            "mcp": {
                "tool": "configure_rate_limit",
                "auth": "Admin JWT",
                "agent": "Consultar y modificar los límites de tasa por ruta o por usuario."
            }
        },
        {
            "id": "HU-027 [MCP]",
            "text": "Como administrador, quiero gestionar API keys para integraciones externas, para controlar el acceso programático al sistema.",
            "ac": [
                "Se pueden crear, listar, rotar y revocar API keys desde el panel admin.",
                "Cada API key tiene un nombre descriptivo, fecha de expiración y permisos asociados.",
                "Las solicitudes con API key se registran en el log de auditoría."
            ],
            "mcp": {
                "tool": "manage_api_keys",
                "auth": "Admin JWT",
                "agent": "Crear, revocar o listar API keys del sistema."
            }
        },
        {
            "id": "HU-028",
            "text": "Como desarrollador, quiero que todas las entradas de usuario estén sanitizadas contra XSS e inyección, para prevenir vulnerabilidades de seguridad.",
            "ac": [
                "Todo input de texto se sanitiza antes de almacenarse en la base de datos.",
                "Los parámetros de URL y body se validan con esquemas estrictos.",
                "No se renderiza HTML sin escapar en el frontend."
            ]
        },
        {
            "id": "HU-029 [MCP]",
            "text": "Como administrador, quiero consultar el log de auditoría de todas las operaciones administrativas, para mantener trazabilidad de acciones sensibles.",
            "ac": [
                "Se registran con timestamp, usuario, acción, recurso y detalles cada operación CRUD en backoffice.",
                "Los logs son consultables por filtros de fecha, usuario y tipo de acción.",
                "Los logs de auditoría son inmutables (append-only)."
            ],
            "mcp": {
                "tool": "query_audit_logs",
                "auth": "Admin JWT",
                "agent": "Buscar y filtrar eventos de auditoría por fecha, usuario, recurso o tipo de acción."
            }
        },
        # ── Pagos y Webhooks ──
        {
            "id": "HU-030 [MCP]",
            "text": "Como administrador, quiero procesar reembolsos automáticos desde el panel backoffice, para gestionar devoluciones sin salir de la plataforma.",
            "ac": [
                "El admin selecciona una orden pagada e inicia un reembolso parcial o total.",
                "El sistema llama a la API de Stripe para ejecutar el reembolso.",
                "La orden se actualiza a 'refunded' y se registra el evento en auditoría."
            ],
            "mcp": {
                "tool": "process_refund",
                "auth": "Admin JWT + Stripe API key",
                "agent": "Iniciar un reembolso para una orden especificando monto y motivo."
            }
        },
        {
            "id": "HU-031 [MCP]",
            "text": "Como administrador, quiero sincronizar el estado de las órdenes con Stripe automáticamente, para mantener consistencia entre plataformas.",
            "ac": [
                "Un job programado consulta el estado de sesiones de Stripe abiertas y actualiza órdenes locales.",
                "Las discrepancias se registran en un log para revisión manual.",
                "La sincronización se puede disparar manualmente desde el backoffice."
            ],
            "mcp": {
                "tool": "sync_orders_stripe",
                "auth": "Admin JWT",
                "agent": "Sincronizar el estado de órdenes locales con Stripe y reportar discrepancias."
            }
        },
        {
            "id": "HU-032 [MCP]",
            "text": "Como cliente, quiero guardar métodos de pago en mi cuenta (SetupIntents de Stripe), para agilizar compras futuras.",
            "ac": [
                "El dashboard del cliente muestra opción 'Guardar tarjeta' que crea un SetupIntent.",
                "Los métodos guardados se muestran como opción en el checkout.",
                "Stripe PaymentMethod se asocia al customer_id de Clerk."
            ],
            "mcp": {
                "tool": "manage_payment_methods",
                "auth": "User JWT",
                "agent": "Listar, agregar o eliminar métodos de pago guardados del cliente."
            }
        },
        {
            "id": "HU-033",
            "text": "Como cliente, quiero descargar facturas de mis compras en formato PDF, para tener comprobantes fiscales.",
            "ac": [
                "Cada orden pagada tiene un botón 'Descargar factura' en el dashboard.",
                "La factura incluye datos del cliente, productos, montos, impuestos y fecha.",
                "El PDF se genera del lado del servidor con un template estandarizado."
            ]
        },
        # ── Observabilidad ──
        {
            "id": "HU-034 [MCP]",
            "text": "Como administrador, quiero centralizar los logs de la aplicación con niveles estructurados, para diagnosticar problemas en producción.",
            "ac": [
                "Los logs del API, storefront y backoffice se envían a un destino centralizado (archivo o servicio externo).",
                "Cada entrada tiene nivel (info/warn/error), timestamp, servicio y mensaje estructurado.",
                "Los logs son consultables por servicio, nivel y rango de fechas."
            ],
            "mcp": {
                "tool": "query_logs",
                "auth": "Admin JWT",
                "agent": "Consultar logs del sistema filtrando por servicio, nivel de severidad y rango de tiempo."
            }
        },
        {
            "id": "HU-035 [MCP]",
            "text": "Como administrador, quiero ver un dashboard de métricas de rendimiento (tiempo de respuesta, tasa de error, uptime), para monitorear la salud del sistema.",
            "ac": [
                "El dashboard muestra gráficos de latencia promedio (P50, P95, P99) por endpoint.",
                "Muestra tasa de error 4xx/5xx en tiempo real.",
                "El uptime del API se muestra con indicador verde/rojo."
            ],
            "mcp": {
                "tool": "get_performance_metrics",
                "auth": "Admin JWT",
                "agent": "Consultar métricas de rendimiento agregadas del API."
            }
        },
        {
            "id": "HU-036 [MCP]",
            "text": "Como administrador, quiero ver un dashboard de métricas de negocio (revenue, conversión, ticket promedio), para tomar decisiones comerciales.",
            "ac": [
                "El dashboard muestra revenue total y por período, tasa de conversión checkout→pago, y AOV.",
                "Los datos son exportables a CSV.",
                "Las métricas se actualizan en cuasi-real time con datos de webhooks."
            ],
            "mcp": {
                "tool": "get_business_metrics",
                "auth": "Admin JWT",
                "agent": "Consultar KPIs de negocio: revenue, conversión, AOV, órdenes por período."
            }
        },
        {
            "id": "HU-037 [MCP]",
            "text": "Como desarrollador, quiero tener error tracking con contexto (usuario, acción, stack trace), para corregir errores en producción rápidamente.",
            "ac": [
                "Los errores no manejados se capturan y envían a un servicio de error tracking (Sentry o similar).",
                "Cada error incluye contexto: usuario autenticado, ruta, payload, stack trace.",
                "Los errores se agrupan por fingerprint y se puede marcar como resueltos."
            ],
            "mcp": {
                "tool": "get_error_feed",
                "auth": "Developer API key",
                "agent": "Listar errores recientes con agrupación, stack trace y contexto."
            }
        },
        # ── Manejo de Errores ──
        {
            "id": "HU-038",
            "text": "Como usuario, quiero ver un Error Boundary amigable cuando un componente React falle, para no perder la navegación.",
            "ac": [
                "Cada sección principal (home, productos, dashboard) tiene su propio Error Boundary.",
                "El boundary muestra un mensaje claro y un botón 'Reintentar'.",
                "El error se registra en consola y en el servicio de error tracking."
            ]
        },
        {
            "id": "HU-039",
            "text": "Como usuario, quiero páginas de error personalizadas (404, 500, red) con acciones sugeridas, para saber qué hacer cuando algo sale mal.",
            "ac": [
                "La página 404 muestra 'Página no encontrada' con enlace al inicio.",
                "La página 500 muestra 'Error interno' con instrucciones y opción de reintentar.",
                "Los errores de red muestran un mensaje de 'Sin conexión' y reintento automático."
            ]
        },
        {
            "id": "HU-040",
            "text": "Como desarrollador, quiero un formato de respuesta de error estandarizado en todo el API, para facilitar la integración con clientes.",
            "ac": [
                "Toda respuesta de error sigue el schema: { error: { code, message, details } }.",
                "Los códigos de error son consistentes (INVALID_INPUT, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, RATE_LIMITED).",
                "El campo details incluye información útil para depuración cuando es seguro."
            ]
        },
        {
            "id": "HU-041",
            "text": "Como cliente, quiero validación en tiempo real en todos los formularios (registro, checkout, perfil), para corregir datos antes de enviar.",
            "ac": [
                "Los campos obligatorios muestran error inline al perder el foco si están vacíos.",
                "El email y datos de pago se validan con formato antes del submit.",
                "El botón de submit se deshabilita si hay errores de validación."
            ]
        },
        # ── Pruebas ──
        {
            "id": "HU-042 [MCP]",
            "text": "Como desarrollador, quiero tests unitarios automatizados para la lógica de negocio del API, para garantizar corrección al refactorizar.",
            "ac": [
                "Las funciones de cálculo de precios, validación de productos y reglas de inventario tienen cobertura ≥ 80%.",
                "Los tests se ejecutan en el pipeline de CI.",
                "Cada test es independiente y no requiere base de datos real (mocks/stubs)."
            ],
            "mcp": {
                "tool": "run_unit_tests",
                "auth": "CI API key",
                "agent": "Ejecutar la suite de tests unitarios y devolver resultados (passed/failed/coverage)."
            }
        },
        {
            "id": "HU-043 [MCP]",
            "text": "Como desarrollador, quiero tests de integración para todos los endpoints del API, para validar el comportamiento completo del sistema.",
            "ac": [
                "Cada endpoint tiene al menos un test de caso feliz y uno de caso error.",
                "Los tests de integración usan una base de datos SQLite de prueba separada.",
                "Se prueban especialmente los flujos de checkout, webhooks y roles."
            ],
            "mcp": {
                "tool": "run_integration_tests",
                "auth": "CI API key",
                "agent": "Ejecutar tests de integración contra entorno de staging/CI y reportar resultados."
            }
        },
        {
            "id": "HU-044",
            "text": "Como desarrollador, quiero tests de componentes para componentes React críticos, para prevenir regresiones visuales y funcionales.",
            "ac": [
                "Componentes como CartDrawer, ProductCard y CheckoutButton tienen tests con React Testing Library.",
                "Los tests cubren renderizado, interacciones del usuario y estados vacío/error.",
                "Se integran en el pipeline de CI."
            ]
        },
        {
            "id": "HU-045",
            "text": "Como desarrollador, quiero tests de accesibilidad automatizados en el pipeline, para garantizar que el sitio sea inclusivo.",
            "ac": [
                "Se ejecuta aXe o Lighthouse CI en las rutas principales.",
                "No se permiten regresiones en los scores de accesibilidad.",
                "Los issues se reportan como warnings en el PR."
            ]
        },
        # ── CI/CD ──
        {
            "id": "HU-046 [MCP]",
            "text": "Como desarrollador, quiero un pipeline de CI (GitHub Actions) que ejecute lint, typecheck y tests, para detectar errores antes del merge.",
            "ac": [
                "El pipeline se dispara en cada push y pull request a main.",
                "Ejecuta eslint, tsc --noEmit, tests unitarios y tests de integración.",
                "El pipeline falla si algún paso da error y bloquea el merge."
            ],
            "mcp": {
                "tool": "trigger_ci_pipeline",
                "auth": "GitHub webhook secret / CI token",
                "agent": "Disparar el pipeline CI y monitorear su resultado hasta completar."
            }
        },
        {
            "id": "HU-047 [MCP]",
            "text": "Como desarrollador, quiero un pipeline de CD automatizado que despliegue a staging/producción tras pasar los tests, para liberar cambios continuamente.",
            "ac": [
                "Tras merge a main con CI exitoso, se despliega automáticamente a staging.",
                "El despliegue a producción requiere aprobación manual.",
                "Cada despliegue genera un tag de versión y changelog automático."
            ],
            "mcp": {
                "tool": "trigger_deployment",
                "auth": "CI token + aprobación manual",
                "agent": "Disparar despliegue a un entorno específico (staging/production) y monitorear el progreso."
            }
        },
        {
            "id": "HU-048",
            "text": "Como administrador, quiero migraciones de base de datos versionadas, para evolucionar el esquema sin pérdida de datos.",
            "ac": [
                "Las migraciones son archivos SQL secuenciales con timestamp.",
                "Se ejecutan automáticamente al iniciar el API si hay migraciones pendientes.",
                "Los rollbacks están documentados y disponibles."
            ]
        },
        {
            "id": "HU-049",
            "text": "Como desarrollador, quiero configuración por entorno (dev/staging/prod) con validación de variables, para evitar errores de configuración en despliegue.",
            "ac": [
                "Las variables requeridas se validan al iniciar la aplicación.",
                "Hay archivos .env.example documentados para cada entorno.",
                "Los secrets se inyectan desde el orquestador/CI, no desde el código."
            ]
        },
        # ── Roles y Permisos ──
        {
            "id": "HU-050 [MCP]",
            "text": "Como administrador, quiero un sistema de permisos granular (RBAC) con matriz de roles y acciones, para controlar qué puede hacer cada tipo de usuario.",
            "ac": [
                "Los roles disponibles incluyen: superadmin, admin, support, client.",
                "Cada rol tiene permisos específicos (ej. support puede ver órdenes pero no editar productos).",
                "La matriz de permisos es consultable desde la UI del backoffice."
            ],
            "mcp": {
                "tool": "get_role_permissions",
                "auth": "Admin JWT",
                "agent": "Consultar la matriz de permisos de un rol o usuario específico."
            }
        },
        {
            "id": "HU-051 [MCP]",
            "text": "Como administrador, quiero invitar, suspender y cambiar roles de usuarios desde el panel, para gestionar el equipo administrativo.",
            "ac": [
                "El admin puede buscar usuarios por nombre/email y ver su rol actual.",
                "Puede cambiar el rol de un usuario (ej. support → admin) con confirmación.",
                "Puede suspender usuarios, lo que bloquea su acceso inmediatamente."
            ],
            "mcp": {
                "tool": "manage_users",
                "auth": "Admin JWT",
                "agent": "Buscar, invitar, cambiar rol o suspender usuarios del sistema."
            }
        },
        {
            "id": "HU-052",
            "text": "Como cliente, quiero que mis datos estén aislados de otros clientes, para garantizar la privacidad de mi información.",
            "ac": [
                "Cada query de órdenes filtra por buyer_id del token autenticado.",
                "Los datos de perfil no son accesibles por otros usuarios ni en listados públicos.",
                "Se verifica en tests de integración que un usuario no vea datos de otro."
            ]
        },
        # ── Funcionalidades de E-commerce ──
        {
            "id": "HU-053 [MCP]",
            "text": "Como cliente, quiero buscar y filtrar productos por nombre, precio y categoría, para encontrar rápidamente lo que necesito.",
            "ac": [
                "La búsqueda soporta texto parcial y devuelve resultados en < 500ms.",
                "Los filtros combinables incluyen rango de precio, categoría y etiqueta.",
                "Los resultados muestran paginación de máximo 12 productos por página."
            ],
            "mcp": {
                "tool": "search_products",
                "auth": "Público (sin autenticación requerida)",
                "agent": "Buscar productos con filtros de texto, precio, categoría y paginación."
            }
        },
        {
            "id": "HU-054",
            "text": "Como cliente, quiero navegar productos organizados por categorías y etiquetas, para descubrir productos relacionados fácilmente.",
            "ac": [
                "Cada producto pertenece a una categoría (ej. 'Kits Básicos', 'Kits Premium').",
                "Las etiquetas (Inicio, Más vendido, Premium) son configurables desde el backoffice.",
                "La home muestra secciones por categoría cuando hay múltiples productos."
            ]
        },
        {
            "id": "HU-055",
            "text": "Como cliente, quiero recibir notificaciones por email cuando el estado de mi orden cambie, para estar informado sin revisar el dashboard.",
            "ac": [
                "Se envía email al confirmarse el pago con resumen de la orden.",
                "Se envía email cuando la orden cambia a 'enviado' o 'completado'.",
                "Los emails usan templates responsivos con la marca UrbanSprout."
            ]
        },
        {
            "id": "HU-056",
            "text": "Como administrador, quiero recibir alertas automáticas cuando el inventario llegue a stock mínimo, para reabastecer a tiempo.",
            "ac": [
                "Al actualizar una orden pagada, si stock < minimum_stock se dispara alerta.",
                "La alerta se muestra en el backoffice con badge rojo en la navbar.",
                "Opcionalmente se envía email al admin configurado."
            ]
        },
        {
            "id": "HU-057",
            "text": "Como cliente, quiero aplicar cupones de descuento en mi carrito, para obtener mejores precios.",
            "ac": [
                "El carrito tiene un campo 'Código de descuento' que valida contra la base de datos.",
                "Los cupones pueden ser porcentaje o monto fijo, con fecha de expiración.",
                "El descuento se refleja en el subtotal antes de redirigir a Stripe."
            ]
        },
        {
            "id": "HU-058 [MCP]",
            "text": "Como cliente, quiero agregar productos a una lista de deseos, para guardar productos que me interesan para después.",
            "ac": [
                "Cada producto tiene un ícono de corazón para agregar/quitar de la wishlist.",
                "La wishlist se muestra en el dashboard con los productos guardados.",
                "Desde la wishlist se puede agregar todo al carrito con un clic."
            ],
            "mcp": {
                "tool": "manage_wishlist",
                "auth": "User JWT",
                "agent": "Agregar, quitar o consultar productos en la lista de deseos del usuario."
            }
        },
        {
            "id": "HU-059",
            "text": "Como cliente, quiero calificar y reseñar productos que compré, para compartir mi experiencia con otros compradores.",
            "ac": [
                "Solo clientes que compraron el producto pueden reseñarlo.",
                "La reseña incluye calificación (1-5 estrellas) y texto opcional.",
                "Las reseñas se muestran en la página de detalle del producto."
            ]
        },
        # ── i18n y Accesibilidad ──
        {
            "id": "HU-060 [MCP]",
            "text": "Como visitante, quiero cambiar el idioma del sitio (español/inglés), para usar la plataforma en mi idioma preferido.",
            "ac": [
                "El selector de idioma está disponible en el header y persiste la preferencia.",
                "Todas las cadenas visibles están externalizadas en archivos de traducción.",
                "Al menos español e inglés están soportados con cobertura completa."
            ],
            "mcp": {
                "tool": "get_translations",
                "auth": "Público",
                "agent": "Obtener las traducciones para un locale específico y una sección determinada."
            }
        },
        {
            "id": "HU-061 [MCP]",
            "text": "Como visitante con discapacidad visual, quiero que el sitio cumpla con WCAG 2.1 AA, para poder usar la plataforma de forma autónoma.",
            "ac": [
                "Contraste de color mínimo 4.5:1 en textos normales.",
                "Todos los elementos interactivos son accesibles por teclado (Tab, Enter, Escape).",
                "Los componentes tienen atributos ARIA apropiados (aria-label, role, live regions).",
                "Las imágenes tienen texto alternativo descriptivo."
            ],
            "mcp": {
                "tool": "run_accessibility_audit",
                "auth": "CI API key",
                "agent": "Ejecutar una auditoría de accesibilidad (axe/Lighthouse) y reportar violaciones de WCAG."
            }
        },
        {
            "id": "HU-062",
            "text": "Como usuario, quiero elegir entre modo claro y oscuro, para personalizar mi experiencia visual.",
            "ac": [
                "El toggle está disponible en el header y persiste la preferencia en localStorage.",
                "Respeta la preferencia del sistema (prefers-color-scheme) por defecto.",
                "Todos los componentes tienen variantes para ambos modos."
            ]
        },
        # ── Respaldos y Datos ──
        {
            "id": "HU-063 [MCP]",
            "text": "Como administrador, quiero programar backups automáticos de la base de datos con restauración por punto en el tiempo, para prevenir pérdida de datos.",
            "ac": [
                "Se ejecuta un backup diario automático de la base SQLite.",
                "Los backups se almacenan con timestamp en un directorio configurable.",
                "El admin puede listar backups disponibles y restaurar desde un punto específico.",
                "La restauración requiere confirmación y muestra advertencia de pérdida de datos posteriores."
            ],
            "mcp": {
                "tool": "manage_backups",
                "auth": "Admin JWT",
                "agent": "Crear, listar y restaurar backups de la base de datos."
            }
        },
        {
            "id": "HU-064 [MCP]",
            "text": "Como administrador, quiero exportar órdenes y productos a CSV/JSON, para integrar con sistemas externos o hacer análisis offline.",
            "ac": [
                "El admin selecciona el tipo de datos (órdenes, productos, clientes) y formato (CSV o JSON).",
                "Se pueden aplicar filtros por rango de fechas y estado.",
                "El archivo se descarga automáticamente con nombre descriptivo."
            ],
            "mcp": {
                "tool": "export_data",
                "auth": "Admin JWT",
                "agent": "Exportar datos del sistema en formato CSV o JSON con filtros opcionales."
            }
        },
        {
            "id": "HU-065",
            "text": "Como usuario, quiero tener herramientas de cumplimiento GDPR (exportar mis datos, eliminar mi cuenta), para ejercer mis derechos de privacidad.",
            "ac": [
                "El dashboard tiene opción 'Exportar mis datos' que genera un JSON con toda la información del usuario.",
                "La opción 'Eliminar mi cuenta' requiere confirmación y password.",
                "La eliminación es irreversible y anonimiza las órdenes del usuario."
            ]
        },
        # ── Operaciones MCP adicionales ──
        {
            "id": "HU-066 [MCP]",
            "text": "Como cliente, quiero cancelar una orden pendiente desde mi dashboard, para anular compras que aún no se procesaron.",
            "ac": [
                "Las órdenes con estado 'pending' muestran botón 'Cancelar orden'.",
                "La cancelación actualiza el estado a 'cancelled' y notifica al administrador.",
                "No se puede cancelar una orden ya pagada o previamente cancelada."
            ],
            "mcp": {
                "tool": "cancel_order",
                "auth": "User JWT",
                "agent": "Cancelar una orden del usuario si está en estado pendiente."
            }
        },
        {
            "id": "HU-067 [MCP]",
            "text": "Como administrador, quiero generar reportes de ventas por período con desglose por producto, para analizar tendencias de negocio.",
            "ac": [
                "El reporte incluye revenue total, cantidad de órdenes, producto más vendido y ticket promedio.",
                "Se puede filtrar por rango de fechas personalizado.",
                "El reporte se visualiza en pantalla y es exportable a PDF o CSV."
            ],
            "mcp": {
                "tool": "generate_sales_report",
                "auth": "Admin JWT",
                "agent": "Generar un reporte de ventas para un período específico con desglose por producto."
            }
        },
        {
            "id": "HU-068 [MCP]",
            "text": "Como administrador, quiero gestionar el catálogo completo (productos + inventario) desde herramientas MCP, para automatizar operaciones de mantenimiento.",
            "ac": [
                "Se puede consultar el listado completo de productos con stock disponible.",
                "Se puede actualizar el precio o estado de un producto remotamente.",
                "Se pueden crear nuevos productos con todos sus atributos."
            ],
            "mcp": {
                "tool": "manage_catalog",
                "auth": "Admin JWT",
                "agent": "Consultar, crear y actualizar productos e inventario del catálogo."
            }
        }
    ]

    se2, ac_index = story(prod_stories, ac_index, "Production-Ready")
    elements.extend(se2)

    # ================================================================
    # SECCION 3: RESUMEN MCP
    # ================================================================
    elements.append(PageBreak())
    elements.append(Paragraph("3. Anexo: Resumen de Herramientas MCP", styles["SectionTitle"]))
    elements.append(Spacer(1, 3*mm))
    elements.append(Paragraph(
        "Las siguientes herramientas MCP se exponen bajo autenticación y son importables desde "
        "Claude Code o Codex para que agentes de IA ejecuten operaciones sobre UrbanSprout.",
        styles["StoryText"]
    ))
    elements.append(Spacer(1, 3*mm))

    mcp_summary = [
        ["Tool MCP", "Auth", "HU", "Qué permite al agente"],
        ["authorize_user", "Clerk JWT", "HU-025", "Validar permisos de usuario"],
        ["configure_rate_limit", "Admin JWT", "HU-026", "Ajustar límites de tasa"],
        ["manage_api_keys", "Admin JWT", "HU-027", "Crear/revocar API keys"],
        ["query_audit_logs", "Admin JWT", "HU-029", "Buscar eventos de auditoría"],
        ["process_refund", "Admin JWT + Stripe", "HU-030", "Procesar reembolsos"],
        ["sync_orders_stripe", "Admin JWT", "HU-031", "Sincronizar órdenes con Stripe"],
        ["manage_payment_methods", "User JWT", "HU-032", "Gestionar métodos de pago"],
        ["query_logs", "Admin JWT", "HU-034", "Consultar logs del sistema"],
        ["get_performance_metrics", "Admin JWT", "HU-035", "Métricas de rendimiento"],
        ["get_business_metrics", "Admin JWT", "HU-036", "KPIs de negocio"],
        ["get_error_feed", "Developer API key", "HU-037", "Error tracking"],
        ["run_unit_tests", "CI API key", "HU-042", "Ejecutar tests unitarios"],
        ["run_integration_tests", "CI API key", "HU-043", "Ejecutar tests integración"],
        ["trigger_ci_pipeline", "CI token", "HU-046", "Disparar CI pipeline"],
        ["trigger_deployment", "CI token", "HU-047", "Disparar deployment"],
        ["get_role_permissions", "Admin JWT", "HU-050", "Consultar matriz de permisos"],
        ["manage_users", "Admin JWT", "HU-051", "Gestionar usuarios del sistema"],
        ["search_products", "Público", "HU-053", "Buscar productos con filtros"],
        ["manage_wishlist", "User JWT", "HU-058", "Gestionar lista de deseos"],
        ["get_translations", "Público", "HU-060", "Obtener traducciones i18n"],
        ["run_accessibility_audit", "CI API key", "HU-061", "Auditar accesibilidad"],
        ["manage_backups", "Admin JWT", "HU-063", "Gestionar backups DB"],
        ["export_data", "Admin JWT", "HU-064", "Exportar datos del sistema"],
        ["cancel_order", "User JWT", "HU-066", "Cancelar orden pendiente"],
        ["generate_sales_report", "Admin JWT", "HU-067", "Reporte de ventas"],
        ["manage_catalog", "Admin JWT", "HU-068", "Gestionar catálogo completo"]
    ]

    col_widths = [55*mm, 40*mm, 16*mm, 65*mm]
    t = Table(mcp_summary, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.3, HexColor("#cccccc")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, HexColor("#f0faf0")]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 8*mm))

    # Resumen estadístico
    total_mvp = len(mvp_stories)
    total_prod = len(prod_stories)
    mcp_count = sum(1 for s in mvp_stories + prod_stories if "[MCP]" in s["id"])
    elements.append(Paragraph(
        f"<b>Resumen:</b> {total_mvp} HU implementadas (MVP) + {total_prod} HU production-ready = "
        f"{total_mvp + total_prod} total. De las cuales <b>{mcp_count}</b> son historias "
        f"<font color='#1a5276'><b>[MCP]</b></font>.",
        styles["StoryText"]
    ))
    elements.append(Spacer(1, 5*mm))
    elements.append(Paragraph(
        "Documento generado el junio 2026 — UrbanSprout — Desarrollo de Software IX",
        styles["FooterNote"]
    ))

    # Build
    doc.build(elements)
    print(f"PDF generado exitosamente: {OUTPUT_PATH}")
    print(f"Total: {total_mvp} HU implementadas + {total_prod} HU faltantes = {total_mvp + total_prod}")
    print(f"De las cuales {mcp_count} son [MCP]")


if __name__ == "__main__":
    build_pdf()
