# hilton-lookup

Daily Hilton award-point watcher that runs on a Raspberry Pi. It scrapes the
public Hilton booking site for two specific stays and sends ntfy.sh push
notifications when prices drop below target thresholds. Running locally on a
residential IP avoids the datacenter-IP bans that trip up cloud scrapers.

## Tracked stays

| Stay | Dates | Alert rule |
|---|---|---|
| Hilton Toronto | 2026-06-24 → 2026-06-29 | Total < 280,000 pts |
| Hampton Inn & Suites Franklin Berry Farms | 2026-09-23 → 2026-09-26 | Drop below last recorded price |

All scraping is done against the **public** Hilton search pages — no login is
performed.

## Setup on Raspberry Pi

Requires Node.js 20+ (install via nvm or NodeSource — the Raspberry Pi OS apt
version is too old).

```bash
git clone https://github.com/patrick-simpson/hilton-lookup.git
cd hilton-lookup
npm install          # also runs `playwright install chromium`
```

If Playwright complains about missing system libraries (common on Pi OS):

```bash
sudo npx playwright install-deps chromium
# if that fails, install the common deps manually:
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libpango-1.0-0 libcairo2 libasound2
```

## Configure

Open `index.js` and edit the constants at the top:

1. **`NTFY_TOPIC`** — replace `REPLACE_ME_TOPIC` with an unguessable topic name
   (ntfy.sh topics are public; treat the name as a shared secret). Subscribe to
   the same topic on your phone using the ntfy app.
2. **`ctyhocn` codes** — verify on hilton.com. Search the hotel, open the
   booking page, and copy the `ctyhocn=...` value from the URL bar.
3. **`TORONTO_THRESHOLD`** — default 280,000 pts; adjust as your benchmark
   moves.

## Test run

```bash
npm start
```

A low-priority "✅ Scan complete" heartbeat with both prices should arrive on
your phone within a minute or two. A `prices.json` file will be created —
delete it any time to re-seed.

## Cron (daily at 07:30)

```bash
crontab -e
```

Add (adjust the path and user):

```
30 7 * * * cd /home/pi/hilton-lookup && /usr/bin/node index.js >> scrape.log 2>&1
```

Confirm your Node path with `which node` first — it may be
`/usr/local/bin/node` or an nvm path like
`/home/pi/.nvm/versions/node/vX.Y.Z/bin/node`.

## Troubleshooting

- **No notification at all** — `tail scrape.log`. Common causes: ntfy topic
  misconfigured, Node not found from cron's minimal PATH, Playwright missing
  system libraries.
- **"Scraper Broken" alert** — page structure or selectors changed, or
  Cloudflare/captcha kicked in. Inspect the log; rerun manually with
  `headless: false` in `index.js` to see the browser.
- **Re-seed state** — `rm prices.json`; next run starts fresh.
- **Adjust schedule** — [crontab.guru](https://crontab.guru) has a visual
  builder for the expression.

## How it stays under the radar

- `playwright-extra` + `puppeteer-extra-plugin-stealth` patch the headless
  Chromium fingerprint (webdriver flag, WebGL vendor, plugins, etc.).
- Modern desktop user-agent, standard 1440×900 viewport, `en-US` locale.
- Randomized 2–6 second human-like jitter between page loads and actions.
- Single daily run per hotel — well below any plausible rate limit.
- Runs from a residential IP on your Pi, not a cloud IP range.
