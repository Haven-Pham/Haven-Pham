// Rewrites the LATEST-REPOS block of README.md with the most recently pushed public repositories.
// Runs in GitHub Actions (Node 20, global fetch). GITHUB_TOKEN is optional but avoids rate limits.
const fs = require('fs');

const USER = process.env.GITHUB_USER || 'Haven-Pham';
const LIMIT = 6;
const START = '<!-- LATEST-REPOS:START -->';
const END = '<!-- LATEST-REPOS:END -->';

async function main() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': `${USER}-readme` };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com/users/${USER}/repos?type=owner&sort=pushed&per_page=50`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const repos = (await res.json())
    .filter(r => !r.fork && !r.archived && !r.private && r.name !== USER)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, LIMIT);

  const rows = repos.map(r => {
    const updated = r.pushed_at.slice(0, 10);
    const desc = (r.description || '').replace(/\|/g, '\\|');
    return `| [**${r.name}**](${r.html_url}) | ${desc} | ${r.language || '—'} | ${updated} |`;
  });
  const block = [
    START,
    '| Repository | Description | Language | Last push |',
    '|---|---|---|---|',
    ...rows,
    END
  ].join('\n');

  const readme = fs.readFileSync('README.md', 'utf8');
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (!pattern.test(readme)) throw new Error('LATEST-REPOS markers not found in README.md');
  fs.writeFileSync('README.md', readme.replace(pattern, block));
  console.log(`Listed ${rows.length} repositories.`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
