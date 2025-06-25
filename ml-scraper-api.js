
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

    // Rola a página para carregar seções dinâmicas
    await page.mouse.wheel({ deltaY: 5000 });
    await page.waitForTimeout(2000);

    // Tenta clicar no botão "Ver mais" se existir
    const expandButton = await page.$('button:has-text("Ver mais")');
    if (expandButton) await expandButton.click();

    // Captura os dados principais
    const title = await page.textContent('h1');
    const price = await page.textContent('[data-testid="price"]') || '';
    const descriptionText = await page.textContent('[data-testid="product-description"]') || '';
    const descriptionHTML = await page.$eval('[data-testid="product-description"]', el => el.innerHTML).catch(() => '');
    const images = await page.$$eval('img', imgs =>
      imgs.map(img => img.src).filter(src => src.startsWith('https'))
    );
    const category = await page.textContent('[data-testid="breadcrumb"]') || '';
    const soldQuantity = await page.textContent('[data-testid="sold-quantity"]') || '';
    const sellerRating = await page.textContent('[data-testid="seller-info-subtitle"]') || '';

    // Captura atributos técnicos adicionais (se existirem)
    const specs = await page.$$eval('.ui-pdp-specs__table tr', rows =>
      rows.map(r => r.innerText).filter(Boolean)
    ).catch(() => []);

    await browser.close();

    res.json({
      title: title?.trim(),
      price: price?.trim(),
      description: descriptionText?.trim(),
      descriptionHTML,
      images: images?.slice(0, 6),
      category: category?.trim(),
      soldQuantity: soldQuantity?.trim(),
      sellerRating: sellerRating?.trim(),
      specifications: specs
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
