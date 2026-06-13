import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SUPABASE_TS_PATH = path.join(process.cwd(), 'src', 'lib', 'supabase.ts');

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// 1. Get Product IDs
let productIds = ['prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5', 'prod_6'];

try {
  if (fs.existsSync(SUPABASE_TS_PATH)) {
    const content = fs.readFileSync(SUPABASE_TS_PATH, 'utf8');
    // Find SEEDED_PRODUCTS block
    const seedMatch = content.match(/const SEEDED_PRODUCTS:\s*Product\[\]\s*=\s*\[([\s\S]*?)\];/);
    if (seedMatch) {
      const block = seedMatch[1];
      const matches = [...block.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
      if (matches.length > 0) {
        productIds = [...new Set(matches.map(m => m[1]))];
        console.log('✓ Successfully parsed dynamic product IDs from supabase.ts:', productIds);
      }
    }
  }
} catch (err) {
  console.warn('⚠️ Could not parse supabase.ts for product IDs, using defaults. Error:', err.message);
}

// 2. Generate sitemap.xml
const BASE_URL = 'https://shop.readersonic.com';
const currentDate = new Date().toISOString().split('T')[0];

const sitemapUrls = [
  { loc: `${BASE_URL}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${BASE_URL}/faq`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/privacy`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/terms`, changefreq: 'monthly', priority: '0.5' },
];

productIds.forEach(id => {
  sitemapUrls.push({
    loc: `${BASE_URL}/product/${id}`,
    changefreq: 'weekly',
    priority: '0.9'
  });
});

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapContent.trim());
console.log('✓ Generated sitemap.xml in public/ directory');

// 3. Generate robots.txt
const robotsContent = `User-agent: *
Allow: /
Sitemap: ${BASE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsContent);
console.log('✓ Generated robots.txt in public/ directory');
