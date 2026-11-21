# Deploying PABLO Fashion Studio on Hostinger Business Hosting (MySQL)

This project is pre-configured to run on **Hostinger Business Hosting** with **Hostinger MySQL** (or MariaDB) and **Node.js 22.x**.

- When `MYSQL_DATABASE` and `MYSQL_USER` are set, the server automatically connects to **Hostinger MySQL** using `mysql2/promise`.
- On first startup, the server automatically creates any missing tables (`CREATE TABLE IF NOT EXISTS ...`) and seeds initial categories, sample portfolio/event items, legal pages, site settings, and the primary admin user using your `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables.
- An explicit SQL schema file is also included at `database/hostinger_mysql_schema.sql` if you prefer importing the schema manually via **phpMyAdmin**.

---

## Step 1: Create Your MySQL Database in Hostinger hPanel

1. Log in to **Hostinger hPanel** and open your hosting plan.
2. Go to **Databases -> Management**.
3. Under **Create a New MySQL Database And Database User**:
   - **Database name**: e.g. `u123456789_pablo`
   - **Username**: e.g. `u123456789_pabloadmin`
   - **Password**: Generate a strong password and save it safely.
4. Click **Create**.
5. Note the exact **MySQL Host** shown in Hostinger hPanel (for Node.js apps running on the same Hostinger server, this is usually `127.0.0.1` or `localhost`; if Hostinger provides a dedicated hostname like `mysql.hostinger.com` or `srvXXX.hstgr.io`, use that exact value).

---

## Step 2: (Optional) Import Schema in phpMyAdmin

The server creates all 9 tables automatically when it boots, so manual import is optional. If you want to verify or pre-create the tables in phpMyAdmin:

1. In hPanel, go to **Databases -> phpMyAdmin** and click **Enter phpMyAdmin** next to your newly created database.
2. Open the **Import** tab.
3. Choose the file `database/hostinger_mysql_schema.sql` from this project.
4. Click **Import** (or **Go**).
5. Confirm all 9 tables are created:
   - `admin_users`
   - `admin_sessions`
   - `categories`
   - `portfolio_items`
   - `events`
   - `event_media`
   - `legal_pages`
   - `site_settings`
   - `enquiries`

---

## Step 3: Set Up the Node.js Web App in Hostinger hPanel

1. Push your latest code (including `package.json`, `server/`, and `database/`) to your GitHub repository, or upload your project ZIP via **File Manager** (excluding `node_modules/`).
2. In Hostinger hPanel, open **Websites → Add Website** (or your domain dashboard) → **Node.js Web App**.
3. Configure the build and entry settings exactly as follows:
   - **Node.js Version**: `22`
   - **Application Type**: `Express`
   - **Build Command**: `npm run build` *(Do not leave this as `none` — `npm run build` compiles both `dist/index.html` and `dist/server.js`.)*
   - **Output Directory**: `none` *(Express serves the built frontend directly from `dist/`.)*
   - **Entry File**: `dist/server.js` *(Or `server.ts` if running via `npm start`.)*

> **Important:** Make sure `storage/media` and `data` directories are writable by your Node.js app so uploaded portfolio photos, event videos, and session secrets persist across rebuilds (uploaded files are stored in `./storage/media`, outside `./dist`).

---

## Step 4: Configure Environment Variables

Add these environment variables in Hostinger's Node.js **Environment Variables** panel (or place a `.env` file in the project root directory):

```env
NODE_ENV=production
PORT=3000
APP_URL="https://yourdomain.com"
CORS_ORIGIN="https://yourdomain.com"

# Hostinger MySQL Credentials (from Step 1)
MYSQL_HOST="127.0.0.1"
MYSQL_PORT=3306
MYSQL_DATABASE="u123456789_pablo"
MYSQL_USER="u123456789_pabloadmin"
MYSQL_PASSWORD="your-mysql-database-password"
MYSQL_SSL="false"

# Persistent Media & Fallback Data Directory
DATA_DIR="./data"
MEDIA_DIR="./storage/media"

# Initial Admin Login (SET THESE BEFORE FIRST START!)
ADMIN_EMAIL="your-studio-email@yourdomain.com"
ADMIN_PASSWORD="choose-a-strong-password"

# Session Signing Secret (generate 32+ random characters)
SESSION_SECRET="replace-with-a-64-char-random-hex-string"
```

### Tips for Hostinger Environment Variables
- **Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before starting the app for the first time**, because the primary admin account is created once when `admin_users` is empty.
- Generate `SESSION_SECRET` locally with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Keep `MYSQL_SSL="false"` when connecting locally on Hostinger (`127.0.0.1` / `localhost`). Set `MYSQL_SSL="true"` only if connecting remotely over TLS.
- `PORT` is often injected automatically by Hostinger (`process.env.PORT`). Leave Hostinger's assigned port if it sets one automatically.

---

## Step 5: Build, Start & Verify

1. Deploy / restart your Node.js application in hPanel.
2. Open `https://yourdomain.com/api/health` in your browser. You should see:
   ```json
   {
     "status": "ok",
     "service": "pablo-fashion-studio",
     "storage": "mysql",
     "timestamp": "..."
   }
   ```
   Confirm `"storage": "mysql"` appears—that verifies Hostinger MySQL is connected and initialized.
3. Visit `https://yourdomain.com` to confirm the public storefront loads cleanly.
4. Visit `https://yourdomain.com/admin` and sign in using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you configured in Step 4.
5. In `/admin`, replace the sample events, portfolio pieces, legal contact placeholders, and studio contact details with your real studio content.

---

## Troubleshooting

- **App falls back to `local-json` instead of `mysql`**: Check that both `MYSQL_DATABASE` and `MYSQL_USER` are set in your production environment variables and restart the Node.js process.
- **`ER_ACCESS_DENIED_ERROR`**: Double-check `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_HOST` (`127.0.0.1` vs `localhost`). Verify the user is linked to the database in hPanel **Databases -> Management**.
- **Admin login cookie doesn't stay signed in**: Ensure your site is accessed over `https://` and `APP_URL` / `CORS_ORIGIN` match your live domain (`https://yourdomain.com`). The server trusts Hostinger's reverse proxy (`trust proxy: 1`) and detects `X-Forwarded-Proto: https` automatically.
- **Uploaded images disappear after redeploy**: Keep `MEDIA_DIR` pointing outside `dist/` (or outside ephemeral deployment folders) and avoid deleting `./storage/media` during updates.
