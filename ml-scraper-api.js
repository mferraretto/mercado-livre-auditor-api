
// Requisitos: Node.js + Playwright
// Para rodar: npm init -y && npm install express playwright cors

const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());

app.get('/dados', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes('mercadolivre.com.br')) {
    return res.status(400).json({ error: 'URL inválida ou ausente.' });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { timeout: 60000 });

    const title = await page.textContent('h1');
    const price = await page.textContent('[data-testid="price"]') || '';
    const description = await page.textContent('[data-testid="product-description"]') || '';
    const images = await page.$$eval('img', imgs => imgs.map(img => img.src).filter(src => src.includes('http')));

    const category = await page.textContent('[data-testid="breadcrumb"]') || '';
    const soldQuantity = await page.textContent('[data-testid="sold-quantity"]') || '';
    const sellerRating = await page.textContent('[data-testid="seller-info-subtitle"]') || '';

    await browser.close();

    res.json({
      title: title?.trim(),
      price: price?.trim(),
      description: description?.trim(),
      images: images?.slice(0, 5),
      category: category?.trim(),
      soldQuantity: soldQuantity?.trim(),
      sellerRating: sellerRating?.trim()
    });
  } catch (err) {
    await browser.close();
    res.status(500).json({ error: 'Erro ao extrair dados: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
