const fs = require('fs');
const path = require('path');

const SECTION_ALIASES = new Map([
  ['project overview', 'Project Overview'],
  ['overview', 'Project Overview'],
  ['description', 'Project Overview'],
  ['project description', 'Project Overview'],
  ['platform includes', 'Platform Includes'],
  ['platform include', 'Platform Includes'],
  ['platforms included', 'Platform Includes'],
  ['platforms', 'Platform Includes'],
  ['system workflow', 'System Workflow'],
  ['workflow', 'System Workflow'],
  ['process flow', 'System Workflow'],
  ['app features', 'App Features'],
  ['application features', 'App Features'],
  ['user features', 'App Features'],
  ['features', 'App Features'],
  ['core modules', 'Core Modules'],
  ['modules', 'Core Modules'],
  ['main modules', 'Core Modules'],
  ['additional features', 'Additional Features'],
  ['extra features', 'Additional Features'],
  ['technology stack', 'Technology Stack'],
  ['tech stack', 'Technology Stack'],
  ['technologies', 'Technology Stack'],
  ['development charges', 'Development Charges'],
  ['development cost', 'Development Charges'],
  ['charges', 'Development Charges'],
  ['cost', 'Development Charges'],
  ['pricing', 'Development Charges'],
  ['work duration', 'Work Duration'],
  ['timeline', 'Work Duration'],
  ['duration', 'Work Duration'],
  ['estimated timeline', 'Work Duration'],
  ['payment structure', 'Payment Structure'],
  ['payment terms', 'Payment Structure'],
  ['payment', 'Payment Structure'],
  ['cloud hosting services', 'Cloud Hosting Services'],
  ['cloud hosting services optional', 'Cloud Hosting Services'],
  ['hosting', 'Cloud Hosting Services'],
  ['hosting services', 'Cloud Hosting Services'],
  ['additional charges', 'Additional Charges'],
  ['third party services', 'Additional Charges'],
  ['third-party services', 'Additional Charges'],
  ['third party charges', 'Additional Charges'],
  ['third-party charges', 'Additional Charges'],
  ['exclusions', 'Exclusions'],
  ['excluded items', 'Exclusions']
]);

const ORDERED_SECTIONS = [
  'Project Overview',
  'Platform Includes',
  'System Workflow',
  'App Features',
  'Core Modules',
  'Additional Features',
  'Technology Stack',
  'Development Charges',
  'Work Duration',
  'Payment Structure',
  'Cloud Hosting Services',
  'Additional Charges',
  'Exclusions'
];

const DEFAULT_BRAND_NAME = 'Digital Links';
const DEFAULT_BRAND_LOGO = '/brand.jpg';
const DEFAULT_OVERVIEW_BANNER = '/default-banner.jpg';

function normalizeText(text = '') {
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripOuterParens(value = '') {
  const trimmed = value.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function stripBullet(value = '') {
  return String(value)
    .replace(/^[\s\-*\u2022\u25cf\u25cb\u25a0\u25aa]+/, '')
    .replace(/^\d+\s*[.)]\s*/, '')
    .trim();
}

function headingFromLine(line = '') {
  const withoutBullet = stripBullet(line)
    .replace(/^#{1,4}\s*/, '')
    .replace(/^\d+\s*[\.\)\-:\u2013\u2014]\s*/, '')
    .replace(/[:\-]+$/g, '')
    .trim();

  const basic = withoutBullet
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\w\s/&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return SECTION_ALIASES.get(basic) || null;
}

function splitLines(text = '') {
  return normalizeText(text).split('\n').map((line) => line.trim());
}

function buildSections(text = '') {
  const lines = splitLines(text);
  const sections = { intro: [] };
  let current = 'intro';

  lines.forEach((line) => {
    if (!line) {
      sections[current].push('');
      return;
    }

    const heading = headingFromLine(line);
    if (heading) {
      current = heading;
      if (!sections[current]) sections[current] = [];
      return;
    }

    sections[current].push(line);
  });

  Object.keys(sections).forEach((key) => {
    sections[key] = trimBlankEdges(sections[key]);
  });

  return sections;
}

function trimBlankEdges(lines = []) {
  const copy = [...lines];
  while (copy.length && !copy[0]) copy.shift();
  while (copy.length && !copy[copy.length - 1]) copy.pop();
  return copy;
}

function getNonEmpty(lines = []) {
  return lines.map((line) => line.trim()).filter(Boolean);
}

function splitParagraphs(lines = []) {
  const paragraphs = [];
  let buffer = [];

  lines.forEach((line) => {
    if (!line.trim()) {
      if (buffer.length) {
        paragraphs.push(buffer.join(' '));
        buffer = [];
      }
      return;
    }
    buffer.push(stripBullet(line));
  });

  if (buffer.length) paragraphs.push(buffer.join(' '));
  return paragraphs.filter(Boolean);
}

function listItems(lines = []) {
  return getNonEmpty(lines)
    .map(stripBullet)
    .filter((line) => line && !/^[A-Za-z /&+-]+\s+can\s*:$/i.test(line));
}

function parseTitle(sections) {
  const introLines = getNonEmpty(sections.intro || []);
  const firstLine = introLines[0] || '';
  const secondLine = introLines[1] || '';

  let projectTitle = firstLine
    .replace(/^quotation\s*[-:\u2013\u2014]\s*/i, '')
    .replace(/^quote\s*[-:\u2013\u2014]\s*/i, '')
    .trim();

  if (!projectTitle) {
    const overview = getNonEmpty(sections['Project Overview'] || []);
    projectTitle = overview[0] ? 'Application & Website Development Quotation' : 'Project Quotation';
  }

  const projectSubtitle = /^\(.+\)$/.test(secondLine)
    ? stripOuterParens(secondLine)
    : '';

  return { projectTitle, projectSubtitle };
}

function parsePlatformIncludes(sections, subtitle = '') {
  const fromSection = listItems(sections['Platform Includes'] || []);
  const fromSubtitle = subtitle
    ? subtitle.split(/\s*\+\s*|\s*,\s*/).map(stripOuterParens).map((item) => item.trim()).filter(Boolean)
    : [];

  const items = fromSection.length ? fromSection : fromSubtitle;
  return unique(items);
}

function normalizeRoleTitle(rawTitle = '') {
  const clean = rawTitle
    .replace(/\s+can$/i, '')
    .replace(/^\s*for\s+/i, '')
    .trim();

  if (/^(user|users|customer|customers)$/i.test(clean)) return 'User App';
  if (/^(vendor|vendors|caterer|caterers|seller|sellers)$/i.test(clean)) return 'Vendor Panel';
  if (/^(admin|administrator|admins)$/i.test(clean)) return 'Admin Panel';
  if (/^(driver|drivers|delivery)$/i.test(clean)) return 'Delivery Panel';
  if (/^(website|web)$/i.test(clean)) return 'Website';

  return clean
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function actorHeader(line = '') {
  const clean = stripBullet(line);
  const match = clean.match(/^([A-Za-z][A-Za-z0-9 /&+-]{1,50}?)(?:\s+can)?\s*:$/i);
  if (!match) return null;

  const title = match[1].trim();
  if (/^(frontend|backend|database|admin panel|monthly plan|yearly plan)$/i.test(title)) return null;
  return normalizeRoleTitle(title);
}

function parseActorGroups(lines = []) {
  const groups = [];
  let current = null;
  const orphanItems = [];

  getNonEmpty(lines).forEach((line) => {
    const heading = actorHeader(line);
    if (heading) {
      current = { title: heading, items: [] };
      groups.push(current);
      return;
    }

    const item = stripBullet(line);
    if (!item) return;

    if (!current) {
      orphanItems.push(item);
      return;
    }

    current.items.push(item);
  });

  if (!groups.length && orphanItems.length) {
    groups.push({ title: 'Application Features', items: orphanItems });
  } else if (orphanItems.length) {
    groups.unshift({ title: 'General Features', items: orphanItems });
  }

  return groups.filter((group) => group.items.length);
}

function parseWorkflow(lines = []) {
  const steps = [];
  let current = null;
  const loose = [];

  getNonEmpty(lines).forEach((line) => {
    const clean = stripBullet(line);
    const stepMatch = clean.match(/^step\s*(\d+)\s*[\-:\u2013\u2014.)]?\s*(.*)$/i);

    if (stepMatch) {
      if (current) steps.push(current);
      current = {
        number: Number(stepMatch[1]),
        title: stepMatch[2].trim() || `Step ${stepMatch[1]}`,
        actor: '',
        items: []
      };
      return;
    }

    if (!current) {
      loose.push(clean);
      return;
    }

    const heading = actorHeader(clean);
    if (heading) {
      current.actor = heading;
      return;
    }

    if (clean) current.items.push(clean);
  });

  if (current) steps.push(current);

  if (!steps.length && loose.length) {
    const groups = parseActorGroups(loose);
    return groups.map((group, index) => ({
      number: index + 1,
      title: group.title,
      actor: group.title,
      items: group.items
    }));
  }

  return steps;
}

function parseTechStack(lines = []) {
  const items = [];

  getNonEmpty(lines).forEach((line) => {
    const clean = stripBullet(line);
    const match = clean.match(/^([^:]{2,40})\s*:\s*(.+)$/);
    if (match) {
      items.push({ label: match[1].trim(), value: match[2].trim() });
    } else {
      items.push({ label: 'Technology', value: clean });
    }
  });

  return items;
}

function parseDevelopmentCharges(lines = []) {
  const cleanLines = listItems(lines);
  let totalCost = '';

  cleanLines.forEach((line) => {
    const match = line.match(/(?:total\s+development\s+cost|total\s+cost|grand\s+total|project\s+cost)\s*:?\s*(.+)$/i);
    if (match) totalCost = match[1].trim();
  });

  if (!totalCost) {
    const currencyLine = cleanLines.find((line) => /(?:\u20b9|rs\.?|inr|\$)\s*[\d,]+|[\d,]+\s*(?:rs|inr)/i.test(line));
    if (currencyLine) totalCost = currencyLine.replace(/^.*?(?:\:|\-)\s*/, '').trim();
  }

  const titleLine = cleanLines.find((line) => !/total|cost|charges|development/i.test(line)) || 'Project Development';

  return {
    title: titleLine,
    totalCost: totalCost || 'To be finalized',
    lines: cleanLines
  };
}

function inferDescription(overviewParagraphs, introLines) {
  if (overviewParagraphs.length) return overviewParagraphs[0];

  const usefulIntro = introLines
    .filter((line) => !/^quotation/i.test(line))
    .filter((line) => !/^\(.+\)$/.test(line));

  return usefulIntro[0] || 'A structured quotation for app, website, panel, workflow, modules, technology, timeline, and commercial terms.';
}

function unique(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function withFallback(items, fallback) {
  return items && items.length ? items : fallback;
}

function parseQuotationPrompt(input = '') {
  const text = normalizeText(input);
  const sections = buildSections(text);
  const introLines = getNonEmpty(sections.intro || []);
  const { projectTitle, projectSubtitle } = parseTitle(sections);
  const overviewParagraphs = splitParagraphs(sections['Project Overview'] || []);
  const platforms = parsePlatformIncludes(sections, projectSubtitle);
  const workflowSteps = parseWorkflow(sections['System Workflow'] || []);
  const featureGroups = parseActorGroups(sections['App Features'] || []);
  const derivedGroups = featureGroups.length
    ? featureGroups
    : deriveFeatureGroupsFromWorkflow(workflowSteps);

  return {
    sourceText: text,
    projectTitle,
    projectSubtitle,
    description: inferDescription(overviewParagraphs, introLines),
    overviewParagraphs: withFallback(overviewParagraphs, [inferDescription(overviewParagraphs, introLines)]),
    platforms: withFallback(platforms, ['Android App', 'iOS App', 'Admin Panel', 'Backend System']),
    workflowSteps: withFallback(workflowSteps, [
      { number: 1, title: 'Requirement Review', actor: 'Client & Team', items: ['Confirm project scope', 'Finalize modules and workflow'] },
      { number: 2, title: 'Design & Development', actor: 'Development Team', items: ['Create UI/UX', 'Build app, panel, and backend'] },
      { number: 3, title: 'Testing & Delivery', actor: 'Development Team', items: ['Test features', 'Prepare final delivery'] }
    ]),
    featureGroups: withFallback(derivedGroups, [{ title: 'Application Features', items: ['Login system', 'Dashboard', 'Management modules', 'Notifications'] }]),
    coreModules: withFallback(listItems(sections['Core Modules'] || []), ['Authentication system', 'Admin dashboard', 'Content management system', 'Notification system']),
    additionalFeatures: withFallback(listItems(sections['Additional Features'] || []), ['Clean UI/UX', 'Fast performance', 'Scalable architecture']),
    techStack: withFallback(parseTechStack(sections['Technology Stack'] || []), [
      { label: 'Frontend', value: 'Flutter / Responsive Web UI' },
      { label: 'Backend', value: 'Node.js' },
      { label: 'Database', value: 'MongoDB' },
      { label: 'Admin Panel', value: 'Web Dashboard' }
    ]),
    developmentCharges: parseDevelopmentCharges(sections['Development Charges'] || []),
    duration: withFallback(listItems(sections['Work Duration'] || []), ['Timeline to be finalized after scope confirmation']),
    paymentStructure: withFallback(listItems(sections['Payment Structure'] || []), ['50% advance payment - project start', '50% balance payment - before final delivery']),
    hosting: withFallback(listItems(sections['Cloud Hosting Services'] || []), ['Optional hosting can be added as per selected server plan']),
    additionalCharges: withFallback(listItems(sections['Additional Charges'] || []), ['Payment gateway, SMS/OTP, map, email, or third-party API charges as applicable']),
    exclusions: withFallback(listItems(sections['Exclusions'] || []), ['App publishing charges', 'Apple Developer Account charges', 'Any feature not explicitly mentioned above']),
    sections
  };
}

function deriveFeatureGroupsFromWorkflow(workflowSteps = []) {
  const grouped = new Map();

  workflowSteps.forEach((step) => {
    const title = step.actor || 'Workflow Features';
    if (!grouped.has(title)) grouped.set(title, []);
    grouped.get(title).push(...step.items);
  });

  return Array.from(grouped.entries()).map(([title, items]) => ({
    title,
    items: unique(items)
  })).filter((group) => group.items.length);
}

function renderParagraphs(paragraphs = []) {
  return paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('\n');
}

function renderPills(items = []) {
  return items.map((item) => `
    <span class="platform-pill">
      <span class="pill-icon">&check;</span>
      ${escapeHtml(item)}
    </span>
  `).join('\n');
}

function renderWorkflow(steps = []) {
  return steps.map((step, index) => `
    <div class="workflow-node">
      <article class="workflow-step">
        <div class="step-badge">Step ${escapeHtml(step.number || '')}</div>
        <h3>${escapeHtml(step.title || 'Workflow Step')}</h3>
        ${step.actor ? `<p class="step-actor">${escapeHtml(step.actor)}</p>` : ''}
        ${renderList(step.items)}
      </article>
      ${index < steps.length - 1 ? '<div class="flow-arrow" aria-hidden="true"><span></span></div>' : ''}
    </div>
  `).join('\n');
}

function renderFeatureGroups(groups = []) {
  return groups.map((group) => `
    <article class="feature-group">
      <h3>${escapeHtml(group.title)}</h3>
      ${renderList(group.items)}
    </article>
  `).join('\n');
}

function renderModuleCards(items = []) {
  return items.map((item, index) => `
    <article class="module-card">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <p>${escapeHtml(item)}</p>
    </article>
  `).join('\n');
}

function renderList(items = []) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')}</ul>`;
}

function renderTechStack(items = []) {
  return items.map((item) => `
    <div class="tech-row">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>
  `).join('\n');
}

function renderCost(charges) {
  const detailRows = charges.lines
    .filter((line) => !line.includes(charges.totalCost))
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('\n');

  return `
    <div class="cost-card">
      <div>
        <p class="cost-kicker">${escapeHtml(charges.title || 'Project Development')}</p>
        <h3>Total Development Cost</h3>
      </div>
      <div class="cost-amount">${escapeHtml(charges.totalCost)}</div>
      ${detailRows ? `<ul class="cost-details">${detailRows}</ul>` : ''}
    </div>
  `;
}

function renderTermsGrid(data) {
  const cards = [
    ['Work Duration', data.duration],
    ['Payment Structure', data.paymentStructure],
    ['Cloud Hosting Services', data.hosting],
    ['Additional Charges', data.additionalCharges],
    ['Exclusions', data.exclusions]
  ];

  return cards.map(([title, items]) => `
    <article class="term-card">
      <h3>${escapeHtml(title)}</h3>
      ${renderList(items)}
    </article>
  `).join('\n');
}

function fillTemplate(template, data, options = {}) {
  const generatedDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  const brandName = String(options.brandName || DEFAULT_BRAND_NAME).trim() || DEFAULT_BRAND_NAME;
  const brandLogo = String(options.brandLogo || DEFAULT_BRAND_LOGO).trim() || DEFAULT_BRAND_LOGO;
  const overviewBanner = String(options.overviewBanner || DEFAULT_OVERVIEW_BANNER).trim() || DEFAULT_OVERVIEW_BANNER;

  const replacements = {
    'Project Title': escapeHtml(data.projectTitle),
    'Project Subtitle': escapeHtml(data.projectSubtitle || data.platforms.join(' + ')),
    'Description': escapeHtml(data.description),
    'Generated Date': generatedDate,
    'Brand Name': escapeHtml(brandName),
    'Brand Logo': escapeHtml(brandLogo),
    'Overview Banner': escapeHtml(overviewBanner),
    'Project Overview': renderParagraphs(data.overviewParagraphs),
    'Platform Includes': renderPills(data.platforms),
    'System Workflow': renderWorkflow(data.workflowSteps),
    'App Features': renderFeatureGroups(data.featureGroups),
    'User Features': renderFeatureGroups(data.featureGroups),
    'Core Modules': renderModuleCards(data.coreModules),
    'Additional Features': renderPills(data.additionalFeatures),
    'Technology Stack': renderTechStack(data.techStack),
    'Development Charges': renderCost(data.developmentCharges),
    'Work Duration': renderList(data.duration),
    'Payment Structure': renderList(data.paymentStructure),
    'Cloud Hosting Services': renderList(data.hosting),
    'Additional Charges': renderList(data.additionalCharges),
    'Exclusions': renderList(data.exclusions),
    'Terms Grid': renderTermsGrid(data)
  };

  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => replacements[key.trim()] || '');
}

function renderQuotationHtml(prompt, templatePath = path.join(__dirname, 'template1.html'), options = {}) {
  const template = fs.readFileSync(templatePath, 'utf8');
  const data = parseQuotationPrompt(prompt);
  const html = fillTemplate(template, data, options);
  return { data, html };
}

module.exports = {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_LOGO,
  DEFAULT_OVERVIEW_BANNER,
  ORDERED_SECTIONS,
  parseQuotationPrompt,
  fillTemplate,
  renderQuotationHtml,
  escapeHtml
};
