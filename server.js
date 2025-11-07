const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const ORIGIN = isProduction 
  ? process.env.DISCORD_REDIRECT_URI_PROD.split('/auth')[0]
  : 'http://localhost:3000';

const JWT_SECRET = process.env.JWT_SECRET || 'fivem-maps-jwt-secret-key-change-in-production';

app.use(express.static(path.join(__dirname)));
app.use(cors({
  origin: ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.json({ success: false, user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.json({ success: false, user: null });
  }
}

const PRODUCTS_FILE = path.join(__dirname, 'products.json');

function loadProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
  return [];
}

function saveProducts(productsData) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(productsData, null, 2));
  } catch (error) {
    console.error('Error saving products:', error);
  }
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://shjra-maps.onrender.com/auth/discord/callback';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PRODUCTS_WEBHOOK_URL = process.env.PRODUCTS_WEBHOOK_URL;
const ADMIN_ID = '1100354997738274858';

async function logProductAction(action, product, user) {
  try {
    const actionEmoji = {
      'add': '✅',
      'edit': '✏️',
      'delete': '🗑️'
    }[action] || '📦';

    const actionText = {
      'add': 'Prodotto Aggiunto',
      'edit': 'Prodotto Modificato',
      'delete': 'Prodotto Eliminato'
    }[action] || 'Azione Prodotto';

    const color = {
      'add': 0x00ff00,
      'edit': 0xffa500,
      'delete': 0xff0000
    }[action] || 0x7289da;

    const embedPayload = {
      embeds: [{
        title: `${actionEmoji} ${actionText}`,
        description: `Prodotto: **${product.name}**`,
        color: color,
        fields: [
          {
            name: '👤 Utente',
            value: user.discriminator ? `${user.username}#${user.discriminator}` : user.username,
            inline: true
          },
          {
            name: '🆔 ID Prodotto',
            value: product.id.toString(),
            inline: true
          },
          {
            name: '💰 Prezzo',
            value: `€${product.price}`,
            inline: true
          },
          {
            name: '📝 Tipo',
            value: product.type || 'N/A',
            inline: true
          },
          {
            name: '📄 Descrizione',
            value: product.description.substring(0, 100) + (product.description.length > 100 ? '...' : ''),
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Shjra Maps - Product Logs'
        }
      }]
    };

    await axios.post(PRODUCTS_WEBHOOK_URL, embedPayload);
  } catch (error) {
    console.error('Error logging product action:', error);
  }
}

app.get('/auth/discord', (req, res) => {
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify+email`;
  res.redirect(discordAuthUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
  console.log('Callback reached, code:', req.query.code);
  const code = req.query.code;

  if (!code) {
    console.log('No code provided');
    return res.redirect('/?error=No code provided');
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', DISCORD_CLIENT_ID);
    params.append('client_secret', DISCORD_CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', DISCORD_REDIRECT_URI);

    console.log('Token request params:', {
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI
    });

    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params);
    console.log('Token response status:', tokenResponse.status);

    const accessToken = tokenResponse.data.access_token;
    console.log('Access token obtained');

    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const user = userResponse.data;
    console.log('User data:', { id: user.id, username: user.username });

    const userId = user.id;
    const userName = user.username;
    const userDiscriminator = user.discriminator;

    const avatar = user.avatar;
    const avatarUrl = avatar
      ? `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(userDiscriminator) % 5)}.png`;

    let bannerUrl = null;
    if (user.banner) {
      const isGif = user.banner.startsWith('a_');
      bannerUrl = `https://cdn.discordapp.com/banners/${userId}/${user.banner}.${isGif ? 'gif' : 'png'}?size=600`;
    } else if (user.banner_color) {
      bannerUrl = user.banner_color;
    }

    const userData = {
      id: userId,
      username: userName,
      discriminator: userDiscriminator,
      avatar: avatarUrl,
      banner: bannerUrl
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });

    console.log('JWT token generated for user:', userId);
    console.log('Token length:', token.length);

    const now = new Date();
    const formattedDate = now.toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const embedPayload = {
      embeds: [{
        title: "🔐 Nuovo Login",
        description: "Un utente ha effettuato il login",
        color: 0x7289DA,
        fields: [
          {
            name: "👤 Username",
            value: `${userName}#${userDiscriminator}`,
            inline: true
          },
          {
            name: "🆔 Discord ID",
            value: userId,
            inline: true
          },
          {
            name: "📅 Data e Ora",
            value: formattedDate,
            inline: false
          }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    axios.post(WEBHOOK_URL, embedPayload).then(() => {
      console.log('Webhook sent');
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Redirecting...</title>
        </head>
        <body>
          <script>
            localStorage.setItem('token', '${token}');
            localStorage.setItem('user', JSON.stringify({
              id: '${userId}',
              username: '${userName}',
              discriminator: '${userDiscriminator}',
              avatar: '${avatarUrl}',
              banner: '${bannerUrl}'
            }));
            window.location.href = '/?login_success=true&username=${encodeURIComponent(userName)}&id=${userId}';
          </script>
        </body>
        </html>
      `);
    }).catch((error) => {
      console.error('Error posting webhook:', error);
      res.redirect('/?error=Webhook failed');
    });
  } catch (error) {
    console.error('Error in callback:', error.response?.data || error.message);
    res.redirect('/?error=Authentication failed');
  }
});

app.get('/api/user', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.json({ success: false, user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified for user:', decoded.id);
    res.json({
      success: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        discriminator: decoded.discriminator,
        avatar: decoded.avatar,
        banner: decoded.banner
      }
    });
  } catch (error) {
    console.error('Token verification failed:', error.message);
    res.json({ success: false, user: null });
  }
});

app.get('/api/products', (req, res) => {
  const products = loadProducts();
  res.json({ success: true, products });
});

function checkAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id !== ADMIN_ID) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

app.post('/api/products', checkAdmin, async (req, res) => {
  const products = loadProducts();
  const newProduct = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date()
  };
  
  products.push(newProduct);
  saveProducts(products);
  
  await logProductAction('add', newProduct, req.user);
  
  res.json({ success: true, product: newProduct });
});

app.put('/api/products/:id', checkAdmin, async (req, res) => {
  let products = loadProducts();
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  products[index] = { ...products[index], ...req.body };
  saveProducts(products);
  
  await logProductAction('edit', products[index], req.user);
  
  res.json({ success: true, product: products[index] });
});

app.delete('/api/products/:id', checkAdmin, async (req, res) => {
  let products = loadProducts();
  const deletedProduct = products.find(p => p.id === parseInt(req.params.id));
  products = products.filter(p => p.id !== parseInt(req.params.id));
  saveProducts(products);
  
  if (deletedProduct) {
    await logProductAction('delete', deletedProduct, req.user);
  }
  
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
