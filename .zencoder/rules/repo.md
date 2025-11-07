---
description: Repository Information Overview
alwaysApply: true
---

# Shjra Maps Store - Repository Information

## Summary

Shjra Maps Store is a Node.js/Express web application designed as a e-commerce platform for FiveM map mods. The application features Discord OAuth2 authentication, session-based user management, and an admin-controlled product catalog system. Server-side Discord webhook integration logs all user activities and product changes for moderation purposes. The frontend is built with vanilla HTML5, CSS3, and JavaScript, serving static files from the Express server.

## Structure

```
sito/
├── server.js              # Main Express server & API endpoints
├── script.js              # Frontend client-side logic
├── style.css              # Main stylesheet
├── index.html             # Main landing page
├── products.json          # Product database
├── package.json           # Node.js dependencies
├── .env                   # Environment configuration
├── SETUP.md               # Setup and installation guide
└── [test files]           # Test HTML pages
```

## Language & Runtime

**Language**: JavaScript (Node.js)  
**Node.js Version**: Not explicitly specified (compatible with npm ecosystem)  
**Runtime**: Node.js with Express framework  
**Build System**: npm scripts  
**Package Manager**: npm

## Dependencies

**Main Dependencies**:
- **express**: ^4.18.2 - Web application framework and HTTP server
- **axios**: ^1.6.2 - HTTP client for Discord API calls
- **dotenv**: ^16.3.1 - Environment variable configuration management
- **cors**: ^2.8.5 - Cross-Origin Resource Sharing middleware
- **express-session**: ^1.17.3 - Session management for authenticated users
- **cookie-parser**: ^1.4.6 - Cookie parsing middleware

**Development Dependencies**:
- **nodemon**: ^3.0.1 - Auto-reload development server

## Build & Installation

```bash
npm install
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Main Configuration

**Entry Point**: `server.js`  
**Port**: 3000 (configurable via `PORT` environment variable)  
**Session Secret**: 'fivem-maps-secret' (hardcoded)  
**Static Files**: Root directory (HTML, CSS, JS served directly)  
**Database**: `products.json` (JSON file storage)

## Environment Variables

**Required Configuration** (.env):
- `DISCORD_CLIENT_ID` - Discord OAuth2 application ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth2 secret key
- `DISCORD_REDIRECT_URI` - OAuth2 callback URL
- `WEBHOOK_URL` - Discord webhook for login events
- `PRODUCTS_WEBHOOK_URL` - Discord webhook for product changes
- `PORT` - Server port (default: 3000)

## Core API Endpoints

**Authentication**:
- `GET /auth/discord` - Initiates Discord OAuth2 login flow
- `GET /auth/discord/callback` - OAuth2 callback handler
- `GET /api/user` - Retrieve current user session data
- `POST /api/logout` - Destroy user session

**Products**:
- `GET /api/products` - Retrieve all products
- `POST /api/products` - Create new product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

**Admin Authorization**: Restricted by Discord user ID (1100354997738274858)

## Frontend Files

**HTML Pages**: `index.html`, `page.html`, `full.html`, `check.html`, `test-page.html`, `test.html`  
**Stylesheet**: `style.css` (41.12 KB)  
**Client Script**: `script.js` (17.64 KB) - Handles UI interactions, API calls, product management  
**Data**: `products.json` - Product catalog with pricing, descriptions, and metadata

## Features

- Discord OAuth2 single sign-on authentication
- Session-based user state management
- Admin-controlled product catalog CRUD operations
- Discord webhook logging for login events and product modifications
- Responsive web interface with product display
- Dynamic UI components that show/hide based on authentication state

## Security Notes

- Client secret is stored in `.env` and not exposed to frontend
- Admin functions restricted by hardcoded Discord user ID
- Session cookies configured with `secure: false` (suitable for development, should be `true` in production)
- Session data stored server-side
