// ml-scraper-api.js - Versão aprimorada
const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

app.get("/dados", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ erro: "URL não informada." });

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const data = await page.evaluate(() => {
      const getText = (selector) => document.querySelector(selector)?.innerText || "";
      const getHTML = (selector) => document.querySelector(selector)?.innerHTML || "";

      const titleRaw = getText("h1.ui-pdp-title").trim();
      const title = titleRaw
        .replace(/frete gr[aá]tis/i, "")
        .replace(/[\-\|\n].*$/, "")
        .replace(/\s+/g, " ")
        .replace(/\//g, " / ");

      const price = getText(".ui-pdp-price__second-line").match(/R\$\s?[\d,.]+/)?.[0] || "";
      const descriptionHTML = getHTML(".ui-pdp-description");
      const descriptionText = getText(".ui-pdp-description");
      const attributes = [...document.querySelectorAll(".andes-table__row")].map(row => {
        const key = row.querySelector("th")?.innerText.trim();
        const value = row.querySelector("td")?.innerText.trim();
        return key && value ? `${key}: ${value}` : null;
      }).filter(Boolean);

      const shippingInfo = document.body.innerText.includes("Frete grátis") ? "Frete grátis" : "Não identificado";

      const reputation = document.body.innerText.match(/MercadoLíder.*(Platinum|Gold|Verde)/i)?.[0] || "Não identificada";

      const medidas = Array.from(descriptionText.matchAll(/CILINDRO\s+[PGM]\s*[-\u2013]?\s*Altura:\s*(\d+)[^\d]+Di[^"]{0,20}?(\d+)/gi)).map(match => {
        return `Altura: ${match[1]}cm, Diâmetro: ${match[2]}cm`;
      });

      const hasBullets = descriptionHTML.includes("<li>") || /[\u2022\*-]\s/.test(descriptionText);

      return {
        titulo: title,
        preco: price,
        frete: shippingInfo,
        reputacao: reputation,
        atributos: attributes,
        descricaoCompleta: descriptionText,
        medidas,
        descricaoHTML: descriptionHTML,
        possuiBulletPoints: hasBullets ? "Sim" : "Não",
      };
    });

    await browser.close();
    res.json(data);
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ erro: "Falha ao acessar o anúncio." });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
