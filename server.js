const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

dotenv.config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || process.env.KOYEB === 'true';
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
    return res.json({ success: false, user: null });
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shjra-maps';
let db = null;

async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    
    await client.connect();
    db = client.db('shjra-maps');
    
    const productsCollection = db.collection('products');
    await productsCollection.createIndex({ id: 1 });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function loadProducts() {
  try {
    if (!db) return [];
    const productsCollection = db.collection('products');
    return await productsCollection.find({}).toArray();
  } catch (error) {
    return [];
  }
}

async function saveProducts(productsData) {
  try {
    if (!db) return;
    const productsCollection = db.collection('products');
    await productsCollection.deleteMany({});
    if (productsData.length > 0) {
      await productsCollection.insertMany(productsData);
    }
  } catch (error) {
  }
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = isProduction 
  ? (process.env.DISCORD_REDIRECT_URI_PROD || 'https://shjra-maps.onrender.com/auth/discord/callback')
  : (process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback');
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PRODUCTS_WEBHOOK_URL = process.env.PRODUCTS_WEBHOOK_URL;
const ADMIN_ID = '1100354997738274858';

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.socket.remoteAddress || 
         'Unknown';
}

function formatTimestamp(date = new Date()) {
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Rome'
  };
  return date.toLocaleString('it-IT', options);
}

async function logProductAction(action, product, user, req = null) {
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

    const clientIP = req ? getClientIP(req) : 'API Call';
    const userAgent = req?.headers['user-agent'] || 'Unknown';
    const timestamp = formatTimestamp();

    const fields = [
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
      },
      {
        name: '🌐 Info Connessione',
        value: `IP: \`${clientIP}\``,
        inline: true
      },
      {
        name: '⏰ Timestamp',
        value: `\`${timestamp}\``,
        inline: true
      },
      {
        name: '📱 User-Agent',
        value: `\`${userAgent.substring(0, 80)}${userAgent.length > 80 ? '...' : ''}\``,
        inline: false
      }
    ];

    if (product.badge) {
      fields.push({
        name: '🏷️ Badge',
        value: product.badge,
        inline: true
      });
    }

    if (product.discount) {
      fields.push({
        name: '💸 Sconto',
        value: `${product.discount}%`,
        inline: true
      });
    }

    const embedPayload = {
      embeds: [{
        title: `${actionEmoji} ${actionText}`,
        description: `Prodotto: **${product.name}**`,
        color: color,
        fields: fields,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Shjra Maps - Product Logs'
        }
      }]
    };

    await axios.post(PRODUCTS_WEBHOOK_URL, embedPayload);
  } catch (error) {
  }
}

app.get('/auth/discord', (req, res) => {
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify+email`;
  res.redirect(discordAuthUrl);
});

async function fetchWithRetry(fn, maxRetries = 3, delayMs = 5000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const status = error.response?.status;
      if (status === 429 || status === 503 || (typeof error.response?.data === 'string' && error.response.data.includes('1015'))) {
        const waitTime = delayMs * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}

app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.redirect('/?error=No code provided');
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', DISCORD_CLIENT_ID);
    params.append('client_secret', DISCORD_CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', DISCORD_REDIRECT_URI);

    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    };

    const tokenResponse = await fetchWithRetry(
      () => axios.post('https://discord.com/api/oauth2/token', params, axiosConfig),
      5,
      10000
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await fetchWithRetry(
      () => axios.get('https://discord.com/api/users/@me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive'
        },
        timeout: 10000
      }),
      5,
      10000
    );

    const user = userResponse.data;

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

    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const timestamp = formatTimestamp();

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
            name: "⏰ Timestamp",
            value: `\`${timestamp}\``,
            inline: true
          },
          {
            name: "🌐 Info Connessione",
            value: `IP: \`${clientIP}\``,
            inline: true
          },
          {
            name: "📱 User-Agent",
            value: `\`${userAgent.substring(0, 80)}${userAgent.length > 80 ? '...' : ''}\``,
            inline: false
          }
        ],
        thumbnail: {
          url: avatarUrl
        },
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Shjra Maps - Login Logs'
        }
      }]
    };

    // Send webhook login notification
    if (WEBHOOK_URL) {
      axios.post(WEBHOOK_URL, embedPayload).catch((error) => {
        console.error('Error posting webhook:', error);
      });
    }

    const redirectUrl = `/?login_success=true&username=${encodeURIComponent(userName)}&id=${userId}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Redirecting...</title>
      </head>
      <body>
        <script>
          try {
            localStorage.setItem('token', ${JSON.stringify(token)});
            localStorage.setItem('user', ${JSON.stringify(userData)});
            window.location.href = ${JSON.stringify(redirectUrl)};
          } catch (e) {
            console.error('Error:', e);
            window.location.href = '/';
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    const errorData = error.response?.data || error.message;
    const errorStatus = error.response?.status;
    
    if (errorStatus === 429 || (typeof errorData === 'string' && errorData.includes('1015'))) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Server IP Blocked</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
            h1 { color: #d32f2f; margin-top: 0; }
            .error-code { background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 15px 0; font-family: monospace; color: #c62828; }
            ol { line-height: 1.8; }
            a { color: #1976d2; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .status { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔒 Authentication Failed</h1>
            <p>The server IP has been blocked by Cloudflare.</p>
            <div class="error-code">Error: Cloudflare 1015 (Access Denied)</div>
            
            <div class="status">
              <strong>⚠️ This is a hosting issue, not your fault!</strong><br>
              The Render server IP is temporarily blocked by Cloudflare's security system.
            </div>
            
            <h2>How to Fix:</h2>
            <ol>
              <li>Go to <strong><a href="https://dashboard.render.com" target="_blank">Render Dashboard</a></strong></li>
              <li>Click on your <strong>"Maps"</strong> service</li>
              <li>Go to <strong>Settings</strong> tab</li>
              <li><strong>Contact Render Support</strong> (bottom of page) with this message:<br>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">"My app cannot authenticate with Discord API. I'm getting Cloudflare error 1015 (IP blocked). Please either: 1) Change my server IP, or 2) Upgrade me to a dedicated IP"</pre>
              </li>
            </ol>
            
            <h2>Alternative:</h2>
            <p>Wait <strong>24 hours</strong> - Cloudflare usually automatically unblocks IPs after a day.</p>
            
            <p style="margin-top: 30px; text-align: center;">
              <a href="/">← Back to Home</a>
            </p>
          </div>
        </body>
        </html>
      `);
    }
    
    if (errorStatus >= 500) {
      return res.redirect('/?error=Discord service temporarily unavailable');
    }
    
    res.redirect('/?error=Authentication failed');
  }
});

app.get('/api/user', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.json({ success: false, user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
    res.json({ success: false, user: null });
  }
});

app.get('/api/products', async (req, res) => {
  const products = await loadProducts();
  res.json({ success: true, products });
});

app.get('/api/products/filters', async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    
    const allProducts = await productsCollection.find({}).toArray();
    
    const types = [...new Set(allProducts.map(p => p.type).filter(Boolean))];
    const badges = [...new Set(allProducts.map(p => p.badge).filter(Boolean))];
    const prices = allProducts.map(p => p.price).filter(p => !isNaN(p));
    
    const minPrice = Math.min(...prices, 0);
    const maxPrice = Math.max(...prices, 1000);
    
    res.json({
      success: true,
      filters: {
        types: types.sort(),
        badges: badges.sort(),
        priceRange: {
          min: Math.floor(minPrice),
          max: Math.ceil(maxPrice)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch filters' });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const {
      q = '',
      type = '',
      minPrice = 0,
      maxPrice = 999999,
      badge = '',
      discountOnly = false,
      sort = 'name',
      page = 1,
      limit = 20
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const queryLimit = Math.min(parseInt(limit), 100);

    let filter = {
      price: {
        $gte: parseFloat(minPrice),
        $lte: parseFloat(maxPrice)
      }
    };

    if (q && q.trim()) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { type: { $regex: q, $options: 'i' } }
      ];
    }

    if (type && type.trim()) {
      filter.type = type;
    }

    if (badge && badge.trim()) {
      filter.badge = badge;
    }

    if (discountOnly === 'true' || discountOnly === true) {
      filter.discount = { $gt: 0 };
    }

    let sortObj = {};
    switch(sort) {
      case 'price-asc':
        sortObj = { price: 1 };
        break;
      case 'price-desc':
        sortObj = { price: -1 };
        break;
      case 'discount':
        sortObj = { discount: -1, price: 1 };
        break;
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'name':
      default:
        sortObj = { name: 1 };
        break;
    }

    const total = await productsCollection.countDocuments(filter);
    const products = await productsCollection
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(queryLimit)
      .toArray();

    const totalPages = Math.ceil(total / queryLimit);

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: queryLimit,
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
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
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

app.post('/api/products', checkAdmin, async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const newProduct = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date()
    };
    
    await productsCollection.insertOne(newProduct);
    await logProductAction('add', newProduct, req.user, req);
    
    res.json({ success: true, product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', checkAdmin, async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const productId = parseInt(req.params.id);
    
    const product = await productsCollection.findOne({ id: productId });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const updatedProduct = { ...product, ...req.body };
    await productsCollection.updateOne({ id: productId }, { $set: updatedProduct });
    
    await logProductAction('edit', updatedProduct, req.user, req);
    
    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', checkAdmin, async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const productId = parseInt(req.params.id);
    
    const deletedProduct = await productsCollection.findOne({ id: productId });
    await productsCollection.deleteOne({ id: productId });
    
    if (deletedProduct) {
      await logProductAction('delete', deletedProduct, req.user, req);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

app.patch('/api/products/:id/badge', checkAdmin, async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const productId = parseInt(req.params.id);
    const { badge, discount } = req.body;
    
    const updateData = {};
    if (badge !== undefined) updateData.badge = badge || null;
    if (discount !== undefined) updateData.discount = discount || 0;
    
    const result = await productsCollection.updateOne(
      { id: productId },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update badge' });
  }
});

app.get('/api/admin/analytics', checkAdmin, async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const totalProducts = await productsCollection.countDocuments();
    const productsWithDiscount = await productsCollection.countDocuments({ discount: { $gt: 0 } });
    const avgPrice = await productsCollection.aggregate([
      { $group: { _id: null, avg: { $avg: '$price' } } }
    ]).toArray();
    
    res.json({
      success: true,
      analytics: {
        totalProducts,
        productsWithDiscount,
        averagePrice: avgPrice[0]?.avg || 0,
        serverTime: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Analytics failed' });
  }
});

async function initializeApp() {
  await connectDB();
  
  const productsFile = path.join(__dirname, 'products.json');
  if (fs.existsSync(productsFile)) {
    try {
      const fileProducts = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
      const productsCollection = db.collection('products');
      const existingCount = await productsCollection.countDocuments();
      
      if (existingCount === 0 && fileProducts.length > 0) {
        await productsCollection.insertMany(fileProducts);
      }
    } catch (error) {
    }
  }
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
  });
}

initializeApp().catch(error => {
  process.exit(1);
});
