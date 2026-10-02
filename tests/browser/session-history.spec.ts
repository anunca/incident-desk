import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "admin") {
  await page.goto("/");
  await page.getByLabel("E-mail").fill(`${role}@example.test`);
  await page.getByLabel("Mot de passe").fill("browser-tests-only-password");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible();
}
test("loads local HTTP assets without forcing HTTPS", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Se connecter" }),
  ).toBeVisible();
  expect(new URL(page.url()).protocol).toBe("http:");
  const policy = (await page.request.get("/")).headers()[
    "content-security-policy"
  ];
  expect(policy).not.toContain("upgrade-insecure-requests");
});
test("restores a session on reload and clears private data after expiration", async ({
  page,
  context,
}) => {
  await login(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toHaveCount(
    0,
  );
  await context.clearCookies();
  await page.getByRole("button", { name: "Actualiser" }).click();
  await expect(
    page.getByRole("button", { name: "Se connecter" }),
  ).toBeVisible();
  await expect(page.locator("#message")).toContainText("session a expiré");
  await expect(
    page.getByRole("heading", { name: "Incidents récents" }),
  ).toHaveCount(0);
});
test("refreshes an open history panel after a status change", async ({
  page,
}) => {
  await login(page);
  const title = `Browser history ${Date.now()}`;
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Description").fill("History regression");
  await page.getByRole("button", { name: "Créer l’incident" }).click();
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title }) });
  await card.getByText("Historique", { exact: true }).click();
  await expect(card.locator("li")).toHaveCount(1);
  await card.getByRole("button", { name: "En investigation" }).click();
  await expect(card.locator("li")).toHaveCount(2);
  await expect(card.locator("li").last()).toContainText("status_changed");
  await card.getByText("Historique", { exact: true }).click();
  await card.getByText("Historique", { exact: true }).click();
  await expect(card.locator("li")).toHaveCount(2);
});
test("keeps reader permissions after restoring the session", async ({
  page,
}) => {
  await login(page, "reader");
  await page.reload();
  await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nouvel incident" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Créer l’incident" }),
  ).toHaveCount(0);
});
