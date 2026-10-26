import { test, expect } from "@playwright/test";

test("tautan GitHub tetap di kanan bawah, mendukung keyboard, dan mengikuti menu mobile", async ({
  page,
  context,
}) => {
  await page.goto("/#dataset");
  const link = page.getByRole("link", {
    name: "Lihat repositori di GitHub (tab baru)",
  });
  await expect(link).toHaveAttribute(
    "href",
    "https://github.com/Ragraze/classify-osteoporosis",
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(link).toBeVisible();
    const bounds = await link.boundingBox();
    expect(bounds.width).toBe(48);
    expect(bounds.height).toBe(48);
    expect(width - bounds.x - bounds.width).toBe(20);
    expect(900 - bounds.y - bounds.height).toBe(20);
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect.poll(async () => (await link.boundingBox()).y).toBe(bounds.y);
    const footer = await page.locator(".repository-footer").boundingBox();
    expect(footer.y).toBeLessThanOrEqual(bounds.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }

  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "Buka menu navigasi" }).click();
  await expect(page.locator(".workspace")).toHaveJSProperty("inert", true);
  await link.evaluate((element) => element.focus());
  expect(
    await page.evaluate(() =>
      document.querySelector(".sidebar").contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(link).toBeVisible();

  await page.keyboard.press("Tab");
  await link.focus();
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS("outline-style", "solid");
  await expect(link).toHaveCSS("outline-width", "3px");
  await context.route(
    "https://github.com/Ragraze/classify-osteoporosis",
    (route) =>
      route.fulfill({ contentType: "text/html", body: "GitHub repository" }),
  );
  const popupReady = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  const popup = await popupReady;
  await popup.waitForLoadState();
  expect(popup.url()).toBe("https://github.com/Ragraze/classify-osteoporosis");
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  await popup.close();
});
