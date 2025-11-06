# Setup - Shjra Maps Store

## 1. Installazione dipendenze

```bash
npm install
```

## 2. Configurazione Discord OAuth2

### Ottenere le credenziali Discord:

1. Vai su [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nuova applicazione
3. Vai in "OAuth2" → "General"
4. Copia il **Client ID**
5. Vai in "OAuth2" → "Client Secret"
6. Genera e copia il **Client Secret**
7. Vai in "OAuth2" → "Redirects"
8. Aggiungi il redirect URI: `http://localhost:3000/auth/discord/callback`

### Configurare il file .env:

Modifica il file `.env` e aggiungi:

```
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
WEBHOOK_URL=https://discord.com/api/webhooks/1427349159127814164/0XKnJEJEteH5Ms9FzaYRwSbMuOnr10Bn_wzLwo90fjNc1-FP9i-1EvuBMANlzsbVEnDR
PORT=3000
```

## 3. Avvio del server

```bash
npm start
```

Accedi a `http://localhost:3000` dal browser

## 4. Funzionamento

✅ **Bottoni visibili solo dopo login:**
- Home (sempre visibile)
- Prodotti (visibile solo dopo login)
- Chi Siamo (visibile solo dopo login)
- Contatti (visibile solo dopo login)

✅ **Login Discord:**
- Clicca "Login Discord"
- Autorizza l'applicazione
- Verrai reindirizzato automaticamente

✅ **Webhook Discord:**
- Quando un utente effettua il login, il webhook riceverà:
  - Username Discord
  - ID Discord
  - Data e ora del login (formato italiano)

✅ **Logout:**
- Clicca il pulsante Logout nel profilo utente
- I bottoni spariranno dalla navbar

## Note importanti

- Il webhook è già configurato nel file `.env`
- I dati vengono inviati in formato embed Discord
- La sessione è salvata server-side per sicurezza
- Il Client Secret non deve mai essere esposto nel codice client

