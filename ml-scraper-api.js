// ml-scraper-api.js
const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 10000;

app.get('/dados', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send({ erro: 'URL não informada' });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const data = await page.evaluate(() => {
    const getText = (selector) => document.querySelector(selector)?.innerText?.trim() || '';
    const getHTML = (selector) => document.querySelector(selector)?.innerHTML?.trim() || '';
    const getAllSrc = (selector) => Array.from(document.querySelectorAll(selector)).map(img => img.src);

    // Atributos Técnicos (lateral)
    const atributos = {};
    document.querySelectorAll('[data-testid="attributes"] tr').forEach(row => {
      const key = row.querySelector('th')?.innerText?.trim();
      const value = row.querySelector('td')?.innerText?.trim();
      if (key && value) atributos[key] = value;
    });

    // Reputação do vendedor
    const reputacao = document.querySelector('[data-testid="reputation-pill"]')?.innerText?.trim() || 'Não identificado';

    // Frete
    const frete = document.querySelector('[data-testid="shipping-option"]')?.innerText || '';
    const temFreteGratis = frete.toLowerCase().includes('grátis');

    return {
      titulo: getText('h1'),
      preco: getText('[data-testid="price"] span'),
      description: getText('#description'),
      descriptionHTML: getHTML('#description'),
      imagens: getAllSrc('img.ui-pdp-image'),
      atributos,
      frete: temFreteGratis ? 'Frete Grátis' : frete || 'Não identificado',
      reputacao,
      url: window.location.href
    };
  });

  await browser.close();
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

