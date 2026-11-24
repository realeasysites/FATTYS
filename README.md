# Fatty's Delivery website

Built on the Real Easy Sites **Workbench** template, "sound system" theme (beach sand + reggae red/gold/green).

Medical cannabis delivery site for Fatty's (Biddeford, ME). Built by [Real Easy Sites](https://getrealeasysites.com).

- **18+ gate** on every page (remembered for 30 days on the patient's device).
- **Menu** at `/menu`: the official Weedmaps **WM Store** embed when `WM_STORE_SNIPPET` is set; otherwise a panel that opens the live Weedmaps menu. Stock is still managed in Weedmaps only.
- **Delivery requests** in the ticket at `/#order` (`/order` redirects there): no payment. The patient's name, phone, town/address, med card number + expiration, order and timing go to the dashboard.
- **Owner dashboard** at `/admin`: password-only login, statuses (New → Confirmed → Out for delivery → Done / Cancelled), tap to text/call, delete any request, pause requests, site banner.
- **Privacy:** alert emails never include card numbers, addresses or order details. Card numbers are erased 30 days after a request is Done/Cancelled; requests are deleted after 180 days. The street address is not published on the site.
- Old GoDaddy URLs `/order-1` and `/about` redirect to the new sections.

## Environment (Render)

| Variable | What it does |
|---|---|
| `ADMIN_PASSWORD` | Dashboard password. Login is disabled until it's set. Never commit it. |
| `SESSION_SECRET` | Long random string that signs the login cookie. |
| `WM_STORE_SNIPPET` | Paste the WM Store code from Weedmaps (Manage my business → WM Store → Install → website type HTML). Set the "Embedding Website URL" in Weedmaps to `https://fattysfarms.com/menu`. |
| `NOTIFY_EMAIL` | Inbox for new-request alerts. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Outgoing email (e.g. Gmail app password: host `smtp.gmail.com`, port `465`). |
| `SITE_URL` | e.g. `https://fattysfarms.com`, used for the dashboard link in emails. |
| `CANONICAL_HOST` | e.g. `fattysfarms.com`, sends the onrender.com address to the real domain. |
| `DATA_DIR` | Where the SQLite database lives (point it at a Render disk to keep requests across deploys). |

## Run locally

```
npm install
ADMIN_PASSWORD=test npm start
```

Node 20 (better-sqlite3 has no prebuilt binary for newer Node).
