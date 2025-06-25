const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/auditar", async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes("mercadolivre.com.br")) {
    return res.status(400).json({ error: "URL inválida ou ausente." });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const data = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      const getNumberFromText = (text) => {
        if (!text) return null;
        const match = text.match(/\d+(\.\d+)?/g);
        return match ? parseFloat(match.join("").replace(".", "").replace(",", ".")) : null;
      };

      const title = getText("h1.ui-pdp-title");
      const priceText = getText("span.ui-pdp-price__second-line span.price-tag-fraction");
      const price = priceText ? parseFloat(priceText.replace(".", "").replace(",", ".")) : null;

      const soldText = getText(".ui-pdp-subtitle span");
      const soldMatch = soldText ? soldText.match(/\d+/) : null;
      const soldQuantity = soldMatch ? parseInt(soldMatch[0]) : 0;

      const reputation = getText("p.ui-seller-info__status-info") ||
                         getText("p.ui-pdp-seller__header__subtitle");

      const descriptionHTML = document.querySelector("#description")?.innerHTML || null;

      const descriptionText = document.querySelector("#description")?.innerText || "";
      const medidas = [];
      const linhas = descriptionText.split("\n").map(l => l.trim());
      for (const linha of linhas) {
        const match = linha.match(/(Cilindro\s*[PGM]):?\s*(\d+)\s*cm.*?(\d+)\s*cm/i);
        if (match) {
          medidas.push({ tipo: match[1], altura: match[2], diametro: match[3] });
        }
      }

      const atributos = Array.from(document.querySelectorAll("tr.andes-table__row"))
        .map(row => {
          const key = row.querySelector("th")?.innerText.trim();
          const value = row.querySelector("td")?.innerText.trim();
          return key && value ? { [key]: value } : null;
        }).filter(Boolean);

      return {
        titulo: title,
        preco: price,
        vendidos: soldQuantity,
        reputacao: reputation,
        medidas,
        atributos_tecnicos: atributos,
        descriptionHTML
      };
    });

    await browser.close();
    return res.json(data);
  } catch (error) {
    await browser.close();
    return res.status(500).json({ error: "Erro ao auditar anúncio.", detalhe: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Auditor Mercado Livre rodando na porta ${PORT}`);
});
