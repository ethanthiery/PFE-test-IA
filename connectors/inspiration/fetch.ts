import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';

// Télécharge une page publique et ses feuilles de style, sans jamais joindre
// le Mac lui-même ni le réseau local : l'adresse est vérifiée à chaque connexion.

const MAX_BYTES = 1_500_000;
const MAX_SHEETS = 8;
const MAX_REDIRECTS = 3;

const blocked = new net.BlockList();
for (const [range, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(range, prefix, 'ipv4');
for (const [range, prefix] of [
  ['::', 127],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  blocked.addSubnet(range, prefix, 'ipv6');

export function isPrivateAddress(address: string) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  const ip = mapped ?? address;
  const family = net.isIP(ip);
  return family === 0 || blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

export class InspirationError extends Error {}

const lookup: net.LookupFunction = (host, options, callback) =>
  dns.lookup(host, options, (error, address, family) => {
    const list = Array.isArray(address) ? address : [{ address, family }];
    if (!error && list.some((a) => isPrivateAddress(a.address)))
      error = new InspirationError(
        'Adresse locale ou privée refusée : seuls les sites publics sont analysés.',
      ) as NodeJS.ErrnoException;
    (callback as (...args: unknown[]) => void)(error, address, family);
  });

export function checkUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new InspirationError('Lien invalide.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw new InspirationError('Seuls les liens http et https sont acceptés.');
  if (url.username || url.password)
    throw new InspirationError('Lien avec identifiants refusé.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  )
    throw new InspirationError('Adresse locale refusée.');
  if (net.isIP(host) && isPrivateAddress(host))
    throw new InspirationError('Adresse locale ou privée refusée.');
  if (/(^|\.)figma\.com$/.test(host))
    throw new InspirationError(
      'Les fichiers Figma demandent une connexion : envoyez plutôt le lien à Claude dans le terminal.',
    );
  return url;
}

function get(url: URL, signal: AbortSignal, redirects = 0): Promise<string> {
  checkUrl(url.href);
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).get(
      url,
      {
        lookup,
        signal,
        headers: {
          'User-Agent': 'DS-Studio inspiration (lecture de styles publics)',
          Accept: 'text/html,text/css;q=0.9,*/*;q=0.5',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects >= MAX_REDIRECTS)
            return reject(new InspirationError('Trop de redirections.'));
          return get(
            new URL(res.headers.location, url),
            signal,
            redirects + 1,
          ).then(resolve, reject);
        }
        if (status !== 200) {
          res.resume();
          return reject(
            new InspirationError(
              `Le site a répondu ${status} pour ${url.host}.`,
            ),
          );
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => {
          size += c.length;
          if (size > MAX_BYTES) {
            req.destroy(new InspirationError('Page ou style trop volumineux.'));
            return;
          }
          chunks.push(c);
        });
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
  });
}

// Le HTML, ses blocs <style> et attributs style="", et les feuilles liées.
export async function fetchSiteCss(raw: string, signal: AbortSignal) {
  const page = checkUrl(raw);
  const html = await get(page, signal);
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (m) => m[1],
  );
  const attributes = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map(
    (m) => `x{${m[1]}}`,
  );
  const links = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => /rel\s*=\s*["']?[^"'>]*stylesheet/i.test(tag))
    .map((tag) => tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1])
    .filter((href): href is string => !!href)
    .slice(0, MAX_SHEETS);
  const sheets = await Promise.all(
    links.map((href) =>
      get(new URL(href.replace(/&amp;/g, '&'), page), signal).catch(() => ''),
    ),
  );
  return {
    css: [...inline, ...attributes, ...sheets].join('\n'),
    sheets: sheets.filter(Boolean).length,
    host: page.host,
  };
}
