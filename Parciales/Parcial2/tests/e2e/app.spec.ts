import { expect, test, type Page } from "@playwright/test";

async function hasVisibleText(page: Page, text: string) {
  const locator = page.getByText(text, { exact: false }).first();
  return (await locator.count()) > 0 && (await locator.isVisible());
}

async function expectAnyVisibleText(page: Page, texts: string[]) {
  for (const text of texts) {
    if (await hasVisibleText(page, text)) {
      return;
    }
  }
  throw new Error(`No se encontró ninguno de estos textos: ${texts.join(" | ")}`);
}

test("home: muestra hero, catálogo y compra", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("mini huerto");
  await expect(page.getByRole("heading", { level: 2 })).toContainText(
    "Kits para arrancar en una tarde",
  );
  await expect(page.getByRole("button", { name: "Comprar kit" })).toHaveCount(3);

  await expectAnyVisibleText(page, [
    "Iniciar sesión",
    "Configura Clerk para login",
    "Panel",
  ]);
});

test("sign-in: la ruta responde correctamente", async ({ page }) => {
  const response = await page.goto("/sign-in");

  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.locator("main")).toBeVisible();
});

test("sign-up: la ruta responde correctamente", async ({ page }) => {
  const response = await page.goto("/sign-up");

  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/sign-up/);
  await expect(page.locator("main")).toBeVisible();
});

test("dashboard: protege o renderiza estado esperado", async ({ page }) => {
  const response = await page.goto("/dashboard");
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);

  if (page.url().includes("/sign-in")) {
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.locator("main")).toBeVisible();
    return;
  }

  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible();
});

test("admin: protege o renderiza estado esperado", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
  await expectAnyVisibleText(page, ["Backoffice separado", "Abrir backoffice"]);
});

test("api checkout: devuelve error controlado para producto inválido", async ({ page }) => {
  const response = await page.request.post("/api/checkout", {
    data: { productId: "producto-inexistente" },
  });

  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.status()).toBeLessThan(600);

  const body = (await response.json()) as { error?: string };
  expect(typeof body.error).toBe("string");
  expect(body.error?.length ?? 0).toBeGreaterThan(0);
});
