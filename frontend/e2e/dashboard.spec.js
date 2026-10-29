import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const image = fileURLToPath(
  new URL("../../research/train-nano/val_batch0_labels.jpg", import.meta.url),
);
const artifact = fileURLToPath(new URL("../../artifacts/", import.meta.url));

test("sidebar mengikuti urutan baru dan analisis hanya memuat unggahan serta hasil", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Citra untuk dianalisis" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hasil klasifikasi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ringkasan", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".wordmark")).toContainText("Classify");
  await expect(page.locator(".wordmark")).toContainText("Osteoporosis");
  await expect(page.locator(".sidebar nav > .nav-group > a")).toHaveText([
    "Evaluasi model",
    "Dataset",
    "Analisis citra",
    "Riwayat0",
  ]);
  await expect(
    page.locator('.sidebar nav a[href="#analisis"]'),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".summary-strip")).toHaveCount(0);
  await expect(page.locator(".recent-panel")).toHaveCount(0);
  await expect(
    page.locator(".performance-panel, .comparison-panel"),
  ).toHaveCount(0);
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Metode penelitian",
  );
  await expect(page.locator(".sidebar-foot strong")).toHaveText("YOLOv8");
  await expect(page.locator(".sidebar-foot strong")).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Klasifikasi citra digital lutut kaki",
  );
  await fs.mkdir(artifact, { recursive: true });
  await page.screenshot({
    path: `${artifact}/dashboard-desktop.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("semua model evaluasi, loss, dan confusion matrix dapat ditinjau", async ({
  page,
}) => {
  await page.goto("/#evaluasi");
  for (const name of ["YOLOv8n", "YOLOv8s", "YOLOv8m", "YOLOv8l", "YOLOv8x"]) {
    await page.getByRole("button", { name: new RegExp(`^${name} `) }).click();
    await expect(
      page.getByRole("heading", { name: new RegExp(`^${name} ·`) }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Loss", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Loss pelatihan dan validasi YOLOv8x/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confusion matrix", exact: true })
    .click();
  const matrix = page.getByRole("img", { name: /^Confusion matrix YOLOv8x/ });
  await expect(matrix).toBeVisible();
  await expect
    .poll(() =>
      matrix.evaluate(
        (element) => element.complete && element.naturalWidth > 0,
      ),
    )
    .toBeTruthy();
  await page.getByRole("button", { name: "Kurva pelatihan" }).click();
  await expect(
    page.getByRole("button", { name: "Loss", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Epoch yang ditinjau").fill("0");
  await expect(page.locator(".chart-readout")).toContainText("Epoch 1");
  await page.getByText("Lihat data per epoch", { exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Loss validasi" }),
  ).toBeVisible();
});

test("dataset menampilkan dua kelas, pagination, dan citra asli", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#dataset");
  const normal = page.getByRole("region", { name: "Normal", exact: true });
  const osteoporosis = page.getByRole("region", {
    name: "Osteoporosis",
    exact: true,
  });
  await expect(normal).toBeVisible();
  await expect(osteoporosis).toBeVisible();
  const firstImage = normal.locator(".dataset-image img").first();
  await expect
    .poll(() =>
      firstImage.evaluate(
        (element) => element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const imageURL = await normal
    .locator(".dataset-image")
    .first()
    .getAttribute("href");
  const popupReady = page.waitForEvent("popup");
  await normal.locator(".dataset-image").first().click();
  const popup = await popupReady;
  await popup.waitForLoadState();
  expect(new URL(popup.url()).pathname).toBe(imageURL);
  await popup.close();
  await normal.getByRole("button", { name: "Berikutnya" }).click();
  await expect(normal.locator(".pagination")).toContainText("Halaman 2");
  await expect(osteoporosis.locator(".pagination")).toContainText("Halaman 1");
  await osteoporosis.getByRole("button", { name: "Berikutnya" }).click();
  await expect(osteoporosis.locator(".pagination")).toContainText("Halaman 2");
  await expect(normal.locator(".pagination")).toContainText("Halaman 2");
  await normal.getByRole("button", { name: "Sebelumnya" }).click();
  await expect(normal.locator(".pagination")).toContainText("Halaman 1");
  await expect
    .poll(() =>
      osteoporosis
        .locator(".dataset-image img")
        .first()
        .evaluate((element) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test("unggahan valid menjalankan model asli, menyimpan, memfilter, dan mengekspor", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#analisis");
  await page.getByLabel("Pilih citra X-ray").setInputFiles(image);
  await expect(page.getByAltText(/Pratinjau/)).toBeVisible();
  await page.getByRole("button", { name: "Jalankan analisis" }).click();
  await expect(page.locator(".result-content")).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByText("Analisis tersimpan.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".nav-count")).toHaveText("1");
  await page.getByRole("link", { name: "Lihat riwayat", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Detail val_batch0_labels.jpg" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Detail val_batch0_labels.jpg" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Detail val_batch0_labels.jpg" }),
  ).toBeFocused();
  await page.getByLabel("Cari citra").fill("missing-file");
  await expect(page.getByText("Tidak ada hasil yang cocok")).toBeVisible();
  await page.getByRole("button", { name: "Hapus filter" }).click();
  await expect(
    page.getByRole("button", { name: "Detail val_batch0_labels.jpg" }),
  ).toBeVisible();
  await page.getByLabel("Model riwayat").selectOption("small");
  await expect(page.getByText("Tidak ada hasil yang cocok")).toBeVisible();
  await page.getByLabel("Model riwayat").selectOption("");
  await page.getByLabel("Cari citra").fill("val_batch0");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("riwayat-analisis.csv");
  const csv = await fs.readFile(await download.path(), "utf8");
  expect(csv).toContain("val_batch0_labels.jpg");
  await page.getByRole("link", { name: "Analisis citra", exact: true }).click();
  await expect(page.locator(".result-content")).toBeVisible();
  await page.getByRole("button", { name: "Hapus pilihan" }).click();
  await expect(
    page.getByRole("button", { name: "Pilih citra", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Jalankan analisis" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("citra berisi nol ditolak dan pemilihan ulang memuat pratinjau baru", async ({
  page,
}) => {
  await page.goto("/#analisis");
  const input = page.getByLabel("Pilih citra X-ray");
  const submit = page.getByRole("button", { name: "Jalankan analisis" });
  const invalid = {
    name: "citra-kosong.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(1024),
  };
  await input.setInputFiles(invalid);
  await expect(page.getByRole("alert")).toContainText("tidak berisi gambar");
  await expect(submit).toBeDisabled();
  await expect(input).toHaveValue("");

  await input.setInputFiles(invalid);
  await expect(page.getByRole("alert")).toContainText("tidak berisi gambar");
  await input.setInputFiles(image);
  await expect(
    page.getByAltText("Pratinjau val_batch0_labels.jpg"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".xray-preview")
        .evaluate((element) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  await expect(page.getByRole("alert")).not.toBeVisible();
  await expect(submit).toBeEnabled();
  await expect(input).toHaveValue("");

  await input.setInputFiles({
    name: "terpotong.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });
  await expect(page.getByRole("alert")).toContainText(
    "rusak atau tidak lengkap",
  );
  await expect(submit).toBeDisabled();
  await input.setInputFiles(image);
  await expect
    .poll(() =>
      page
        .locator(".xray-preview")
        .evaluate((element) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Hapus pilihan" }).click();
  await expect(page.locator(".xray-preview")).not.toBeVisible();
  await input.setInputFiles(image);
  await expect
    .poll(() =>
      page
        .locator(".xray-preview")
        .evaluate((element) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
});

test("validasi citra dan kegagalan inferensi memberi pesan yang bisa ditindaklanjuti", async ({
  page,
}) => {
  await page.goto("/#analisis");
  await page.getByLabel("Pilih citra X-ray").setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("alert")).toContainText("PNG atau JPG/JPEG");
  await page.getByLabel("Pilih citra X-ray").setInputFiles(image);
  await page.route("**/api/predictions", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Model sedang tidak tersedia. Pilih model lain lalu coba lagi.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Jalankan analisis" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Model sedang tidak tersedia",
  );
  await expect(
    page.getByRole("button", { name: "Jalankan analisis" }),
  ).toBeEnabled();
  await expect(page.locator(".result-content")).not.toBeVisible();
});

test("koneksi dashboard yang gagal dapat dicoba kembali", async ({ page }) => {
  await page.route("**/api/dashboard", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Tidak dapat terhubung");
  await page.unroute("**/api/dashboard");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(
    page.getByRole("heading", { name: "Citra untuk dianalisis", level: 2 }),
  ).toBeVisible();
});

test("hapus riwayat mendukung batal, Escape, kegagalan, dan konfirmasi", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = await (await page.request.get("/api/dashboard")).json();
  await page.request.get('/api/health');
  const cookies = await page.context().cookies();
  const token = cookies.find(cookie => cookie.name === 'csrftoken').value;
  const response = await page.request.post("/api/predictions", {
    headers: { 'X-CSRFToken': token },
    multipart: {
      model: "nano",
      image: {
        name: "hapus-riwayat.jpg",
        mimeType: "image/jpeg",
        buffer: await fs.readFile(image),
      },
    },
  });
  expect(response.status()).toBe(201);
  const item = await response.json();
  await page.goto("/#riwayat");
  await page.getByLabel("Cari citra").fill(item.filename);
  const remove = page.getByRole("button", {
    name: `Hapus ${item.filename}`,
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "Hapus riwayat analisis?" });
  await remove.click();
  await expect(dialog.getByRole("button", { name: "Batal" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(remove).toBeFocused();
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Batal" }).click();
  await expect(dialog).not.toBeVisible();
  expect((await page.request.get(`/api/predictions/${item.id}`)).status()).toBe(
    200,
  );

  const endpoint = `**/api/predictions/${item.id}`;
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Riwayat belum dapat dihapus. Coba lagi.",
      }),
    }),
  );
  await remove.click();
  await dialog
    .getByRole("button", { name: "Hapus riwayat", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("belum dapat dihapus");
  await expect(
    dialog.getByRole("button", { name: "Hapus riwayat", exact: true }),
  ).toBeEnabled();
  expect((await page.request.get(`/api/predictions/${item.id}`)).status()).toBe(
    200,
  );
  await page.unroute(endpoint);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await fs.mkdir(artifact, { recursive: true });
  await page.screenshot({
    path: `${artifact}/history-delete.png`,
    fullPage: true,
  });

  let releaseDelete;
  const deleteReady = new Promise((resolve) => {
    releaseDelete = resolve;
  });
  await page.route(endpoint, async (route) => {
    await deleteReady;
    await route.continue();
  });
  await dialog
    .getByRole("button", { name: "Hapus riwayat", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Menghapus…", exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Batal" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  releaseDelete();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "berhasil dihapus" }),
  ).toBeVisible();
  await expect(page.getByText("Tidak ada hasil yang cocok")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Analisis tersimpan" }),
  ).toBeFocused();
  await expect(page.locator(".nav-count")).toHaveText(String(before.total));
  expect((await page.request.get(item.image_url)).status()).toBe(404);
  expect((await page.request.get(`/api/predictions/${item.id}`)).status()).toBe(
    404,
  );
  const after = await (await page.request.get("/api/dashboard")).json();
  expect(after.total).toBe(before.total);
  expect(errors).toEqual([]);
});

test("hapus baris terakhir pada halaman akhir kembali ke halaman sebelumnya", async ({
  page,
}) => {
  const dashboard = await (await page.request.get("/api/dashboard")).json();
  let items = Array.from({ length: 11 }, (_, index) => ({
    id: `pagination-${index}`,
    filename: `halaman-${index}.jpg`,
    image_url: "/api/models/nano/artifacts/confusion_matrix.png",
    model: "nano",
    label: "normal",
    confidence: 0.8,
    created_at: "2026-10-26T08:00:00+00:00",
  }));
  await page.route("**/api/dashboard", (route) =>
    route.fulfill({ json: { ...dashboard, total: items.length } }),
  );
  await page.route("**/api/predictions?*", (route) => {
    const current = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    return route.fulfill({
      json: {
        items: items.slice((current - 1) * 10, current * 10),
        total: items.length,
        page: current,
        per_page: 10,
      },
    });
  });
  await page.route("**/api/predictions/pagination-10", (route) => {
    items = items.filter((item) => item.id !== "pagination-10");
    return route.fulfill({ json: { message: "Riwayat dihapus." } });
  });
  await page.goto("/#riwayat");
  await page.getByRole("button", { name: "Berikutnya" }).click();
  await expect(page.getByText("Halaman 2 dari 2")).toBeVisible();
  await page
    .getByRole("button", { name: "Hapus halaman-10.jpg", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hapus riwayat", exact: true })
    .click();
  await expect(page.getByText("Halaman 1 dari 1")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Detail halaman-0.jpg" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Berikutnya" })).toBeDisabled();
});

for (const colorScheme of ["light", "dark"]) {
  test(`tema putih dan aksesibilitas saat preferensi sistem ${colorScheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const route of ["analisis", "evaluasi", "dataset", "riwayat"]) {
      await page.goto(`/#${route}`);
      await expect(page.locator("#upload-title")).toBeAttached();
      await expect(page.locator(".sidebar")).toHaveCSS(
        "background-color",
        "rgb(18, 61, 138)",
      );
      await expect(page.locator(".panel:visible").first()).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
      await expect(page.locator(".sidebar nav .nav-icon")).toHaveCount(4);
      if (route.startsWith("dataset")) {
        await expect(page.locator(".dataset-grid")).toHaveCount(2);
        await expect(page.locator(".dataset-grid").first()).toBeVisible();
        await expect(
          page.locator(".dataset-panel .loading-state"),
        ).not.toBeVisible();
      }
      if (route === "riwayat") {
        await expect(page.locator(".history-panel")).toBeVisible();
        await expect(
          page.locator(".history-panel .loading-state"),
        ).not.toBeVisible();
      }
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    }
    await fs.mkdir(artifact, { recursive: true });
    await page.goto("/#ringkasan");
    await expect(page.locator("#upload-title")).toBeAttached();
    await page.screenshot({
      path: `${artifact}/dashboard-${colorScheme}.png`,
      fullPage: true,
    });
  });
}

test("menu lingkaran ponsel mendukung keyboard, backdrop, navigasi, dan perubahan ukuran", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#analisis");
  const toggle = page.locator(".menu-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveCSS("border-radius", "50%");
  await expect(page.locator(".sidebar")).not.toBeVisible();
  await expect(
    page.getByText("PNG atau JPG/JPEG · maksimal 10 MB"),
  ).toBeVisible();
  await toggle.click();
  const menu = page.getByRole("dialog", { name: "Menu navigasi" });
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const close = menu.getByRole("button", { name: "Tutup menu navigasi" });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(menu.locator('a[href="#riwayat"]')).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: `${artifact}/mobile-menu-open.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.locator(".menu-backdrop").click({ position: { x: 375, y: 160 } });
  await expect(menu).not.toBeVisible();
  await toggle.click();
  await menu.getByRole("link", { name: "Dataset", exact: true }).click();
  await expect(menu).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dataset", level: 1 }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await toggle.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(toggle).not.toBeVisible();
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator(".menu-backdrop")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("layout bertahan di ponsel, tablet, desktop, dan teks 200 persen", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["analisis", "evaluasi", "dataset", "riwayat"]) {
      await page.goto(`/#${route}`);
      await expect(page.locator("#upload-title")).toBeAttached();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      expect(overflow, `${route} overflow at ${width}`).toBe(false);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#ringkasan");
  await expect(page.locator("#upload-title")).toBeAttached();
  await fs.mkdir(artifact, { recursive: true });
  await page.screenshot({
    path: `${artifact}/dashboard-mobile.png`,
    fullPage: true,
  });
  for (const route of ["analisis", "evaluasi", "dataset", "riwayat"]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("#upload-title")).toBeAttached();
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `${route} overflow at 200% text`,
    ).toBe(false);
  }
});
