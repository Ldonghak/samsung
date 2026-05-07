# Samsung Disparity Trader Docker Setup

## Overview
This project provides a **full-stack** application consisting of:
- **Frontend**: Vite + React, built into static files and served by **Nginx**.
- **API Server**: Node/Express server exposing stock price, history, and user‑data APIs.

Both components are containerized and orchestrated with **Docker Compose**.

## Prerequisites
- Docker Engine (>= 20.10)
- Docker Compose (v2) – `docker compose` command should be available.

## Quick Start
```bash
# Navigate to the project root (c:\atg\pro\samsung)
cd c:\atg\pro\samsung

# Build and start the containers in the background
docker compose up --build -d
```

The services will be started as follows:
- **Frontend** (`frontend` service) – Nginx listening on **port 8080**. Open `http://localhost:8080` in a browser.
- **API server** (`api` service) – Node.js listening on **port 3001** inside the Docker network (exposed to host as `localhost:3001`). The frontend proxies `/api/*` requests to this service via the `nginx.conf` configuration.

## Stopping the Application
```bash
docker compose down
```
This stops and removes the containers but keeps the built images and any persisted data under `./server/data` (mounted as a volume).

## Development Workflow
If you modify the source code, simply rebuild the containers:
```bash
docker compose up --build -d
```
The `frontend` service will run `npm run build` during the image build, producing updated static assets.

## Project Structure
```
├─ Dockerfile           # Multi‑stage build for the frontend (Node → Nginx)
├─ docker-compose.yml   # Orchestrates `frontend` and `api` services
├─ nginx.conf           # Nginx config that proxies /api/ to the `api` container
├─ server/
│   ├─ Dockerfile       # Simple Node image for the API server
│   └─ ...               # API source code
├─ src/                 # Frontend source (React + Vite)
└─ ...
```

## Troubleshooting
- **Port conflicts**: Ensure ports `8080` (frontend) and `3001` (API) are free on the host.
- **Network issues**: The `frontend` container resolves `api` via Docker's internal DNS (service name `api`). No extra hosts file configuration is required.
- **Logs**: View container logs with `docker compose logs -f <service>` (e.g., `docker compose logs -f frontend`).

---
Enjoy exploring the Samsung Disparity Trader application in Docker!
