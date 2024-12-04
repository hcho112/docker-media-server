# Media Server Setup

A Docker-based media server setup with Sonarr, Radarr, Jackett, and qBittorrent.

## Prerequisites

- Docker
- Docker Compose
- Node.js 18+ (for middleware)
- Sufficient storage space for media

## Setup

1. Copy `.env.example` to `.env` and adjust values
2. Create necessary directories:
   ```bash
   mkdir -p config/{qbittorrent,jackett,sonarr,radarr}
   ```
3. Start the services:
   ```bash
   docker-compose up -d
   ```

## Services

- qBittorrent: http://localhost:8080
- Jackett: http://localhost:9117
- Sonarr: http://localhost:8989

## Middleware

The Node.js middleware provides additional functionality for managing media files.

To start the middleware: 