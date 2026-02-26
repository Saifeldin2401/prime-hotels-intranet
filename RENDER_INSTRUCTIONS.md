# Render Deployment Fix Instructions

The automated fixes for the deployment are blocked because the Render service is configured with manual settings that override the code repository's configuration.

**To fix the deployment, you must manually update the settings in the Render Dashboard.**

## Step 1: Go to Render Dashboard
1. Open your Render Dashboard.
2. Select the service: **prime-hotels-intranet**.
3. Go to **Settings**.

## Step 2: Update Build & Start Commands
Scroll down to the **Build & Deploy** section and update the following fields:

| Setting | New Value | Reason |
| :--- | :--- | :--- |
| **Build Command** | `bun install && bun run build` | Ensures dependencies are installed AND the app is built. The current setting just installs. |
| **Start Command** | `bun run preview --port $PORT --host` | Starts the production server correctly. The default `yarn start` is failing. |

## Step 3: Verify Environment Variables
Ensure the following environment variable is set in the **Environment** tab:

- **Key**: `SHARP_IGNORE_GLOBAL_LIBVIPS`
- **Value**: `1`

*(This was likely added automatically, but please double-check. It is required to fix the build error).*

## Step 4: Save & Deploy
1. Click **Save Changes**.
2. This should trigger a new deployment automatically. If not, click **Manual Deploy** > **Deploy latest commit**.

---

### Why is this necessary?
Your Render service was created with hardcoded commands (`bun install` and `yarn start`). These settings take precedence over the `render.yaml` file and `package.json` scripts we added. Manually updating them is the only way to apply the fix.
