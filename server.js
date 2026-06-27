const express = require('express');
const path = require('path');
const { chromium } = require('playwright');
const {
  renderQuotationHtml,
  parseQuotationPrompt,
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_LOGO,
  DEFAULT_OVERVIEW_BANNER
} = require('./quotation-engine');

const app = express();
const preferredPort = Number(process.env.PORT || 3000);
const templatePath = path.join(__dirname, 'template1.html');
let browserPromise = null;

app.set('trust proxy', true);

app.use(express.json({ limit: '25mb' }));
app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'prompt-generator.html'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'quotation-generator' });
});

app.get('/api/defaults', (_req, res) => {
  res.json({
    brandName: DEFAULT_BRAND_NAME,
    brandLogo: DEFAULT_BRAND_LOGO,
    overviewBanner: DEFAULT_OVERVIEW_BANNER
  });
});

function getRenderOptions(body = {}) {
  const branding = body.branding || {};
  return {
    brandName: branding.brandName || DEFAULT_BRAND_NAME,
    brandLogo: branding.brandLogo || DEFAULT_BRAND_LOGO,
    overviewBanner: branding.overviewBanner || DEFAULT_OVERVIEW_BANNER
  };
}

function ensureBaseHref(html, baseUrl) {
  const source = String(html || '');
  return /<base\s/i.test(source)
    ? source
    : source.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}">`);
}

function buildBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}/`;
}

function applyPdfExportMode(html) {
  const source = String(html || '');
  return source.replace(/<body([^>]*)>/i, (match, attrs = '') => {
    if (/class\s*=\s*["'][^"']*pdf-export[^"']*["']/i.test(match)) return match;
    const classMatch = attrs.match(/class\s*=\s*["']([^"']*)["']/i);
    if (classMatch) {
      const classes = classMatch[1].trim();
      const nextClasses = classes ? `${classes} pdf-export` : 'pdf-export';
      return `<body${attrs.replace(/class\s*=\s*["'][^"']*["']/i, `class="${nextClasses}"`)}>`;
    }
    return `<body${attrs} class="pdf-export">`;
  });
}

function buildPdfFileName(projectTitle = '') {
  const safeTitle = String(projectTitle || 'quotation')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${safeTitle || 'quotation'}.pdf`;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    }).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }

  return browserPromise;
}

async function waitForPageReady(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

  try {
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 15000 });
  } catch (_error) {
  }

  try {
    await page.evaluate(async () => {
      const images = Array.from(document.images || []);
      await Promise.all(images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }));
    });
  } catch (_error) {
  }

  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function renderPdfBuffer(prompt, req, body = {}) {
  const browser = await getBrowser();
  const { data, html } = renderQuotationHtml(prompt, templatePath, getRenderOptions(body));
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(15000);
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: 1240, height: 1754 });
    await page.setContent(ensureBaseHref(applyPdfExportMode(html), buildBaseUrl(req)), {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.emulateMedia({ media: 'screen' });
    await waitForPageReady(page);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    return { data, pdfBuffer };
  } finally {
    await page.close();
  }
}

app.post('/api/parse', (req, res) => {
  const prompt = String(req.body.prompt || '');
  if (!prompt.trim()) return res.status(400).json({ error: 'Prompt is required.' });
  res.json(parseQuotationPrompt(prompt));
});

app.post('/api/render', (req, res) => {
  const prompt = String(req.body.prompt || '');
  if (!prompt.trim()) return res.status(400).json({ error: 'Prompt is required.' });
  const result = renderQuotationHtml(prompt, templatePath, getRenderOptions(req.body));
  res.json(result);
});

app.post('/api/download-pdf', async (req, res) => {
  const prompt = String(req.body.prompt || '');
  if (!prompt.trim()) return res.status(400).json({ error: 'Prompt is required.' });

  try {
    const { data, pdfBuffer } = await renderPdfBuffer(prompt, req, req.body);
    const fileName = buildPdfFileName(data.projectTitle);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation failed:', error);
    res.status(500).json({ error: 'PDF generation failed. Please try again.' });
  }
});

function listenWithFallback(port) {
  const server = app.listen(port, () => {
    const address = server.address();
    console.log(`Quotation Generator running at http://localhost:${address.port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      listenWithFallback(port + 1);
      return;
    }
    throw error;
  });
}

listenWithFallback(preferredPort);

async function closeBrowser() {
  if (!browserPromise) return;

  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (_error) {
  } finally {
    browserPromise = null;
  }
}

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
