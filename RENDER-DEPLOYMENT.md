# Deploy E-commerce App to Render

This guide walks you through deploying the full-stack `ecommerce-app` (backend + frontend served from `public/`) to Render. It includes PowerShell commands you can run locally, recommended Render settings, environment variables, database setup, and post-deploy checks.

> Assumptions
> - Your project root is the `ecommerce-app` folder.
> - You have a GitHub account and will push this repository to GitHub.
> - You have a Render account (https://dashboard.render.com).

## 1 — Prepare the repo and code

1. Make sure sensitive files are ignored. Check `.gitignore` contains:

```text
node_modules/
dist/
.env
*.db
*.db-journal
.DS_Store
```

2. Build step verification locally (optional but recommended):

```powershell
# from project root
cd C:\Users\asus\Desktop\mine\ecommerce-app
npm install
npx prisma generate
npm run build
# run locally to verify
npm run dev  # uses nodemon server.ts for dev
```

3. Ensure `server.ts` serves the `public/` folder (it already does in this project) and your start script in `package.json` is `node dist/server.js`.

## 2 — Create a Git repo & push to GitHub

```powershell
cd C:\Users\asus\Desktop\mine\ecommerce-app
# init only if not already a repo
git init
git add .
git commit -m "Prepare for Render deployment"
# create repository on GitHub (via web) then:
git remote add origin https://github.com/<your-org-or-user>/ecommerce-app.git
git push -u origin main
```

## 3 — Add a `render.yaml` (optional but handy)

You can use a `render.yaml` (blueprint) to define the service. Example (already added to this repo as `render.yaml`):

```yaml
services:
  - type: web
    name: ecommerce-app
    env: node
    region: oregon
    plan: free
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npx prisma migrate deploy && npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: PAYMENT_API_URL
        value: https://p2-back.onrender.com/transaction/payment/initiate
      - key: PAYMENT_API_KEY
        value: 69ca0c78-4d5d-49fc-8e05-33db8e279356
      - key: PAYMENT_WEBHOOK_URL
        sync: false
      - key: FRONTEND_URL
        sync: false

databases:
  - name: ecommerce-db
    databaseName: ecommerce_db
    user: ecommerce_user
    plan: free
```

> Note: `sync: false` for `DATABASE_URL` or `FRONTEND_URL` means you will supply those in Render's dashboard after you create the database or when ready.

## 4 — Create the Render service (UI method)

1. Open https://dashboard.render.com and sign in.
2. Click "New +" → "Web Service" (or use "Blueprint" and point to `render.yaml`).
3. Choose the GitHub repo and branch.
4. Configure service settings (if not using `render.yaml`):
   - Name: `ecommerce-app`
   - Environment: `Node`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npx prisma migrate deploy && npm start`
   - Health Check Path: `/health`
5. Add environment variables (see next section).
6. Click **Create Web Service** and wait for the build & deploy logs.

## 5 — Add a PostgreSQL database on Render

1. In Render Dashboard click "New +" → "PostgreSQL".
2. Name it `ecommerce-db` (or similar), choose region and plan.
3. After creation, copy the internal `DATABASE_URL` provided by Render.
4. Go back to your web service's Environment tab and set `DATABASE_URL` to that internal URL.

## 6 — Environment variables (required)

Add the following environment variables in your Render Web Service settings (Environment tab):

- NODE_ENV=production
- DATABASE_URL=<from the Render database you created>
- PORT=10000
- JWT_SECRET=<random-string>
- JWT_REFRESH_SECRET=<random-string>
- JWT_EXPIRES_IN=15m
- JWT_REFRESH_EXPIRES_IN=7d
- PAYMENT_API_URL=https://p2-back.onrender.com/transaction/payment/initiate
- PAYMENT_API_KEY=69ca0c78-4d5d-49fc-8e05-33db8e279356
- PAYMENT_WEBHOOK_URL=https://<your-service>.onrender.com/api/webhook/payment
- FRONTEND_URL=https://<your-service>.onrender.com

Important:
- Do NOT commit these secrets to git. Use Render's env vars.
- Use the **internal** `DATABASE_URL` if possible (ensures connectivity within Render).

## 7 — Seed the database (optional)

You can run your seeding script from Render's dashboard shell (or run locally against the Render DB if you prefer):

```powershell
# From your local machine (set DB URL env var temporarily)
$env:DATABASE_URL="<render-database-url>"
npx ts-node src/seed.ts
# OR run create-test-admin to generate an admin API key
$env:DATABASE_URL="<render-database-url>"
npx ts-node create-test-admin.ts
```

Or use Render's web shell:
- Open your service, click **Shell** and run `npm run seed` or `npx ts-node create-test-admin.ts` after `DATABASE_URL` is set in env vars.

## 8 — Redeploy & verify

- If you changed environment variables, click **Manual Deploy** → **Clear build cache & deploy** (or trigger a new push to GitHub).
- Check deploy logs for any `prisma migrate` errors or build errors.
- After a successful deployment, open the app URL (Render provides a public URL).

Verify the following routes work:
- `https://<your-service>.onrender.com/health` → should return `{ status: 'ok' }`
- `https://<your-service>.onrender.com` → should serve the frontend (index page)
- API endpoints: `https://<your-service>.onrender.com/api/products` etc.

## 9 — Payment-specific checks

- Confirm `PAYMENT_API_KEY` in Render matches the admin API key on the payment backend (you created the admin key with `create-test-admin.ts`).
- Confirm `PAYMENT_API_URL` points to the payment backend base URL (in your case `https://p2-back.onrender.com/transaction/payment/initiate`).
- Confirm `PAYMENT_WEBHOOK_URL` is set to `https://<your-service>.onrender.com/api/webhook/payment` and uses HTTPS.

## 10 — Troubleshooting tips

- **TypeScript build errors** (`Cannot find name 'process'`, `Cannot find name 'console'`, etc.):
  - Ensure `@types/node` and `typescript` are in `dependencies`, not `devDependencies` (Render only installs dependencies during build).
  - This has been fixed in `package.json` for this project.
- **Property does not exist on type 'AuthRequest'**:
  - The `AuthRequest` interface needs explicit `body`, `params`, and `headers` declarations.
  - This has been fixed in `src/middleware/auth.middleware.ts`.
- If the container fails on start with DB errors, check `DATABASE_URL` and run `npx prisma migrate deploy` manually in the Render shell to see full errors.
- If static files are missing, ensure `dist/server.js` is built and `server.ts` serves `public/`.
- If you get CORS issues when the frontend (Render) calls the payment backend, ensure the payment backend allows your site's origin.
- For logs: Render dashboard → your service → Logs. Use logs to find 500s and stack traces.

## 11 — Redeploy after code changes

1. Commit & push to GitHub:

```powershell
git add .
git commit -m "Your changes"
git push origin main
```

2. Render will trigger a deploy automatically (or you can manually redeploy from the dashboard).

## 12 — Optional: Use `render.yaml` blueprint

If you want to manage infra with `render.yaml` the file is already in this repo. When creating a new service, choose the Blueprint option and Render will create the web service and database described in `render.yaml`.

## 13 — Security & production notes

- Rotate `JWT_SECRET` and `PAYMENT_API_KEY` if you suspect leakage.
- Set CORS to only your frontend domain in production.
- Use HTTPS for all callback/webhook URLs.
- Monitor logs and enable alerts if possible.

---

### Quick checklist (final)
- [ ] Push repo to GitHub
- [ ] Create Render Web Service (or apply `render.yaml`)
- [ ] Create Render Postgres database
- [ ] Set environment variables in service
- [ ] Seed DB (optional)
- [ ] Deploy & test endpoints

If you want, I can run the commands to push, or walk you step-by-step through the Render UI. The `render.yaml` in your repository also lets you apply the blueprint if you want everything created automatically.