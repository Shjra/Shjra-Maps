const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

app.use(express.static(path.join(__dirname)));
app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'fivem-maps-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
}));

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
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
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
            value: `${user.username}#${user.discriminator}`,
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

    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params);

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

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

    req.session.user = {
      id: userId,
      username: userName,
      discriminator: userDiscriminator,
      avatar: avatarUrl,
      banner: bannerUrl,
      accessToken: accessToken
    };

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

    await axios.post(WEBHOOK_URL, embedPayload);

    res.redirect(`/?login_success=true&username=${encodeURIComponent(userName)}&id=${userId}`);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.redirect('/?error=Authentication failed');
  }
});

app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json({
      success: true,
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        discriminator: req.session.user.discriminator,
        avatar: req.session.user.avatar,
        banner: req.session.user.banner
      }
    });
  } else {
    res.json({ success: false, user: null });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/products', (req, res) => {
  const products = loadProducts();
  res.json({ success: true, products });
});

app.post('/api/products', async (req, res) => {
  if (!req.session.user || req.session.user.id !== ADMIN_ID) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  const products = loadProducts();
  const newProduct = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date()
  };
  
  products.push(newProduct);
  saveProducts(products);
  
  await logProductAction('add', newProduct, req.session.user);
  
  res.json({ success: true, product: newProduct });
});

app.put('/api/products/:id', async (req, res) => {
  if (!req.session.user || req.session.user.id !== ADMIN_ID) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  let products = loadProducts();
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  products[index] = { ...products[index], ...req.body };
  saveProducts(products);
  
  await logProductAction('edit', products[index], req.session.user);
  
  res.json({ success: true, product: products[index] });
});

app.delete('/api/products/:id', async (req, res) => {
  if (!req.session.user || req.session.user.id !== ADMIN_ID) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  let products = loadProducts();
  const deletedProduct = products.find(p => p.id === parseInt(req.params.id));
  products = products.filter(p => p.id !== parseInt(req.params.id));
  saveProducts(products);
  
  if (deletedProduct) {
    await logProductAction('delete', deletedProduct, req.session.user);
  }
  
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
