# Deploying Neta Khoj to Railway

This guide will help you host your application on [Railway](https://railway.app), a modern hosting platform that supports Node.js, WebSockets, and Puppeteer out of the box.

## Prerequisites

1.  A [GitHub](https://github.com) account.
2.  A [Railway](https://railway.app) account (login with GitHub).
3.  This project pushed to a GitHub repository.

## One-Click Deployment

The easiest way to deploy is to use the button below. It will clone this repository to your GitHub and deploy it to Railway.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

*Note: You will need to select your repository after clicking the button.*

## Manual Deployment Steps

1.  **Login to Railway**: Go to [railway.app](https://railway.app) and log in.
2.  **New Project**: Click "New Project" > "Deploy from GitHub repo".
3.  **Select Repository**: Choose your `fixKaroWeb` repository.
4.  **Deploy**: Railway will automatically detect the `railway.json` file and start building.

## Configuration (Environment Variables)

Once the project is created, go to the **Variables** tab in your Railway project dashboard and add the following:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `ADMIN_TOKEN` | `your-secret-password` | **Required**. Password for admin actions. |
| `NODE_ENV` | `production` | Optimizes the app for performance. |
| `LOG_TO_FILE` | `false` | Railway captures console logs automatically. |
| `MAX_BROWSERS` | `3` | Limit Puppeteer instances to save memory. |
| `MAX_WS_CONNECTIONS_PER_IP` | `10` | WebSocket rate limiting. |

### Domain Setup

1.  Go to the **Settings** tab in Railway.
2.  Under **Networking**, click "Generate Domain".
3.  You will get a URL like `fixkaro-web-production.up.railway.app`.
4.  **Important**: Copy this URL.
5.  Go back to **Variables** and add:
    *   `ALLOWED_ORIGINS`: `https://your-generated-url.up.railway.app` (Replace with your actual URL).

## Troubleshooting

-   **Build Failed?** Check the "Build Logs". This project uses `Nixpacks` to install Chromium for Puppeteer. Ensure `railway.json` is present in your repo.
-   **App Crashing?** Check "Deploy Logs". If you see memory errors, try reducing `MAX_BROWSERS` to `1`.
-   **WebSockets not connecting?** Ensure you are using `wss://` (Secure WebSocket) and that your `ALLOWED_ORIGINS` matches your domain exactly.
