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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shjra-maps';
let db = null;

async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    
    await client.connect();
    db = client.db('shjra-maps');
    
    const productsCollection = db.collection('products');
    await productsCollection.createIndex({ id: 1 });
    
    console.log('MongoDB connected successfully');
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
    console.error('Error loading products:', error);
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
    console.error('Error saving products:', error);
  }
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || process.env.KOYEB === 'true';
const DISCORD_REDIRECT_URI = isProduction 
  ? (process.env.DISCORD_REDIRECT_URI_PROD || 'https://shjra-maps.onrender.com/auth/discord/callback')
  : (process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback');
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

async function fetchWithRetry(fn, maxRetries = 3, delayMs = 5000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const status = error.response?.status;
      if (status === 429 || status === 503 || (typeof error.response?.data === 'string' && error.response.data.includes('1015'))) {
        const waitTime = delayMs * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms due to status ${status}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}

app.get('/auth/discord/callback', async (req, res) => {
  console.log('=== CALLBACK STARTED ===');
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
      timeout: 15000
    };

    console.log('Attempting to fetch token...');
    const tokenResponse = await fetchWithRetry(
      () => axios.post('https://discord.com/api/oauth2/token', params, axiosConfig),
      5,
      10000
    );
    console.log('Token response status:', tokenResponse.status);
    console.log('Token fetched successfully');

    const accessToken = tokenResponse.data.access_token;
    console.log('Access token obtained');

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
        timeout: 15000
      }),
      5,
      10000
    );

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

    // Skip webhook during callback to avoid rate limiting
    // Webhook will be sent separately after successful authentication
    if (WEBHOOK_URL && false) {
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
    
    console.error('=== ERROR IN CALLBACK ===');
    console.error('Error status:', errorStatus);
    console.error('Error data:', JSON.stringify(errorData, null, 2));
    console.error('Full error:', error.toString());
    
    if (errorStatus === 429 || (typeof errorData === 'string' && errorData.includes('1015'))) {
      console.error('Discord rate limited (429/1015) - IP is blocked by Cloudflare');
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
      console.error('Discord server error:', errorStatus);
      return res.redirect('/?error=Discord service temporarily unavailable');
    }
    
    console.error('Error in callback:', errorData);
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

app.get('/api/products', async (req, res) => {
  const products = await loadProducts();
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
  try {
    const productsCollection = db.collection('products');
    const newProduct = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date()
    };
    
    await productsCollection.insertOne(newProduct);
    await logProductAction('add', newProduct, req.user);
    
    res.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
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
    
    await logProductAction('edit', updatedProduct, req.user);
    
    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
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
      await logProductAction('delete', deletedProduct, req.user);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
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
        console.log('Migrating products from JSON file to MongoDB...');
        await productsCollection.insertMany(fileProducts);
        console.log(`Migrated ${fileProducts.length} products`);
      }
    } catch (error) {
      console.error('Error during migration:', error);
    }
  }
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

initializeApp().catch(error => {
  console.error('Failed to initialize app:', error);
  process.exit(1);
});
