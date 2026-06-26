const express = require('express');
const path = require('path');
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
