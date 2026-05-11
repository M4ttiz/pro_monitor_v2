# pro_monitor_v2
# Pro Monitor — Initial System Prompt / Cursor Composite Rules
> Versione 1.1 — Aggiornato dopo review architetturale
> Usare come `.cursorrules` o come "System Prompt" nelle Composite Rules di Cursor.

---

## 1. Descrizione del Progetto & Obiettivi

**Pro Monitor** è un tool di monitoraggio aziendale professionale per infrastrutture Windows,
ispirato esteticamente a Zabbix e Grafana ma con UX moderna e design dark-theme proprietario.

### Obiettivi primari
- Monitorare in tempo reale 20–100 PC Windows distribuiti su **più sedi collegate via VPN**
- Raccogliere metriche di sistema (CPU, RAM, disco, rete, temperatura, servizi, log eventi)
- Esporre una **web app React** hostata su Ubuntu/Nginx — nessun client da installare
- Vista **IT/Admin** completa e vista **Manager** read-only sullo stesso dominio, separati da ruolo
- Inviare alert critici via **Web Push (browser notifications)** e **webhook** (Slack / Teams / Discord)
- Distribuire l'agent Windows tramite **installer .exe/.msi** cliccabile, senza GPO o Active Directory

### Non obiettivi (fuori scope v1)
- App desktop Electron (rimossa — tutto via browser)
- Distribuzione agent via GPO / Active Directory
- Monitoraggio di PC non Windows
- Alert via email
- Gestione multi-tenant

---

## 2. Stack Tecnologico

### Frontend — React Web App (hostata su Nginx/Ubuntu)
| Componente | Tecnologia | Motivazione |
|---|---|---|
| UI framework | **React 18 + TypeScript** | SPA moderna, ottimo ecosistema |
| Build tool | **Vite** | HMR velocissimo, bundle ottimizzato |
| State management | **Zustand** | Leggero, ideale per real-time state updates |
| Routing | **React Router v6** | Navigazione con route-based auth e RoleGuard |
| Grafici | **Recharts** + **Chart.js** | Recharts per sparklines, Chart.js per storici |
| Styling | **Tailwind CSS** + CSS Variables | Dark theme coerente, design system scalabile |
| Real-time | **Socket.IO client** | WebSocket per push istantaneo dei dati |
| Notifiche | **Web Push API** (browser native) | Notifiche desktop senza Electron |

### Backend — Node.js su Linux Ubuntu
| Componente | Tecnologia | Motivazione |
|---|---|---|
| Runtime | **Node.js 20 LTS + TypeScript** | Eccellente per I/O intensivo e WebSocket |
| Framework | **Fastify v4** | 2-3x più veloce di Express, schema validation nativa |
| WebSocket | **Socket.IO** | Broadcast metriche a tutti i client connessi |
| ORM | **Prisma** | Type-safe, migrazione DB, supporta TimescaleDB |
| Job scheduler | **BullMQ + Redis** | Code per aggregazione, pulizia storico, webhook fan-out |
| Auth | **JWT + refresh token** | Sessioni sicure, ruoli (admin / it_operator / manager) |
| Web Push | **web-push** (npm) | Invio notifiche push ai browser degli utenti IT |
| Webhook dispatcher | Servizio interno custom | Fan-out su Slack, Teams, Discord |

### Database — TimescaleDB su Ubuntu
> **Scelta:** TimescaleDB (estensione PostgreSQL) — unico DB per dati relazionali E serie temporali.
> **Motivazione:** nessun secondo DB da gestire, backup con pg_dump, query SQL standard, ops minime.

| Tipo dato | Soluzione |
|---|---|
| Serie temporali (CPU, RAM, ecc.) | TimescaleDB hypertable (partitioning automatico per tempo) |
| Dati relazionali (PC, utenti, alert, config) | PostgreSQL standard tables via Prisma |
| Cache e code job | **Redis** (usato anche da BullMQ) |

### Web Server — Nginx su Ubuntu
```nginx
# Nginx gestisce:
# 1. Serve la build React come asset statici (SPA)
# 2. Reverse proxy verso Fastify API (/api/*)
# 3. Proxy WebSocket (/socket.io/*)
# 4. Terminazione SSL (Let's Encrypt o cert aziendale)

server {
    listen 443 ssl;
    server_name monitor.tuodominio.it;

    location / {
        root /var/www/pro-monitor;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Agent Windows — PowerShell + Installer .exe
> **Distribuzione:** installer `.exe` cliccabile costruito con **Inno Setup**,
> che installa lo script PowerShell e lo registra come **servizio Windows via NSSM**.
> L'IT lo lancia manualmente su ogni PC (o via condivisione \\server\tools).
> **Nessuna dipendenza da Active Directory o GPO.**

- Raccoglie metriche ogni **15 secondi** (CPU, RAM, disco, rete, temp)
- Log Event Viewer campionati ogni **60 secondi**
- Dati inviati via **HTTPS POST** a `/api/v1/ingest` su Nginx
- Autenticazione tramite **API key per macchina** (generata al primo avvio, salvata nel registro Windows)
- Retry automatico con backoff esponenziale se il server è irraggiungibile
- **Auto-update:** controlla `/api/v1/agent/version` all'avvio e scarica nuovo installer se disponibile

---

## 3. Architettura di Sistema

```
┌─────────────────────────────────────────────────────────┐
│              SEDE A / B / C ... (VPN)                   │
│                                                         │
│  [PC-01] [PC-02] ... [PC-N]                             │
│     |  PowerShell Agent (servizio Windows)              │
│     |  HTTPS POST /api/v1/ingest ogni 15s               │
└─────┼───────────────────────────────────────────────────┘
      | VPN
      v
┌─────────────────────────────────────────────────────────┐
│              SERVER LINUX UBUNTU                        │
│                                                         │
│  [ Nginx :443 ]                                         │
│    |-- /          --> React SPA (static files)          │
│    |-- /api/*     --> Fastify :3001                     │
│    `-- /socket.io --> Socket.IO :3001                   │
│                                                         │
│  [ Fastify (Node.js) ]                                  │
│    |-- POST /api/v1/ingest   (dati agent)               │
│    |-- GET  /api/v1/metrics  (query storiche)           │
│    |-- POST /api/v1/auth/*   (login, refresh)           │
│    `-- WS   /socket.io       (push real-time)           │
│                                                         │
│  [ TimescaleDB + PostgreSQL ]  [ Redis ]                │
└─────────────────────────────────────────────────────────┘
      |
      |--► Browser IT Admin / IT Operator
      |    (dashboard completa + Web Push notifications)
      |
      |--► Browser Manager
      |    (vista read-only, solo KPI aggregati)
      |
      `--► Webhook --> Slack / Teams / Discord
```

---

## 4. Metriche Monitorate (KPI)

### Raccolta ogni 15 secondi
| Metrica | Fonte PowerShell | Soglia Warning | Soglia Critico |
|---|---|---|---|
| CPU % globale | `Get-Counter '\Processor(_Total)\% Processor Time'` | > 80% | > 95% |
| RAM % usata | `Get-CimInstance Win32_OperatingSystem` | > 75% | > 90% |
| Disco % per partizione | `Get-PSDrive -PSProvider FileSystem` | > 80% | > 95% |
| Traffico rete (Mbps) | `Get-NetAdapterStatistics` | Configurabile | Configurabile |
| Temperatura CPU | `Get-CimInstance MSAcpi_ThermalZoneTemperature` | > 80C | > 95C |

### Raccolta ogni 60 secondi
| Metrica | Fonte PowerShell |
|---|---|
| Stato servizi Windows | `Get-Service -Name <lista configurabile per PC>` |
| Log Event Viewer (Error/Critical) | `Get-EventLog -LogName System -EntryType Error,Warning -Newest 20` |
| Uptime sistema | `(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime` |

---

## 5. Ruoli Utente & Permessi

| Ruolo | Cosa vede | Note |
|---|---|---|
| `admin` | Tutto + configurazione soglie, gestione utenti, gestione PC | Max 2-3 persone |
| `it_operator` | Dashboard completa, dettaglio PC, storico metriche, alert | Team IT |
| `manager` | Solo KPI aggregati (CPU media, RAM media, PC attivi, uptime) | Read-only, no dati tecnici |

IT e manager accedono allo **stesso URL** — la UI si adatta automaticamente al ruolo dopo il login.

---

## 6. Sistema di Notifiche

### Web Push (browser notifications)
- Utenti `admin` e `it_operator` possono abilitare le notifiche dal browser
- Il backend usa **`web-push`** con chiavi VAPID per inviare notifiche anche a browser chiusi (service worker attivo)
- Le sottoscrizioni sono salvate in DB per ogni utente/browser
- Alert critici: notifica immediata
- Alert warning: throttle 5 minuti per non spammare

### Webhook
- Configurazione per workspace: URL webhook + tipo (Slack / Teams / Discord)
- Payload adattato al formato nativo di ogni piattaforma (Slack Block Kit, Teams Adaptive Card, Discord Embed)
- Fan-out gestito da BullMQ worker con retry automatico

---

## 7. Guida allo Stile UI

> Basata sul mockup Pro Monitor v1.2 fornito dal cliente.

### Palette colori (CSS Variables — mai hardcode hex nel codice)
```css
:root {
  --bg-primary:    #0f1117;
  --bg-secondary:  #1a1d27;
  --bg-tertiary:   #252836;
  --border-color:  #2d3148;

  --accent-blue:   #3b82f6;
  --accent-green:  #22c55e;
  --accent-orange: #f97316;
  --accent-red:    #ef4444;
  --accent-purple: #a855f7;

  --text-primary:  #f1f5f9;
  --text-secondary:#94a3b8;
  --text-muted:    #475569;
}
```

### Tipografia
```css
--font-mono: 'JetBrains Mono', monospace;  /* Valori numerici, metriche, timestamp */
--font-ui:   'Inter', sans-serif;           /* Label, navigazione, testo UI */
```

### Componenti chiave
- **KPI Card:** bg `--bg-secondary`, bordo sinistro 3px col colore semantico, valore `font-mono` 2.5rem bold, sparkline inline
- **Sidebar:** 220px fissa, item attivo con `--accent-blue` a 10% opacity + bordo sinistro 3px
- **Tabella PC:** righe alternate `--bg-tertiary`, badge stato pill, CPU critica con `--accent-red` a 20% opacity
- **Grafici:** bg `transparent`, griglia `--border-color` 50% opacity, tooltip dark
- **Header:** orologio live `HH:MM`, data, nome utente + badge ruolo

### Principi UX
- Refresh dati con transizione `opacity` 200ms — nessun flash
- Valori numerici sempre in `font-mono`
- Colori solo semantici, mai decorativi
- Vista manager: nessun dato tecnico grezzo (no log raw, no nomi processo)

---

## 8. Struttura Cartelle del Repository

```
pro-monitor/
|
|-- apps/
|   `-- web/                          # React SPA unica (ruoli via auth)
|       |-- src/
|       |   |-- components/
|       |   |   |-- cards/            # KpiCard, StatCard, AlertBadge
|       |   |   |-- charts/           # TimeSeriesChart, SparkLine, BarChart
|       |   |   |-- layout/           # Sidebar, Header, PageWrapper, RoleGuard
|       |   |   `-- tables/           # PcStatusTable, LogViewer, AlertTable
|       |   |-- pages/
|       |   |   |-- Dashboard.tsx
|       |   |   |-- PcDetail.tsx      # Solo IT
|       |   |   |-- Server.tsx
|       |   |   |-- Rete.tsx
|       |   |   |-- Incidenti.tsx
|       |   |   |-- Reporting.tsx
|       |   |   |-- Impostazioni.tsx  # Solo admin
|       |   |   `-- Login.tsx
|       |   |-- stores/               # useMetricsStore, useAlertStore, useAuthStore
|       |   |-- hooks/                # useSocket, useMetrics, useWebPush
|       |   |-- lib/                  # apiClient.ts, socketClient.ts, formatters.ts
|       |   |-- styles/               # globals.css, variables.css
|       |   `-- sw.ts                 # Service Worker per Web Push
|       `-- vite.config.ts
|
|-- packages/
|   `-- shared/                       # Tipi TypeScript condivisi
|       `-- src/
|           |-- types.ts              # MetricSnapshot, Alert, Pc, User, Role...
|           `-- constants.ts          # Soglie default, intervalli, nomi servizi default
|
|-- server/                           # Backend Fastify
|   |-- src/
|   |   |-- routes/
|   |   |   |-- ingest.ts             # POST /api/v1/ingest
|   |   |   |-- metrics.ts            # GET  /api/v1/metrics
|   |   |   |-- pcs.ts
|   |   |   |-- alerts.ts
|   |   |   |-- auth.ts
|   |   |   |-- webhooks.ts
|   |   |   |-- webpush.ts
|   |   |   `-- agent.ts              # GET /api/v1/agent/version
|   |   |-- services/
|   |   |   |-- MetricService.ts
|   |   |   |-- AlertService.ts
|   |   |   |-- WebhookDispatcher.ts
|   |   |   `-- WebPushService.ts
|   |   |-- jobs/                     # BullMQ workers
|   |   |   |-- aggregation.ts
|   |   |   |-- cleanup.ts
|   |   |   `-- webhookFanout.ts
|   |   |-- socket/
|   |   |   `-- index.ts
|   |   `-- index.ts                  # Entry point Fastify
|   |-- prisma/
|   |   |-- schema.prisma
|   |   `-- migrations/
|   `-- package.json
|
|-- agent/                            # Agent PowerShell per Windows
|   |-- ProMonitorAgent.ps1
|   |-- config.json.template
|   |-- install.ps1
|   |-- uninstall.ps1
|   `-- installer/
|       |-- setup.iss                 # Script Inno Setup per .exe
|       `-- build-installer.ps1
|
|-- infra/                            # Config server Ubuntu
|   |-- docker-compose.yml            # TimescaleDB + Redis
|   |-- nginx.conf
|   |-- nginx-ssl.conf
|   `-- setup.sh                      # Bootstrap completo Ubuntu
|
|-- docs/
|   `-- initial.md
|
`-- package.json                      # Monorepo root (pnpm workspaces + Turborepo)
```

---

## 9. Prime 3 Task Prioritarie (Milestone 0)

### TASK 1 — Scaffolding monorepo + ambiente locale
**Obiettivo:** repository funzionante con tutti i package linkati.

Criteri di completamento:
- [ ] `pnpm dev` lancia Vite (React) e Fastify in locale simultaneamente
- [ ] `docker-compose up` avvia TimescaleDB + Redis senza errori
- [ ] Types in `packages/shared` importabili da `apps/web` e `server`
- [ ] `GET /api/health` risponde `{ status: "ok", version: "0.1.0" }`
- [ ] Login page visibile con CSS variables del design system applicate

---

### TASK 2 — Pipeline di ingestione dati end-to-end
**Obiettivo:** flusso Agent -> DB -> Socket -> Browser funzionante con dati reali.

Steps:
1. Schema Prisma: `Pc`, `MetricSnapshot` (hypertable), `Alert`, `User`
2. `POST /api/v1/ingest` con validazione Fastify + salvataggio TimescaleDB
3. Broadcast Socket.IO su ogni nuova metrica ricevuta
4. `ProMonitorAgent.ps1` v1: CPU + RAM + disco, HTTP POST ogni 15s
5. Test su PC Windows reale: dati visibili in DB e in console browser

Criteri di completamento:
- [ ] Agent gira 10 minuti senza errori su un PC Windows reale
- [ ] `SELECT count(*) FROM metric_snapshots` cresce nel tempo
- [ ] Browser riceve update via Socket.IO (loggati in console)
- [ ] Alert generato automaticamente se CPU supera soglia durante test

---

### TASK 3 — Dashboard UI con KPI live e autenticazione
**Obiettivo:** dashboard con dati reali, login funzionante, viste separate per ruolo.

Steps:
1. Login + JWT auth + `RoleGuard` (redirect se ruolo insufficiente)
2. Layout: Sidebar + Header con orologio live + area contenuto
3. Componente `KpiCard` con valore real-time, sparkline, colore semantico
4. Store Zustand `useMetricsStore` aggiornato via Socket.IO
5. Tabella `PcStatusTable` con badge stato e highlight rosso per alert

Criteri di completamento:
- [ ] Login funzionante per tutti e 3 i ruoli con JWT
- [ ] Manager vede solo KPI aggregati, IT vede tabella completa
- [ ] KPI Card CPU/RAM si aggiornano live senza refresh manuale
- [ ] Badge cambia colore automaticamente al superamento soglia
- [ ] Layout fedele al mockup Pro Monitor v1.2

---

## 10. Convenzioni di Codice

- TypeScript strict mode ovunque — no `any`, no `as unknown`
- Nomenclatura: `camelCase` per variabili/funzioni, `PascalCase` per componenti/tipi, `SCREAMING_SNAKE` per costanti
- Commit: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Nessun secret nel repo: tutto in `.env` (aggiungere `.env.example` con placeholder)
- Error handling esplicito su ogni route Fastify
- Commenti solo dove il "perché" non è ovvio dal codice

---

## 11. Decisioni Architetturali (ADR)

| Decisione | Alternativa scartata | Motivazione |
|---|---|---|
| React Web App over Electron | Electron | Nessuna installazione client, update immediati, accesso da browser in VPN |
| TimescaleDB over InfluxDB | InfluxDB | Unico DB, pg_dump, SQL standard, meno ops |
| Fastify over Express/NestJS | Express | Velocità, schema validation nativa, TypeScript-first |
| PowerShell + NSSM over binario compilato | Go binary, C# | Leggibile, modificabile, distribuibile come .exe con Inno Setup |
| Web Push over email | Email SMTP | Scelta del cliente — meno intrusivo, notifiche native browser |
| pnpm workspaces over npm | npm/yarn | Disk efficiency, strict dependency isolation |
| Nessuna GPO/AD | GPO | Server AD non compatibile — installer .exe manuale |

---

*Fine di initial.md — Pro Monitor v1.1*
*Aggiornare questo file ad ogni decisione architetturale rilevante.*
