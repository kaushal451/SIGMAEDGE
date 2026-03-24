// ─── KRA CLASSIFICATION ───────────────────────────────────────────────────────
const TECH_KEYWORDS = [
  'cto', 'cio', 'chief technology', 'chief information', 'vp engineering',
  'vp of engineering', 'head of engineering', 'head of technology',
  'software engineer', 'software developer', 'full stack', 'frontend', 'backend',
  'devops', 'cloud', 'architect', 'data engineer', 'data scientist',
  'machine learning', 'ai engineer', 'it manager', 'it director',
  'technical lead', 'tech lead', 'platform engineer', 'infrastructure',
  'sre', 'site reliability', 'cybersecurity', 'information security',
  'network engineer', 'systems engineer', 'solutions engineer',
  'product engineer', 'engineering manager', 'r&d', 'research engineer',
  'mobile developer', 'android', 'ios developer', 'qa engineer',
  'test engineer', 'database', 'etl', 'bi developer', 'tableau', 'power bi'
];

const MARKETING_KEYWORDS = [
  'cmo', 'chief marketing', 'vp marketing', 'vp of marketing',
  'head of marketing', 'marketing director', 'marketing manager',
  'digital marketing', 'growth hacker', 'growth manager', 'demand generation',
  'brand manager', 'content marketing', 'seo', 'sem', 'ppc',
  'social media manager', 'social media', 'email marketing',
  'marketing automation', 'hubspot', 'salesforce marketing',
  'campaign manager', 'performance marketing', 'product marketing',
  'marketing analyst', 'marketing strategist', 'communications',
  'pr manager', 'public relations', 'influencer', 'copywriter',
  'content strategist', 'media buyer', 'paid media', 'inbound marketing',
  'outbound marketing', 'account based marketing', 'abm'
];

function classifyKRA(title = '', jobDesc = '') {
  const text = (title + ' ' + jobDesc).toLowerCase();
  const isTech = TECH_KEYWORDS.some(k => text.includes(k));
  const isMkt = MARKETING_KEYWORDS.some(k => text.includes(k));
  if (isTech && isMkt) return 'Both';
  if (isTech) return 'Technology';
  if (isMkt) return 'Marketing';
  return 'Other';
}

// ─── EXTRACT LEADS FROM CURRENT PAGE ─────────────────────────────────────────
function extractLeadsFromPage(fields, kraFilter, autoKRA) {
  const leads = [];

  // Sales Navigator search result cards - multiple possible selectors
  const cardSelectors = [
    '[data-view-name="search-results-lead-list-card"]',
    '.artdeco-list__item',
    '[data-chameleon-result-urn]',
    '.search-results__result-item',
    'li.reusable-search__result-container',
  ];

  let cards = [];
  for (const sel of cardSelectors) {
    cards = Array.from(document.querySelectorAll(sel));
    if (cards.length > 0) break;
  }

  // Fallback: grab all list items that contain a person name pattern
  if (cards.length === 0) {
    cards = Array.from(document.querySelectorAll('li')).filter(li => {
      return li.querySelector('a[href*="linkedin.com/in/"]') ||
             li.querySelector('[data-anonymize="person-name"]');
    });
  }

  cards.forEach(card => {
    try {
      const lead = {};

      // NAME
      if (fields.name !== false) {
        const nameEl = card.querySelector(
          '[data-anonymize="person-name"], .artdeco-entity-lockup__title, ' +
          '.result-lockup__name, span[aria-hidden="true"]'
        );
        lead.name = nameEl ? nameEl.textContent.trim() : extractTextByPattern(card, 'name');
      }

      // TITLE / JOB TITLE
      if (fields.title !== false) {
        const titleEl = card.querySelector(
          '[data-anonymize="title"], .artdeco-entity-lockup__subtitle, ' +
          '.result-lockup__highlight-keyword, .t-14.t-black.t-normal'
        );
        lead.title = titleEl ? titleEl.textContent.trim() : '';
      }

      // COMPANY
      if (fields.company !== false) {
        const companyEl = card.querySelector(
          '[data-anonymize="company-name"], .result-lockup__position-company, ' +
          '[data-control-name="view_company"] span, .artdeco-entity-lockup__caption'
        );
        lead.company = companyEl ? companyEl.textContent.trim() : '';
      }

      // LOCATION
      if (fields.location !== false) {
        const locationEl = card.querySelector(
          '[data-anonymize="location"], .result-lockup__misc-item, ' +
          '.artdeco-entity-lockup__metadata, .t-black--light.t-12'
        );
        const locationText = locationEl ? locationEl.textContent.trim() : '';
        const parts = locationText.split(',').map(s => s.trim());
        lead.city = parts[0] || '';
        lead.state = parts[1] || '';
        lead.location = locationText;
      }

      // INDUSTRY / COMPANY SIZE
      if (fields.industry !== false || fields.companySize !== false) {
        const metaItems = card.querySelectorAll(
          '.result-lockup__misc-item, .artdeco-entity-lockup__metadata span'
        );
        let industry = '', companySize = '';
        metaItems.forEach(item => {
          const text = item.textContent.trim();
          if (/employees|company size/i.test(text)) {
            companySize = text;
          } else if (text && !industry && text.length < 60) {
            industry = text;
          }
        });
        lead.industry = industry;
        lead.companySize = companySize;
      }

      // JOB DESCRIPTION (summary snippet)
      if (fields.jobdesc !== false) {
        const descEl = card.querySelector(
          '.result-lockup__summary, [data-anonymize="job-description"], ' +
          '.search-result__snippet, .t-12.t-black--light'
        );
        lead.jobDesc = descEl ? descEl.textContent.trim() : '';
      }

      // LINKEDIN URL
      if (fields.linkedin !== false) {
        const linkEl = card.querySelector(
          'a[href*="/sales/people/"], a[href*="linkedin.com/in/"], ' +
          'a[data-control-name="view_lead_panel_via_search_lead_name"]'
        );
        lead.linkedinUrl = linkEl ? linkEl.href.split('?')[0] : '';
      }

      // KRA CLASSIFICATION
      if (autoKRA) {
        lead.kra = classifyKRA(lead.title, lead.jobDesc);
      } else {
        lead.kra = 'N/A';
      }

      // KRA FILTER
      if (kraFilter === 'tech' && lead.kra !== 'Technology') return;
      if (kraFilter === 'mkt' && lead.kra !== 'Marketing') return;

      lead.extractedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (lead.name || lead.linkedinUrl) {
        leads.push(lead);
      }
    } catch (e) {
      // skip malformed card
    }
  });

  return leads;
}

// Helper: best-effort text extraction
function extractTextByPattern(card, type) {
  const allText = card.querySelectorAll('span, a, p, div');
  for (const el of allText) {
    const t = el.textContent.trim();
    if (t.length > 2 && t.length < 60 && !t.includes('\n')) return t;
  }
  return '';
}

// ─── NEXT PAGE ────────────────────────────────────────────────────────────────
async function clickNextPageAndWait() {
  const getFirstCardText = () => {
    const el = document.querySelector('[data-anonymize="person-name"], .artdeco-entity-lockup__title');
    return el ? el.textContent.trim() : '';
  };

  const before = getFirstCardText();

  const nextBtn = document.querySelector(
    'button[aria-label="Next"], button.artdeco-pagination__button--next'
  );

  if (!nextBtn || nextBtn.disabled) return false;

  nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  nextBtn.click();

  // Wait for new content
  return new Promise((resolve) => {
    let attempts = 0;

    const interval = setInterval(() => {
      const after = getFirstCardText();

      if (after && after !== before) {
        clearInterval(interval);
        resolve(true);
      }

      attempts++;
      if (attempts > 15) { // ~7–8 sec max wait
        clearInterval(interval);
        resolve(false);
      }
    }, 500);
  });
}
// ─── MESSAGE LISTENER ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractLeads') {
    // Scroll to load all lazy content
    window.scrollTo(0, document.body.scrollHeight / 2);
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight);
      setTimeout(() => {
        const leads = extractLeadsFromPage(
          message.fields || {},
          message.kraFilter || 'both',
          message.autoKRA !== false
        );
        sendResponse({ leads, pageUrl: window.location.href });
      }, 800);
    }, 400);
    return true; // async
  }

  if (message.action === 'nextPage') {
  clickNextPageAndWait().then(success => {
    sendResponse({ success });
  });
  return true;
  }
});
