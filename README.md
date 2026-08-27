# SyncForge

> A real-time collaborative coding platform built for teams to code, communicate, and create together.

**Developed by Vishu Judiyan**

## 🚀 Features

* Real-time collaborative code editor
* Multi-language code execution
* Collaborative whiteboard with remote cursors
* Audio and video communication using WebRTC
* Real-time chat
* AI-powered coding assistance
* Live user presence and multi-cursor support
* Docker-based isolated code execution

## 🛠 Tech Stack

**Frontend:** React, TypeScript, Vite, Monaco Editor, Yjs, Tailwind CSS

**Backend:** Node.js, Express, WebSocket

**Infrastructure:** Redis, Docker, Turborepo

## 📁 Project Structure

```text
SyncForge/
├── apps/
│   ├── frontend/
│   ├── express-server/
│   ├── websocket-server/
│   └── worker/
├── package.json
└── turbo.json
```

## ⚡ Getting Started

### Install dependencies

```bash
npm install
```

### Start Redis

```bash
docker run -d --name syncforge-redis -p 6379:6379 redis:7
```

### Start the project

```bash
npm run dev
```

## 🐳 Requirements

* Node.js 18+
* npm
* Docker
* Redis

---

Built by **Vishu Judiyan**
