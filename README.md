# IPTVantage Website

IPTVantage has two independent parts:

- The project root is a static HTML/CSS/JavaScript website. It has no Node.js backend and no database access.
- `PaymentBot/` is the Node.js Telegram payment-review bot.

## Static subscription flow

Changing the plan or duration updates a normal Telegram deep link, for example:

```text
https://t.me/vantagepaybot?start=premium_12m
```

The browser sends only a product ID. The bot validates that ID against the server-side catalog before creating an order, so the website never sends a trusted price, database credential, or bot token. There is deliberately no website payment API and no `POST /api/orders` endpoint.

The public bot username is set in `payment-bot-config.js`.

## Static website preview

The website can be opened directly from `index.html`. For a localhost preview, run this command from the project root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. No Node.js install or build step is required for the website.

## Local Payment Bot testing

Local development uses Telegram long polling. It does not require a public URL or webhook secret. Leave `MONGODB_URI` empty for temporary in-memory orders, or configure MongoDB Atlas to preserve local test orders across restarts.

```bash
cd PaymentBot
npm install
cp .env.example .env
npm run dev
```

Fill these local `.env` values before starting:

```env
NODE_ENV=development
TELEGRAM_MODE=polling
TELEGRAM_BOT_TOKEN=your_new_botfather_token
TELEGRAM_ADMIN_ID=your_numeric_telegram_user_id
MONGODB_URI=
MONGODB_DB_NAME=iptvantage
```

Also configure the `PAYMENT_*` values shown in `.env.example`. When `MONGODB_URI` is blank, orders exist only until the local process restarts. The bot calls Telegram's `deleteWebhook` method when polling starts, so do not run local polling with the same bot token while its production Render service is active.

Open the static website on localhost, choose a subscription, and click Subscribe. Telegram opens `@vantagepaybot`; the locally running bot receives the `/start` message through long polling.

## Render deployment

`render.yaml` defines the `iptvantage-payment-bot` Node.js web service. Orders are stored in MongoDB Atlas; no Supabase or PostgreSQL service is used. The bot creates the `orders` collection and its unique indexes automatically on the first database operation.

Configure these secret values in Render:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_ID`
- `MONGODB_URI` — the completed Atlas URI containing the real, URL-encoded password
- `APP_BASE_URL` — the final `https://...onrender.com` origin
- `PAYMENT_METHOD_NAME`
- `PAYMENT_RECIPIENT`
- `PAYMENT_IBAN`
- `PAYMENT_INSTRUCTIONS`

The Blueprint generates `TELEGRAM_WEBHOOK_SECRET`, sets `TELEGRAM_MODE=webhook`, and uses `MONGODB_DB_NAME=iptvantage`. The bot listens on Render's `PORT` and exposes:

- `GET /health`
- `POST /api/telegram/webhook`

After the first deployment, copy the generated webhook secret into a secure local `.env` along with the production bot token and `APP_BASE_URL`, then run:

```bash
cd PaymentBot
npm run telegram:set-webhook
npm run telegram:webhook-info
```

In MongoDB Atlas Network Access, allow your current IP for local testing and your Render service's outbound IP ranges for deployment. Keep the Atlas database user limited to the `iptvantage` database.

## Payment confirmation flow

1. The static website opens `@vantagepaybot` with the selected product ID.
2. The bot validates the product and creates a pending order at the trusted catalog price.
3. `I HAVE PAID` changes the status to `payment_submitted` and notifies the configured admin.
4. Only the configured numeric admin ID can start the account form or reject the payment.
5. The bot collects the IPTV username, password, service URL, and application from the admin in four private-chat steps.
6. The bot shows the admin a formatted preview. The order remains `payment_submitted` until the admin selects `CONFIRM, MARK PAID & SEND`.
7. On confirmation, the bot generates a unique five-character client ID and calculates the expiry date from the subscription duration.
8. The order changes to `paid`, and the customer receives both the payment confirmation and formatted active-account information.
9. After successful delivery, the bot removes the temporary admin prompts and credential replies on a best-effort basis, leaving the final completion confirmation.
10. `/myorders` lists the customer's recent orders.

Telegram provides a language code, not a dependable country field. If that locale contains an explicit region (for example, `en-US`), the bot uses it; otherwise the account message says `Not provided by Telegram`.

## Security

- Keep the Telegram bot token, webhook secret, `MONGODB_URI`, and payment credentials out of the static website and Git.
- Put local secrets only in `PaymentBot/.env`, which is ignored by Git.
- Put production secrets only in Render's environment settings.
- Revoke any bot token that has appeared in a screenshot or tracked example file before testing.

## Verification

```bash
cd PaymentBot
npm run build
npm test
npm audit --omit=dev
```
