# Pro Monitor v2 - Deployment Guide

## Prerequisiti

- Ubuntu 20.04+ o equivalente Linux
- Docker >= 20.10
- Docker Compose >= 2.0
- Git
- 4GB RAM minimo
- 10GB spazio libero su disco

## Installazione Veloce

### 1. Installa Docker e Docker Compose

```bash
# Update sistema
sudo apt-get update
sudo apt-get upgrade -y

# Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Aggiungi utente al gruppo docker (opzionale, per non usare sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verifica installazione
docker --version
docker-compose --version
```

### 2. Clone Repository

```bash
git clone https://github.com/M4ttiz/pro_monitor_v2.git
cd pro_monitor_v2
git checkout feature/docker-deployment
```

### 3. Setup Environment

```bash
cp .env.example .env

# Modifica il file .env con i tuoi valori
nano .env

# Valori importanti da modificare:
# - JWT_SECRET: genera una stringa casuale lunga
# - DATABASE_URL: verifica la porta se necessario
# - VITE_API_BASE_URL: URL dell'API (per production)
```

### 4. Prepara lo Script di Deployment

```bash
chmod +x scripts/deploy.sh
```

### 5. Verifica Prerequisiti

```bash
./scripts/deploy.sh check
```

### 6. Build delle Immagini

```bash
./scripts/deploy.sh build
```

### 7. Avvia i Servizi

```bash
./scripts/deploy.sh start
```

### 8. Accedi all'Applicazione

```
Frontend:  http://localhost:3000
Backend:   http://localhost:3001
Health:    http://localhost:3001/health
```

## Comandi Disponibili

### Gestione Servizi

```bash
# Verifica requisiti
./scripts/deploy.sh check

# Build immagini
./scripts/deploy.sh build

# Avvia servizi
./scripts/deploy.sh start

# Ferma servizi
./scripts/deploy.sh stop

# Ricomincia servizi
./scripts/deploy.sh restart

# Vedi stato
./scripts/deploy.sh status
```

### Log e Debugging

```bash
# Tutti i log
./scripts/deploy.sh logs

# Log di un servizio specifico
./scripts/deploy.sh logs backend
./scripts/deploy.sh logs frontend
./scripts/deploy.sh logs postgres
./scripts/deploy.sh logs redis
./scripts/deploy.sh logs nginx
```

### Database

```bash
# Esegui migrazioni Prisma
./scripts/deploy.sh migrate

# Accedi alla shell del database
./scripts/deploy.sh shell-db

# Accedi alla shell del backend
./scripts/deploy.sh shell-backend
```

### Reset

```bash
# ATTENZIONE: Cancella tutti i dati!
./scripts/deploy.sh reset
```

## Configurazione SSL/TLS per Production

### 1. Installa Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
```

### 2. Genera Certificato Let's Encrypt

```bash
sudo certbot certonly --standalone -d monitor.tuodominio.it
```

### 3. Copia i Certificati

```bash
sudo mkdir -p ./infra/ssl
sudo cp /etc/letsencrypt/live/monitor.tuodominio.it/fullchain.pem ./infra/ssl/
sudo cp /etc/letsencrypt/live/monitor.tuodominio.it/privkey.pem ./infra/ssl/
sudo chown -R $USER:$USER ./infra/ssl
```

### 4. Aggiorna Nginx Config

Modifica `infra/nginx.conf` per aggiungere il supporto HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name monitor.tuodominio.it;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # ... resto della configurazione
}

# Redirect HTTP -> HTTPS
server {
    listen 80;
    server_name monitor.tuodominio.it;
    return 301 https://$server_name$request_uri;
}
```

### 5. Restart Nginx

```bash
./scripts/deploy.sh restart
```

## Backup e Restore

### Backup Database

```bash
# Backup database PostgreSQL
docker-compose exec -T postgres pg_dump -U pro_monitor pro_monitor > backup.sql

# Backup con compressione
docker-compose exec -T postgres pg_dump -U pro_monitor pro_monitor | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database

```bash
# Restore da backup
docker-compose exec -T postgres psql -U pro_monitor pro_monitor < backup.sql

# Restore da backup compresso
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U pro_monitor pro_monitor
```

## Backup Automatico

Crea uno script di backup automatico:

```bash
#!/bin/bash
# File: backup.sh

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Backing up database..."
docker-compose exec -T postgres pg_dump -U pro_monitor pro_monitor | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

echo "Backing up Redis..."
docker-compose exec -T redis redis-cli BGSAVE

echo "Backup completed: $BACKUP_DIR/backup_$DATE.sql.gz"
```

Rendi eseguibile e aggiungi a crontab:

```bash
chmod +x backup.sh

# Backup giornaliero alle 2:00 AM
0 2 * * * /path/to/pro_monitor_v2/backup.sh
```

## Monitoring e Health Checks

### Verificare Health dei Servizi

```bash
# Backend health
curl http://localhost:3001/health

# Vedi stato servizi
./scripts/deploy.sh status

# Visualizza log di errori
./scripts/deploy.sh logs | grep -i error
```

### Monitorare Resource Usage

```bash
# CPU e memoria dei container
docker stats

# Dettagli container
docker inspect <container-name>

# Vedi metriche Nginx
curl http://localhost/nginx_status 2>/dev/null || echo "Status page not configured"
```

## Troubleshooting

### Servizi non si avviano

```bash
# Verifica i log
./scripts/deploy.sh logs

# Verifica che le porte non siano occupate
netstat -tlnp | grep -E ':(3000|3001|5432|6379|80|443)'

# Kill il processo che occupa la porta (se necessario)
sudo lsof -ti:3001 | xargs kill -9
```

### Database non si connette

```bash
# Verifica connessione PostgreSQL
./scripts/deploy.sh shell-db

# Esegui migrazioni
./scripts/deploy.sh migrate
```

### Frontend non si carica

```bash
# Verifica i log frontend
./scripts/deploy.sh logs frontend

# Ricostruisci immagine
./scripts/deploy.sh build
./scripts/deploy.sh restart
```

### Socket.IO connection failed

```bash
# Verifica proxy Nginx
./scripts/deploy.sh logs nginx

# Assicurati che WebSocket sia abilitato in nginx.conf
```

## Aggiornamento Applicazione

```bash
# Pull ultimi cambiamenti
git pull origin feature/docker-deployment

# Rebuild e restart
./scripts/deploy.sh build
./scripts/deploy.sh restart

# Oppure in un comando
./scripts/deploy.sh build && ./scripts/deploy.sh restart
```

## Performance Tuning

### Aumenta Memory Limit

Modifica `docker-compose.yml`:

```yaml
services:
  backend:
    mem_limit: 2g
    memswap_limit: 2g
```

### Aumenta Worker Processes Nginx

Modifica `infra/nginx.conf`:

```nginx
worker_processes auto;  # Usa tutti i CPU cores
worker_connections 2048; # Aumenta da 1024
```

### Ottimizzazione Database

Accedi al database e esegui tuning:

```bash
./scripts/deploy.sh shell-db
```

```sql
-- Analizza tabelle
VACUUM ANALYZE;

-- Vedi indici
\di

-- Vedi tabelle
\dt
```

## Security Best Practices

1. **Cambia JWT_SECRET** in produzione
2. **Usa HTTPS** con certificati validi
3. **Limita accesso** alle porte
4. **Backup regolari** dei dati
5. **Update regolari** delle immagini Docker
6. **Monitoraggio** dei log per anomalie
7. **Rate limiting** abilitato in Nginx

## Support

Per problemi:
1. Controlla i log: `./scripts/deploy.sh logs`
2. Verifica i requisiti: `./scripts/deploy.sh check`
3. Prova reset: `./scripts/deploy.sh reset`
4. Apri un issue su GitHub

---

**Last Updated**: 2026-05-11
**Pro Monitor v2** - Deployment Made Easy
