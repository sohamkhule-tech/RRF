const fs = require('fs');
const glob = require('glob');

const files = [
  'app/approver/declined/page.jsx',
  'app/approver/on-hold/page.jsx',
  'app/approver/pending/page.jsx',
  'app/approver/approved/page.jsx',
  'app/approver/closed/page.jsx',
  'app/hr/open-hiring/page.jsx',
  'app/hr/closed/page.jsx',
  'app/pmo/closed/page.jsx',
  'app/hr/my-requests/page.jsx',
  'app/hiring-manager/my-requests/page.jsx',
  'app/hiring-manager/drafts/page.jsx',
  'app/pmo/sent-to-approvers/page.jsx',
  'app/pmo/open-positions/page.jsx',
  'app/pmo/pending/page.jsx'
];

// Helper to update Pos -> Positions header
function fixHeader(content) {
  return content.replace(
    />Pos</gi,
    '>Positions<'
  );
}

// Helper to update Pos mapping from request.positions to request.headcount || request.positions || 1
function fixPositionsValue(content) {
  // Mobile Card View: {request.positions || 1} -> {request.headcount || request.positions || 1}
  content = content.replace(/\{request\.positions \|\| 1\}/g, '{request.headcount || request.positions || 1}');
  
  // Table View: {request.positions} -> {request.headcount || request.positions || 1}
  // Try to find exact matches of {request.positions} in the standard table columns
  content = content.replace(
    /<span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">\s*\{request\.positions\}\s*<\/span>/g,
    '<span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">\n                      {request.headcount || request.positions || 1}\n                    </span>'
  );
  
  return content;
}

// Helper to fix Declined Date in declined/page.jsx
function fixDeclinedDate(content) {
  return content.replace(
    /\{request\.declinedAt \? new Date\(request\.declinedAt\)\.toLocaleDateString\('en-US', \{ year: 'numeric', month: 'short', day: 'numeric' \}\) : '-'\}/g,
    '{(request.declinedAt || request.rejectedAt || request.updatedAt) ? new Date(request.declinedAt || request.rejectedAt || request.updatedAt).toLocaleDateString(\'en-US\', { year: \'numeric\', month: \'short\', day: \'numeric\' }) : \'-\'}'
  );
}

// Helper to fix On Hold Date in on-hold/page.jsx
function fixOnHoldDate(content) {
  return content.replace(
    /\{request\.onHoldAt \? new Date\(request\.onHoldAt\)\.toLocaleDateString\('en-US', \{ year: 'numeric', month: 'short', day: 'numeric' \}\) : '-'\}/g,
    '{(request.onHoldAt || request.updatedAt) ? new Date(request.onHoldAt || request.updatedAt).toLocaleDateString(\'en-US\', { year: \'numeric\', month: \'short\', day: \'numeric\' }) : \'-\'}'
  );
}

for (const file of files) {
  let relativePath = file;
  if (!fs.existsSync(relativePath)) continue;

  let content = fs.readFileSync(relativePath, 'utf8');

  content = fixHeader(content);
  content = fixPositionsValue(content);

  if (relativePath.includes('declined/page.jsx')) {
    content = fixDeclinedDate(content);
  }
  if (relativePath.includes('on-hold/page.jsx')) {
    content = fixOnHoldDate(content);
  }

  fs.writeFileSync(relativePath, content, 'utf8');
}
console.log('Fixed POS and Dates across all files successfully.');
