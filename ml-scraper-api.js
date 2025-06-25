// ml-scraper-api.js (versão ajustada para capturar corretamente dados de descriptionHTML, atributos e imagens)

const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL não fornecida." });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const result = await page.evaluate(() => {
      const title = document.querySelector("h1.ui-pdp-title")?.innerText || "";
      const price = document.querySelector(".ui-pdp-price__second-line")?.innerText || "";

      const sold = document.querySelector(".ui-pdp-subtitle")?.innerText || "";
      const reputation = document.querySelector(".ui-pdp-seller__header__title")?.innerText || "";

      const descriptionHTML = document.querySelector("#description")?.innerHTML || "";

      const images = Array.from(document.querySelectorAll(".ui-pdp-gallery__figure img"))
        .map(img => img.getAttribute("src"))
        .filter(src => src);

      const attributes = Array.from(document.querySelectorAll(".ui-vpp-striped-specs__table tr"))
        .map(row => {
          const label = row.querySelector("th")?.innerText.trim();
          const value = row.querySelector("td")?.innerText.trim();
          return label && value ? { [label]: value } : null;
        })
        .filter(Boolean);

      return {
        title,
        price,
        sold,
        reputation,
        descriptionHTML,
        attributes,
        images,
        url: window.location.href
      };
    });

    await browser.close();
    res.json(result);
  } catch (err) {
    await browser.close();
    res.status(500).json({ error: "Erro ao capturar dados.", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
