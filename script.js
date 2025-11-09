let isLoggedIn = false;
let currentUser = null;
let token = null;

const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : 
                     typeof webkitAudioContext !== 'undefined' ? new webkitAudioContext() : null;

const ADMIN_ID = '1100354997738274858';
let products = [];
let editingProductId = null;
let productsSyncInterval = null;
let lastProductsHash = null;
let currentProduct = null;

const CartManager = {
  init() {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  },
  
  getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  },
  
  addToCart(product) {
    const cart = this.getCart();
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1, addedAt: new Date().toISOString() });
    }
    
    this.saveCart(cart);
    return cart;
  },
  
  removeFromCart(productId) {
    let cart = this.getCart();
    cart = cart.filter(item => item.id !== productId);
    this.saveCart(cart);
    return cart;
  },
  
  updateQuantity(productId, quantity) {
    let cart = this.getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
      if (quantity <= 0) {
        cart = cart.filter(item => item.id !== productId);
      } else {
        item.quantity = quantity;
      }
    }
    this.saveCart(cart);
    return cart;
  },
  
  clearCart() {
    localStorage.removeItem('cart');
  },
  
  saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
  },
  
  getTotal() {
    return this.getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
};

const WishlistManager = {
  init() {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  },
  
  getWishlist() {
    return JSON.parse(localStorage.getItem('wishlist') || '[]');
  },
  
  addToWishlist(product) {
    let wishlist = this.getWishlist();
    if (!wishlist.find(item => item.id === product.id)) {
      wishlist.push({ ...product, addedAt: new Date().toISOString() });
    }
    this.saveWishlist(wishlist);
    return wishlist;
  },
  
  removeFromWishlist(productId) {
    let wishlist = this.getWishlist();
    wishlist = wishlist.filter(item => item.id !== productId);
    this.saveWishlist(wishlist);
    return wishlist;
  },
  
  isInWishlist(productId) {
    return this.getWishlist().some(item => item.id === productId);
  },
  
  saveWishlist(wishlist) {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistBadge();
  },
  
  clearWishlist() {
    localStorage.removeItem('wishlist');
  }
};

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (badge) {
    const count = CartManager.getCart().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

function updateWishlistBadge() {
  const badge = document.getElementById('wishlist-badge');
  if (badge) {
    const count = WishlistManager.getWishlist().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

const ThemeManager = {
  init() {
    this.applyAutoTheme();
    this.setupAutoThemeInterval();
  },
  
  getTimeBasedTheme() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'dark';
  },
  
  applyAutoTheme() {
    const theme = this.getTimeBasedTheme();
    this.setTheme(theme);
  },
  
  setTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
    if (theme !== 'light') {
      document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('theme-type', theme);
  },
  
  setupAutoThemeInterval() {
    setInterval(() => {
      const newTheme = this.getTimeBasedTheme();
      const currentTheme = document.body.className.match(/theme-(\w+)/)?.[1] || 'light';
      if (newTheme !== currentTheme) {
        this.applyAutoTheme();
      }
    }, 60000);
  },
  
  toggleLightDarkMode() {
    const isLight = document.body.classList.contains('light-mode');
    if (isLight) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('light-mode', 'false');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('light-mode', 'true');
    }
  }
};

function getAuthHeaders() {
  return token ? {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  } : {
    'Content-Type': 'application/json'
  };
}

function playSound(type) {
  if (!audioContext) return;
  
  triggerSoundFeedback();
  
  try {
    const now = audioContext.currentTime;
    
    if (type === 'click') {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.frequency.setValueAtTime(500, now);
      osc.start(now);
      osc.stop(now + 0.05);
    } 
    else if (type === 'copy') {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.frequency.setValueAtTime(650, now);
      osc.start(now);
      osc.stop(now + 0.1);
    } 
    else if (type === 'login') {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.frequency.setValueAtTime(750, now);
      osc.start(now);
      osc.stop(now + 0.15);
    } 
    else if (type === 'success') {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.frequency.setValueAtTime(800, now);
      osc.start(now);
      osc.stop(now + 0.12);
    } 
    else if (type === 'error') {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.frequency.setValueAtTime(300, now);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
  }
}

function triggerSoundFeedback() {
  const pulse = document.createElement('div');
  pulse.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(102, 126, 234, 0.8), rgba(102, 126, 234, 0));
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
    animation: soundPulse 0.6s ease-out forwards;
  `;
  document.body.appendChild(pulse);
  setTimeout(() => pulse.remove(), 600);
}

function copyEmail() {
  const email = 'seansenatore11048@gmail.com';
  navigator.clipboard.writeText(email).then(() => {
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ Copiato!';
    button.style.background = 'linear-gradient(135deg, rgba(0, 255, 0, 0.4), rgba(0, 200, 0, 0.3))';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  });
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return 'Buongiorno!';
    } else if (hour < 18) {
        return 'Buon pomeriggio!';
    } else {
        return 'Buonasera!';
    }
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
        return 'morning';
    } else if (hour >= 12 && hour < 18) {
        return 'afternoon';
    } else {
        return 'evening';
    }
}

function updateBackgroundTheme() {
    const bg = document.querySelector('.gradient-bg');
    const navbar = document.querySelector('.navbar');
    const staffSection = document.getElementById('staff');
    const allSections = document.querySelectorAll('.content-section');
    const timeOfDay = getTimeOfDay();
    
    bg.classList.remove('morning', 'afternoon', 'evening');
    bg.classList.add(timeOfDay);
    
    navbar.classList.remove('morning-theme', 'afternoon-theme', 'evening-theme');
    navbar.classList.add(timeOfDay + '-theme');
    
    allSections.forEach(section => {
        section.classList.remove('morning-theme', 'afternoon-theme', 'evening-theme');
        section.classList.add(timeOfDay + '-theme');
    });
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const greetingMessage = document.getElementById('greeting-message');
    greetingMessage.textContent = getGreeting();
    loadingScreen.style.display = 'flex';
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.display = 'none';
}

function discordLogin() {
    playSound('click');
    window.location.href = '/auth/discord';
}

function toggleProfileModal() {
    playSound('click');
    const modal = document.getElementById('profile-modal');
    const isVisible = modal.style.display === 'block';
    modal.style.display = isVisible ? 'none' : 'block';
}

function openTermsModal() {
    playSound('click');
    const modal = document.getElementById('terms-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeTermsModal() {
    playSound('click');
    const modal = document.getElementById('terms-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function logout() {
    playSound('click');
    token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    isLoggedIn = false;
    currentUser = null;
    stopProductsSync();
    updateUIAfterLogout();
}

function logoutFromProfile() {
    logout();
    document.getElementById('profile-modal').style.display = 'none';
}

function updateUIAfterLogin() {
    updateNavButtons();
    updateContentSections();
    updateUserProfile();
    startProductsSync();
    playSound('login');
}

function updateUIAfterLogout() {
    updateNavButtons();
    updateContentSections();
    document.getElementById('user-profile').style.display = 'none';
    const termsModal = document.getElementById('terms-modal');
    if (termsModal) {
        termsModal.classList.remove('show');
    }
    navigateTo('home');
}

function updateNavButtons() {
    document.getElementById('nav-prodotti').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-cart').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-wishlist').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-terms').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-chi-siamo').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-contatti').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-staff').style.display = isStaff() ? 'block' : 'none';
    document.getElementById('login-container').style.display = isLoggedIn ? 'none' : 'block';
    updateCartBadge();
    updateWishlistBadge();
}

function isStaff() {
    return isLoggedIn && currentUser && currentUser.id === ADMIN_ID;
}

function updateContentSections() {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        const lockedMessages = section.querySelectorAll('.locked-message');
        const hiddenContents = section.querySelectorAll('.products-grid, .about-content, .contact-content, #staff-content');

        if (section.id === 'home') {
            section.classList.add('active');
            const homeNotLogged = document.getElementById('home-not-logged');
            const homeLogged = document.getElementById('home-logged');
            
            if (isLoggedIn) {
                homeNotLogged.style.display = 'none';
                homeLogged.style.display = 'block';
            } else {
                homeNotLogged.style.display = 'block';
                homeLogged.style.display = 'none';
            }
        } else if (section.id === 'staff') {
            section.classList.remove('active');
        } else {
            section.classList.remove('active');
        }

        if (section.id === 'staff') {
            if (isStaff()) {
                document.getElementById('staff-locked').style.display = 'none';
                document.getElementById('staff-content').style.display = 'block';
                loadStaffProducts();
            } else {
                document.getElementById('staff-locked').style.display = 'block';
                document.getElementById('staff-content').style.display = 'none';
            }
        } else if (isLoggedIn) {
            lockedMessages.forEach(msg => msg.style.display = 'none');
            hiddenContents.forEach(content => {
                if (content.classList.contains('products-grid')) {
                    content.style.display = 'grid';
                } else if (content.id !== 'staff-content') {
                    content.style.display = 'block';
                }
            });
            
            if (section.id === 'prodotti') {
                const searchFiltersSection = document.getElementById('search-filters-section');
                if (searchFiltersSection) {
                    searchFiltersSection.style.display = 'block';
                    loadFilterOptions();
                    performSearch(1);
                }
            }
        } else {
            lockedMessages.forEach(msg => msg.style.display = 'block');
            hiddenContents.forEach(content => content.style.display = 'none');
        }
    });
}

function updateUserProfile() {
    const userProfile = document.getElementById('user-profile');
    if (isLoggedIn && currentUser) {
        document.getElementById('user-name').textContent = currentUser.username;

        if (currentUser.avatar) {
            document.getElementById('user-avatar').src = currentUser.avatar;
            document.getElementById('profile-avatar').src = currentUser.avatar;
        }

        const profileBanner = document.getElementById('profile-banner');
        if (currentUser.banner) {
            if (currentUser.banner.startsWith('#')) {
                profileBanner.style.background = currentUser.banner;
            } else {
                profileBanner.style.backgroundImage = `url('${currentUser.banner}')`;
                profileBanner.style.backgroundSize = 'cover';
                profileBanner.style.backgroundPosition = 'center';
            }
        } else {
            profileBanner.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }

        document.getElementById('profile-username').textContent = `${currentUser.username}#${currentUser.discriminator}`;
        document.getElementById('profile-id').textContent = currentUser.id;

        // Load user files for download section
        loadUserFiles();

        userProfile.style.display = 'block';
    } else {
        userProfile.style.display = 'none';
    }
}

function navigateTo(section) {
    playSound('click');
    
    if (!isLoggedIn && section !== 'home') {
        alert('Effettua il login con Discord per accedere a questa sezione');
        return;
    }

    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => sec.classList.remove('active'));

    const targetSection = document.getElementById(section);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const sectionBtnMap = {
        'home': 'btn-home',
        'prodotti': 'btn-prodotti',
        'chi-siamo': 'btn-chi-siamo',
        'contatti': 'btn-contatti',
        'staff': 'btn-staff'
    };
    
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.id === sectionBtnMap[section]) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'block';
        }
    });
    
    if (section === 'carrello') {
        renderCart();
    } else if (section === 'wishlist') {
        renderWishlist();
    }
}

function generateProductsHash(productsList) {
    return JSON.stringify(productsList).length + productsList.length;
}

async function loadProductsFromAPI() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch('/api/products', {
            headers: headers
        });
        const data = await response.json();
        if (data.success && data.products) {
            products = data.products;
            lastProductsHash = generateProductsHash(products);
            renderProducts();
            if (isStaff()) {
                loadStaffProducts();
            }
        }
    } catch (error) {
    }
}

function startProductsSync() {
    if (productsSyncInterval) clearInterval(productsSyncInterval);
    
    productsSyncInterval = setInterval(async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch('/api/products', {
                headers: headers
            });
            const data = await response.json();
            if (data.success && data.products) {
                const newHash = generateProductsHash(data.products);
                if (newHash !== lastProductsHash) {
                    products = data.products;
                    lastProductsHash = newHash;
                    renderProducts();
                    if (isStaff()) {
                        loadStaffProducts();
                    }
                }
            }
        } catch (error) {
        }
    }, 3000);
}

function stopProductsSync() {
    if (productsSyncInterval) {
        clearInterval(productsSyncInterval);
        productsSyncInterval = null;
    }
}

function renderProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    
    products.forEach(product => {
        const features = typeof product.features === 'string' 
            ? product.features.split('\n').filter(f => f.trim())
            : (Array.isArray(product.features) ? product.features : []);
        
        const imageStyle = product.imageUrl 
            ? `background-image: url('${product.imageUrl}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, ${product.color}, ${adjustBrightness(product.color, -20)}); background-image: url('shjra-logo.png'); background-blend-mode: overlay; background-position: center; background-repeat: no-repeat; background-size: 60%;`;
        
        const { badgeHtml, priceHtml } = renderProductWithBadges(product);
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        card.style.position = 'relative';
        card.onclick = () => openProductModal(product);
        card.innerHTML = `
            ${badgeHtml}
            <div class="product-image" style="${imageStyle}"></div>
            <div class="product-content">
                <h3>${product.name}</h3>
                <p class="map-type">${product.type}</p>
                <p>${product.description}</p>
                <ul class="features">
                    ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <div class="product-footer">
                    <div>${priceHtml}</div>
                    <div class="product-actions">
                        <button class="btn-compra" onclick="event.stopPropagation(); addToCartFromCard(${product.id})">🛒 Carrello</button>
                        <button class="btn-compra btn-pay" onclick="event.stopPropagation(); openPurchaseFromCard(${product.id})">💳 Paga</button>
                        <button class="btn-wishlist-quick ${WishlistManager.isInWishlist(product.id) ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlistQuick(${product.id})">❤️</button>
                    </div>
                </div>
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

function openProductModal(product) {
    playSound('click');
    currentProduct = product;
    
    const features = typeof product.features === 'string' 
        ? product.features.split('\n').filter(f => f.trim())
        : (Array.isArray(product.features) ? product.features : []);
    
    const imageStyle = product.imageUrl 
        ? `background-image: url('${product.imageUrl}');`
        : `background: linear-gradient(135deg, ${product.color}, ${adjustBrightness(product.color, -20)}); background-image: url('shjra-logo.png'); background-blend-mode: overlay; background-position: center; background-repeat: no-repeat; background-size: 60%;`;
    
    document.getElementById('modal-product-image').style.cssText = imageStyle;
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-type').textContent = product.type;
    document.getElementById('modal-product-description').textContent = product.description;
    
    const discount = product.discount || 0;
    const finalPrice = discount > 0 
        ? (parseFloat(product.price) * (1 - discount / 100)).toFixed(2)
        : parseFloat(product.price).toFixed(2);
    
    if (discount > 0) {
        document.getElementById('modal-product-price').innerHTML = `
            <span style="text-decoration: line-through; color: #999;">€${parseFloat(product.price).toFixed(2)}</span>
            <span style="color: #e74c3c; font-weight: bold;">€${finalPrice}</span>
            <span style="color: #27ae60; font-size: 0.9rem;"> -${discount}%</span>
        `;
    } else {
        document.getElementById('modal-product-price').textContent = `€${finalPrice}`;
    }
    
    const featuresContainer = document.getElementById('modal-product-features');
    featuresContainer.innerHTML = `
        <ul>
            ${features.map(f => `<li>${f}</li>`).join('')}
        </ul>
    `;
    
    const wishlistBtn = document.getElementById('modal-wishlist-btn');
    if (WishlistManager.isInWishlist(product.id)) {
        wishlistBtn.style.background = 'rgba(231, 76, 60, 0.2)';
        wishlistBtn.style.color = '#e74c3c';
    } else {
        wishlistBtn.style.background = '';
        wishlistBtn.style.color = '';
    }
    
    document.getElementById('product-modal').classList.add('show');
}

function closeProductModal() {
    playSound('click');
    const modal = document.getElementById('product-modal');
    modal.classList.remove('show');
}

function addToCartFromCard(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        CartManager.addToCart(product);
        showToast(`${product.name} aggiunto al carrello ✅`, 'success');
        playSound('success');
    }
}

function openPurchaseFromCard(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        currentProduct = product;
        showPurchaseOptions();
    }
}

function showPurchaseOptions() {
    playSound('click');
    const modal = document.getElementById('purchase-modal');
    modal.classList.add('show');
}

function closePurchaseModal() {
    playSound('click');
    const modal = document.getElementById('purchase-modal');
    modal.classList.remove('show');
}

function purchaseViaDiscord() {
    playSound('success');
    triggerConfetti();

    if (currentProduct && currentProduct.cart) {
        // Acquisto carrello
        const cart = currentProduct.cart;
        const total = currentProduct.total;
        showToast(`🎉 Acquisto carrello avviato! Totale: €${total.toFixed(2)} - Unisciti al nostro Discord`, 'success');
    } else {
        // Acquisto singolo
        showToast('🎉 Acquisto avviato! Unisciti al nostro Discord', 'success');
    }

    window.open('https://discord.gg/jC7e3Rrs3z', '_blank');
    setTimeout(() => {
        closePurchaseModal();
    }, 500);
}

function purchaseViaPayPal() {
    playSound('success');

    if (!currentProduct || !currentUser) {
        showToast('Errore: Prodotto o utente non trovato', 'error');
        return;
    }

    let description = '';
    let finalPrice = 0;

    if (currentProduct.cart) {
        // Acquisto carrello
        const cart = currentProduct.cart;
        const total = currentProduct.total;
        finalPrice = total.toFixed(2);
        description = `Acquisto Carrello (${cart.length} prodotti): ${cart.map(item => `${item.name} x${item.quantity}`).join(', ')} - ID Discord: ${currentUser.id} (${currentUser.username})`;
    } else {
        // Acquisto singolo
        const productName = currentProduct.name;
        const productPrice = parseFloat(currentProduct.price);
        const discount = currentProduct.discount || 0;
        finalPrice = (productPrice * (1 - discount / 100)).toFixed(2);
        description = `Acquisto: ${productName} - ID Discord: ${currentUser.id} (${currentUser.username})`;
    }

    const paypalLink = `https://www.paypal.com/paypalme/seantoppe00/${finalPrice}?message=${encodeURIComponent(description)}`;

    triggerConfetti();
    showToast('🎉 Pagamento avviato via PayPal', 'success');
    window.open(paypalLink, '_blank');
    setTimeout(() => {
        closePurchaseModal();
    }, 500);
}

function purchaseViaDiscordFromModal() {
    playSound('success');
    triggerConfetti();
    showToast('🎉 Acquisto avviato! Unisciti al nostro Discord', 'success');
    window.open('https://discord.gg/jC7e3Rrs3z', '_blank');
    setTimeout(() => {
        closeProductModal();
    }, 500);
}

function purchaseViaPayPalFromModal() {
    playSound('success');
    
    if (!currentProduct || !currentUser) {
        showToast('Errore: Prodotto o utente non trovato', 'error');
        return;
    }
    
    const productName = currentProduct.name;
    const productPrice = parseFloat(currentProduct.price);
    const discount = currentProduct.discount || 0;
    const finalPrice = (productPrice * (1 - discount / 100)).toFixed(2);
    const discordId = currentUser.id;
    const discordUsername = currentUser.username;
    
    const description = `Acquisto: ${productName} - ID Discord: ${discordId} (${discordUsername})`;
    const paypalLink = `https://www.paypal.com/paypalme/seantoppe00/${finalPrice}?message=${encodeURIComponent(description)}`;
    
    triggerConfetti();
    showToast('🎉 Pagamento avviato via PayPal', 'success');
    window.open(paypalLink, '_blank');
    setTimeout(() => {
        closeProductModal();
    }, 500);
}

function addToCartFromModal() {
    if (!currentProduct) {
        showToast('Errore: Prodotto non trovato', 'error');
        return;
    }
    CartManager.addToCart(currentProduct);
    showToast(`${currentProduct.name} aggiunto al carrello ✅`, 'success');
    playSound('success');
    closeProductModal();
}

function toggleWishlistFromModal() {
    if (!currentProduct) {
        showToast('Errore: Prodotto non trovato', 'error');
        return;
    }
    
    if (WishlistManager.isInWishlist(currentProduct.id)) {
        WishlistManager.removeFromWishlist(currentProduct.id);
        showToast(`${currentProduct.name} rimosso dalla wishlist`, 'info');
    } else {
        WishlistManager.addToWishlist(currentProduct);
        showToast(`${currentProduct.name} aggiunto alla wishlist ❤️`, 'success');
    }
    
    playSound('click');
    
    const wishlistBtn = document.getElementById('modal-wishlist-btn');
    if (WishlistManager.isInWishlist(currentProduct.id)) {
        wishlistBtn.style.background = 'rgba(231, 76, 60, 0.2)';
        wishlistBtn.style.color = '#e74c3c';
    } else {
        wishlistBtn.style.background = '';
        wishlistBtn.style.color = '';
    }
}

function toggleWishlistQuick(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (WishlistManager.isInWishlist(productId)) {
        WishlistManager.removeFromWishlist(productId);
        showToast(`${product.name} rimosso dalla wishlist`, 'info');
    } else {
        WishlistManager.addToWishlist(product);
        showToast(`${product.name} aggiunto alla wishlist ❤️`, 'success');
    }
    
    playSound('click');
    renderProducts();
}

window.addEventListener('load', async function() {
    token = localStorage.getItem('token');
    if (localStorage.getItem('user')) {
        try {
            currentUser = JSON.parse(localStorage.getItem('user'));
        } catch (e) {
            currentUser = null;
        }
    }
    
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('login_success') && params.get('login_success') === 'true') {
        const username = params.get('username');
        const id = params.get('id');
        window.history.replaceState({}, document.title, window.location.pathname);
        
        showLoadingScreen();
        
        setTimeout(async () => {
            token = localStorage.getItem('token');
            if (localStorage.getItem('user')) {
                try {
                    currentUser = JSON.parse(localStorage.getItem('user'));
                } catch (e) {
                    currentUser = null;
                }
            }
            
            const headers = getAuthHeaders();
            
            const response = await fetch('/api/user', {
                headers: headers
            });
            const data = await response.json();
            
            if (data.success && data.user) {
                isLoggedIn = true;
                currentUser = data.user;
                updateUIAfterLogin();
                await loadProductsFromAPI();
            } else {
                token = null;
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            hideLoadingScreen();
        }, 500);
        return;
    }

    try {
        if (token) {
            const headers = getAuthHeaders();
            const response = await fetch('/api/user', {
                headers: headers
            });
            const data = await response.json();
            
            if (data.success && data.user) {
                isLoggedIn = true;
                currentUser = data.user;
                updateUIAfterLogin();
                await loadProductsFromAPI();
            } else {
                token = null;
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                updateUIAfterLogout();
                await loadProductsFromAPI();
            }
        } else {
            updateUIAfterLogout();
            await loadProductsFromAPI();
        }
    } catch (error) {
        updateUIAfterLogout();
        await loadProductsFromAPI();
    }
});

function switchStaffTab(tabName) {
    const tabs = document.querySelectorAll('.staff-tab-content');
    const buttons = document.querySelectorAll('.staff-tab');

    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    buttons.forEach(btn => btn.classList.remove('active'));

    const tabId = 'tab-' + tabName;
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.display = 'block';
    }

    const activeBtn = event.target;
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Load user files if uploads tab is selected
    if (tabName === 'uploads') {
        loadUserFilesForStaff();
    }
}

function loadStaffProducts() {
    const staffList = document.getElementById('staff-products-list');
    if (!staffList) return;
    
    staffList.innerHTML = '';
    
    products.forEach(product => {
        const staffCard = document.createElement('div');
        staffCard.className = 'staff-product-card';
        staffCard.innerHTML = `
            <h4>${product.name}</h4>
            <p>${product.description.substring(0, 60)}...</p>
            <span class="price">€${parseFloat(product.price).toFixed(2)}</span>
            <div class="staff-product-actions">
                <button class="btn-edit" onclick="editProduct(${product.id})">✏️ Modifica</button>
                <button class="btn-delete" onclick="deleteProduct(${product.id})">🗑️ Elimina</button>
            </div>
        `;
        staffList.appendChild(staffCard);
    });
}

async function addProduct(event) {
    event.preventDefault();
    
    const name = document.getElementById('prod-name').value;
    const type = document.getElementById('prod-type').value;
    const description = document.getElementById('prod-description').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const color = document.getElementById('prod-color').value;
    const imageUrl = document.getElementById('prod-image').value;
    const featuresText = document.getElementById('prod-features').value;
    
    const features = featuresText.split('\n').filter(f => f.trim());
    
    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                name,
                type,
                description,
                price,
                color,
                imageUrl,
                features
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            playSound('success');
            event.target.reset();
            await loadProductsFromAPI();
            alert('✅ Prodotto aggiunto con successo!');
        } else {
            playSound('error');
            alert('❌ Errore: ' + data.error);
        }
    } catch (error) {
        alert('❌ Errore nella richiesta');
    }
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    editingProductId = productId;
    
    const features = Array.isArray(product.features) 
        ? product.features.join('\n')
        : product.features;
    
    document.getElementById('edit-prod-name').value = product.name;
    document.getElementById('edit-prod-type').value = product.type;
    document.getElementById('edit-prod-description').value = product.description;
    document.getElementById('edit-prod-price').value = product.price;
    document.getElementById('edit-prod-color').value = product.color;
    document.getElementById('edit-prod-image').value = product.imageUrl || '';
    document.getElementById('edit-prod-features').value = features;
    document.getElementById('edit-prod-badge').value = product.badge || '';
    document.getElementById('edit-prod-discount').value = product.discount || 0;
    
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
    playSound('click');
    document.getElementById('edit-modal').style.display = 'none';
    editingProductId = null;
}

async function saveProduct(event) {
    event.preventDefault();
    
    if (!editingProductId) return;
    
    const name = document.getElementById('edit-prod-name').value;
    const type = document.getElementById('edit-prod-type').value;
    const description = document.getElementById('edit-prod-description').value;
    const price = parseFloat(document.getElementById('edit-prod-price').value);
    const color = document.getElementById('edit-prod-color').value;
    const imageUrl = document.getElementById('edit-prod-image').value;
    const featuresText = document.getElementById('edit-prod-features').value;
    const badge = document.getElementById('edit-prod-badge').value || null;
    const discount = parseInt(document.getElementById('edit-prod-discount').value) || 0;
    
    const features = featuresText.split('\n').filter(f => f.trim());
    
    try {
        const response = await fetch(`/api/products/${editingProductId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                name,
                type,
                description,
                price,
                color,
                imageUrl,
                features,
                badge,
                discount
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            playSound('success');
            closeEditModal();
            await loadProductsFromAPI();
            showToast('✅ Prodotto modificato con successo!', 'success');
        } else {
            playSound('error');
            showToast('❌ Errore: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('❌ Errore nella richiesta', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;
    
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            playSound('success');
            await loadProductsFromAPI();
            alert('✅ Prodotto eliminato!');
        } else {
            playSound('error');
            alert('❌ Errore: ' + data.error);
        }
    } catch (error) {
        alert('❌ Errore nella richiesta');
    }
}

function adjustBrightness(color, percent) {
    const num = parseInt(color.replace(/^#/, ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

window.addEventListener('click', function(event) {
    const profileModal = document.getElementById('profile-modal');
    if (event.target === profileModal) {
        profileModal.style.display = 'none';
    }
    
    const editModal = document.getElementById('edit-modal');
    if (event.target === editModal) {
        closeEditModal();
    }
    
    const productModal = document.getElementById('product-modal');
    if (event.target === productModal) {
        closeProductModal();
    }
    
    const purchaseModal = document.getElementById('purchase-modal');
    if (event.target === purchaseModal) {
        closePurchaseModal();
    }
});

/* ===== TOAST NOTIFICATIONS ===== */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
  
  playSound(type === 'error' ? 'error' : 'success');
}

/* ===== SEARCH & FILTERS ===== */
let currentSearchPage = 1;
let currentSearchFilters = {};

async function loadFilterOptions() {
  try {
    const response = await fetch('/api/products/filters');
    const data = await response.json();
    
    if (data.success && data.filters) {
      const typeSelect = document.getElementById('type-filter');
      const badgeSelect = document.getElementById('badge-filter');
      const maxPriceInput = document.getElementById('max-price');
      
      typeSelect.innerHTML = '<option value="">Tutti i tipi</option>';
      badgeSelect.innerHTML = '<option value="">Tutti i badge</option>';
      
      data.filters.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
      });
      
      data.filters.badges.forEach(badge => {
        const option = document.createElement('option');
        option.value = badge;
        option.textContent = badge;
        badgeSelect.appendChild(option);
      });
      
      maxPriceInput.value = data.filters.priceRange.max;
      maxPriceInput.max = data.filters.priceRange.max;
      
      attachFilterListeners();
    }
  } catch (error) {
    console.error('Error loading filters:', error);
  }
}

function attachFilterListeners() {
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');
  const badgeFilter = document.getElementById('badge-filter');
  const minPrice = document.getElementById('min-price');
  const maxPrice = document.getElementById('max-price');
  const sortFilter = document.getElementById('sort-filter');
  const discountOnly = document.getElementById('discount-only');
  
  const debounceSearch = (fn, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };
  
  const delayedSearch = debounceSearch(() => performSearch(1), 500);
  
  searchInput?.addEventListener('input', delayedSearch);
  typeFilter?.addEventListener('change', () => performSearch(1));
  badgeFilter?.addEventListener('change', () => performSearch(1));
  minPrice?.addEventListener('change', () => performSearch(1));
  maxPrice?.addEventListener('change', () => performSearch(1));
  sortFilter?.addEventListener('change', () => performSearch(1));
  discountOnly?.addEventListener('change', () => performSearch(1));
}

function toggleFiltersPanel() {
  const filtersContent = document.getElementById('filters-content');
  filtersContent.style.display = filtersContent.style.display === 'none' ? 'block' : 'none';
}

async function performSearch(page = 1) {
  try {
    showSkeletonLoading();
    currentSearchPage = page;
    
    const query = document.getElementById('search-input')?.value || '';
    const type = document.getElementById('type-filter')?.value || '';
    const badge = document.getElementById('badge-filter')?.value || '';
    const minPrice = document.getElementById('min-price')?.value || 0;
    const maxPrice = document.getElementById('max-price')?.value || 999999;
    const sort = document.getElementById('sort-filter')?.value || 'name';
    const discountOnly = document.getElementById('discount-only')?.checked || false;
    
    currentSearchFilters = { query, type, badge, minPrice, maxPrice, sort, discountOnly };
    
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (type) params.append('type', type);
    params.append('minPrice', minPrice);
    params.append('maxPrice', maxPrice);
    if (badge) params.append('badge', badge);
    if (discountOnly) params.append('discountOnly', 'true');
    params.append('sort', sort);
    params.append('page', page);
    params.append('limit', 12);
    
    const response = await fetch(`/api/products/search?${params.toString()}`);
    const data = await response.json();
    
    if (data.success) {
      displaySearchResults(data.products, data.pagination);
    }
  } catch (error) {
    console.error('Search error:', error);
    showToast('Errore nella ricerca', 'error');
  } finally {
    hideSkeletonLoading();
  }
}

function displaySearchResults(products, pagination) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';
  
  if (products.length === 0) {
    grid.innerHTML = '<div class="search-results-info" style="grid-column: 1/-1; text-align: center;">Nessun prodotto trovato con i filtri selezionati</div>';
    renderPagination(pagination);
    return;
  }
  
  const resultsInfo = document.createElement('div');
  resultsInfo.className = 'search-results-info';
  resultsInfo.style.gridColumn = '1 / -1';
  resultsInfo.textContent = `Trovati ${pagination.total} risultati (pagina ${pagination.page} di ${pagination.totalPages})`;
  grid.appendChild(resultsInfo);
  
  products.forEach(product => {
    const card = createProductCard(product);
    grid.appendChild(card);
  });
  
  renderPagination(pagination);
}

function renderPagination(pagination) {
  let paginationHtml = '<div class="pagination">';
  
  if (pagination.page > 1) {
    paginationHtml += `<button onclick="performSearch(1)">« Prima</button>`;
    paginationHtml += `<button onclick="performSearch(${pagination.page - 1})">‹ Precedente</button>`;
  }
  
  const startPage = Math.max(1, pagination.page - 2);
  const endPage = Math.min(pagination.totalPages, pagination.page + 2);
  
  if (startPage > 1) {
    paginationHtml += '<span>...</span>';
  }
  
  for (let i = startPage; i <= endPage; i++) {
    if (i === pagination.page) {
      paginationHtml += `<span class="active">${i}</span>`;
    } else {
      paginationHtml += `<button onclick="performSearch(${i})">${i}</button>`;
    }
  }
  
  if (endPage < pagination.totalPages) {
    paginationHtml += '<span>...</span>';
  }
  
  if (pagination.page < pagination.totalPages) {
    paginationHtml += `<button onclick="performSearch(${pagination.page + 1})">Successivo ›</button>`;
    paginationHtml += `<button onclick="performSearch(${pagination.totalPages})">Ultima »</button>`;
  }
  
  paginationHtml += '</div>';
  
  const paginationDiv = document.createElement('div');
  paginationDiv.innerHTML = paginationHtml;
  document.getElementById('products-grid').appendChild(paginationDiv);
}

function resetFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('type-filter').value = '';
  document.getElementById('badge-filter').value = '';
  document.getElementById('min-price').value = 0;
  document.getElementById('discount-only').checked = false;
  document.getElementById('sort-filter').value = 'name';
  
  fetch('/api/products/filters')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        document.getElementById('max-price').value = data.filters.priceRange.max;
      }
    });
  
  performSearch(1);
  showToast('Filtri resettati');
}

function initLazyLoading() {
  if (!('IntersectionObserver' in window)) return;
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.style.backgroundImage = img.dataset.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  });
  
  document.querySelectorAll('[data-src]').forEach(img => imageObserver.observe(img));
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.style.cursor = 'pointer';
  card.style.position = 'relative';
  card.onclick = () => openProductModal(product);

  const features = typeof product.features === 'string'
    ? product.features.split('\n').filter(f => f.trim())
    : (Array.isArray(product.features) ? product.features : []);

  const description = typeof product.description === 'string' ? product.description : '';
  const truncatedDescription = description.length > 140 ? `${description.substring(0, 140)}...` : description;

  const { badgeHtml, priceHtml } = renderProductWithBadges(product);

  const isHexColor = typeof product.color === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(product.color);
  const baseColor = isHexColor ? product.color : '#667eea';
  const secondaryColor = adjustBrightness(baseColor, -20);

  const imageUrl = product.imageUrl || product.image;
  const imageStyle = imageUrl
    ? `background-image: url("${imageUrl}"); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, ${baseColor}, ${secondaryColor}); background-image: url('shjra-logo.png'); background-blend-mode: overlay; background-position: center; background-repeat: no-repeat; background-size: 60%;`;

  card.innerHTML = `
    ${badgeHtml}
    <div class="product-image" style="${imageStyle}"></div>
    <div class="product-content">
      <h3>${product.name}</h3>
      <p class="map-type">${product.type || 'N/A'}</p>
      <p>${truncatedDescription}</p>
      <ul class="features">
        ${features.slice(0, 3).map(f => `<li>${f}</li>`).join('')}
      </ul>
      <div class="product-footer">
        <div>${priceHtml}</div>
        <div class="product-actions">
          <button class="btn-compra">🛒 Carrello</button>
          <button class="btn-compra btn-pay">💳 Paga</button>
          <button class="btn-wishlist-quick ${WishlistManager.isInWishlist(product.id) ? 'active' : ''}">❤️</button>
        </div>
      </div>
    </div>
  `;

  const cartBtn = card.querySelector('.btn-compra');
  if (cartBtn) {
    cartBtn.addEventListener('click', event => {
      event.stopPropagation();
      addToCartQuick(product);
    });
  }

  const payBtn = card.querySelector('.btn-pay');
  if (payBtn) {
    payBtn.addEventListener('click', event => {
      event.stopPropagation();
      openPurchaseQuick(product);
    });
  }

  const wishlistBtn = card.querySelector('.btn-wishlist-quick');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', event => {
      event.stopPropagation();
      toggleWishlist(product);
      wishlistBtn.classList.toggle('active', WishlistManager.isInWishlist(product.id));
    });
  }

  return card;
}

/* ===== CART & WISHLIST ===== */
function addToCartQuick(product) {
  CartManager.addToCart(product);
  showToast(`${product.name} aggiunto al carrello ✅`, 'success');
  playSound('success');
}

function openPurchaseQuick(product) {
  const existingProduct = products.find(p => p.id === product.id);
  currentProduct = existingProduct || product;
  showPurchaseOptions();
}

function toggleWishlist(product) {
  if (WishlistManager.isInWishlist(product.id)) {
    WishlistManager.removeFromWishlist(product.id);
    showToast(`${product.name} rimosso dalla wishlist`, 'info');
  } else {
    WishlistManager.addToWishlist(product);
    showToast(`${product.name} aggiunto alla wishlist ❤️`, 'success');
  }
  playSound('click');
}

function renderCart() {
  const cartContent = document.getElementById('cart-content');
  const cartItems = document.getElementById('cart-items');
  const cartSummary = document.getElementById('cart-summary');
  
  if (!isLoggedIn) {
    cartContent.style.display = 'none';
    return;
  }
  
  cartContent.style.display = 'block';
  const cart = CartManager.getCart();
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<div class="empty-state">Il tuo carrello è vuoto 🛒</div>';
    cartSummary.innerHTML = '';
    return;
  }
  
  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>€${item.price.toFixed(2)} x <input type="number" min="1" value="${item.quantity}" onchange="CartManager.updateQuantity(${item.id}, this.value); renderCart()" style="width: 50px;"></p>
      </div>
      <div class="cart-item-total">€${(item.price * item.quantity).toFixed(2)}</div>
      <button class="btn-remove" onclick="CartManager.removeFromCart(${item.id}); renderCart()">🗑️</button>
    </div>
  `).join('');
  
  const total = CartManager.getTotal();
  cartSummary.innerHTML = `
    <div class="cart-summary-content">
      <h3>Totale: €${total.toFixed(2)}</h3>
      <button class="btn-checkout" onclick="proceedToCheckout()">Procedi al pagamento</button>
      <button class="btn-continue" onclick="navigateTo('prodotti')">Continua shopping</button>
      <button class="btn-clear-cart" onclick="if(confirm('Svuotare il carrello?')) { CartManager.clearCart(); renderCart(); }">Svuota carrello</button>
    </div>
  `;
}

function renderWishlist() {
  const wishlistContent = document.getElementById('wishlist-content');
  const wishlistGrid = document.getElementById('wishlist-grid');
  
  if (!isLoggedIn) {
    wishlistContent.style.display = 'none';
    return;
  }
  
  wishlistContent.style.display = 'block';
  const wishlist = WishlistManager.getWishlist();
  
  if (wishlist.length === 0) {
    wishlistGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center;">La tua wishlist è vuota ❤️</div>';
    return;
  }
  
  wishlistGrid.innerHTML = wishlist.map(product => `
    <div class="wishlist-item product-card">
      <div class="product-image" style="background: ${product.color || '#667eea'}"></div>
      <div class="product-content">
        <h3>${product.name}</h3>
        <p class="map-type">${product.type}</p>
        <p>€${product.price.toFixed(2)}</p>
        <div class="product-footer">
          <button class="btn-compra" onclick="addToCartQuick(${JSON.stringify(product)})">Aggiungi al carrello</button>
          <button class="btn-remove" onclick="WishlistManager.removeFromWishlist(${product.id}); renderWishlist()">Rimuovi</button>
        </div>
      </div>
    </div>
  `).join('');
}

function proceedToCheckout() {
  const cart = CartManager.getCart();
  if (cart.length === 0) {
    showToast('Carrello vuoto', 'error');
    return;
  }

  // Imposta il carrello come currentProduct per il modal
  currentProduct = { cart: cart, total: CartManager.getTotal() };
  showPurchaseOptions();
}

/* ===== THEME TOGGLE ===== */
function initThemeToggle() {
  const themeBtn = document.createElement('button');
  themeBtn.className = 'theme-toggle';
  themeBtn.title = 'Attiva/Disattiva modalità chiara';
  
  const updateButtonState = () => {
    const isLight = document.body.classList.contains('light-mode');
    themeBtn.textContent = isLight ? '☀️' : '🌙';
  };
  
  updateButtonState();
  
  themeBtn.onclick = () => {
    ThemeManager.toggleLightDarkMode();
    updateButtonState();
    playSound('click');
    const isLight = document.body.classList.contains('light-mode');
    showToast(isLight ? 'Modalità chiara attivata ☀️' : 'Modalità scura attivata 🌙');
  };
  
  document.body.appendChild(themeBtn);
}

/* ===== FLOATING DISCORD BUTTON ===== */
function initFloatingDiscordBtn() {
  const btn = document.createElement('button');
  btn.className = 'floating-discord-btn';
  btn.textContent = '💬';
  btn.onclick = () => {
    playSound('click');
    window.open('https://discord.gg/jC7e3Rrs3z', '_blank');
  };
  document.body.appendChild(btn);
}

/* ===== SCROLL ANIMATIONS ===== */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.product-card').forEach(el => {
    el.classList.add('scroll-in');
    observer.observe(el);
  });
}

/* ===== CONFETTI ANIMATION ===== */
function triggerConfetti() {
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti fall';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.delay = Math.random() * 0.5 + 's';
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 3000);
  }
}

/* ===== PARALLAX EFFECT ===== */
function initParallax() {
  const bg = document.querySelector('.gradient-bg');
  if (!bg) return;
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    bg.style.transform = `translateY(${scrolled * 0.5}px)`;
  });
}

/* ===== SKELETON LOADING ===== */
function showSkeletonLoading() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    grid.innerHTML += `
      <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-text">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
    `;
  }
}

/* ===== PRODUCT BADGES & DISCOUNTS ===== */
function renderProductWithBadges(product) {
  let badgeHtml = '';
  
  if (product.badge) {
    const badgeTypes = {
      'new': { emoji: '🆕', text: 'Nuovo', class: 'badge-new' },
      'popular': { emoji: '⭐', text: 'Popolare', class: 'badge-popular' },
      'hot': { emoji: '🔥', text: 'Hot Deal', class: 'badge-hot' }
    };
    
    const badgeInfo = badgeTypes[product.badge];
    if (badgeInfo) {
      badgeHtml = `<div class="product-badge ${badgeInfo.class}">${badgeInfo.emoji} ${badgeInfo.text}</div>`;
    }
  }
  
  let priceHtml = `<span class="price">€${parseFloat(product.price).toFixed(2)}</span>`;
  
  if (product.discount && product.discount > 0) {
    const discountedPrice = (parseFloat(product.price) * (1 - product.discount / 100)).toFixed(2);
    priceHtml = `
      <div>
        <span class="discount-price">€${parseFloat(product.price).toFixed(2)}</span>
        <span class="sale-price badge-discount">-${product.discount}%</span>
      </div>
      <span class="sale-price">€${discountedPrice}</span>
    `;
  }
  
  return { badgeHtml, priceHtml };
}

/* ===== FILE UPLOAD FUNCTIONS ===== */
async function uploadFile(event) {
    event.preventDefault();

    const fileInput = document.getElementById('file-input');
    const userIdsInput = document.getElementById('user-ids-input');
    const uploadBtn = document.getElementById('upload-btn');

    if (!fileInput.files[0]) {
        showToast('Seleziona un file', 'error');
        return;
    }

    if (!userIdsInput.value.trim()) {
        showToast('Inserisci almeno un ID utente', 'error');
        return;
    }

    // Disable button and show loading
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Caricamento...';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('userIds', userIdsInput.value.trim());

    try {
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showToast('File caricato con successo!', 'success');
            fileInput.value = '';
            userIdsInput.value = '';
            loadUserFilesForStaff();
        } else {
            showToast('Errore: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('Errore nel caricamento', 'error');
    } finally {
        // Re-enable button
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📤 Carica File';
    }
}

async function loadUserFiles() {
    try {
        const response = await fetch(`/api/files/user/${currentUser.id}`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            renderUserFiles(data.files);
        }
    } catch (error) {
        console.error('Error loading user files:', error);
    }
}

async function loadUserFilesForStaff() {
    // Staff can see all files - this could be extended to show all files for admin
    try {
        // For now, just reload the current user's files as a placeholder
        // In future, this could be extended to show all uploaded files for admin
        if (currentUser) {
            const response = await fetch(`/api/files/user/${currentUser.id}`, {
                headers: getAuthHeaders()
            });

            const data = await response.json();

            if (data.success) {
                renderUserFilesForStaff(data.files);
            }
        }
    } catch (error) {
        console.error('Error loading staff files:', error);
    }
}

function renderUserFiles(files) {
    const downloadSection = document.getElementById('download-section');
    const filesList = document.getElementById('user-files-list');

    if (files.length === 0) {
        downloadSection.style.display = 'none';
        return;
    }

    downloadSection.style.display = 'block';
    filesList.innerHTML = '';

    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-name">${file.filename}</span>
                <span class="file-expiry">Scade: ${new Date(file.expiresAt).toLocaleString('it-IT')}</span>
            </div>
            <button class="btn-download" onclick="downloadFile('${file.id}')">📥 Scarica</button>
        `;
        filesList.appendChild(fileItem);
    });
}

function renderUserFilesForStaff(files) {
    // Create or update the staff files list
    let staffFilesList = document.getElementById('staff-files-list');
    if (!staffFilesList) {
        // Create if doesn't exist
        const uploadsTab = document.getElementById('tab-uploads');
        const filesList = document.createElement('div');
        filesList.id = 'staff-files-list';
        filesList.innerHTML = '<h4>📁 File Caricati Recenti</h4>';
        uploadsTab.appendChild(filesList);
        staffFilesList = filesList;
    }

    if (files.length === 0) {
        staffFilesList.innerHTML = '<h4>📁 File Caricati Recenti</h4><p style="color: #666;">Nessun file caricato recentemente</p>';
        return;
    }

    let filesHtml = '<h4>📁 File Caricati Recenti</h4>';
    files.forEach(file => {
        filesHtml += `
            <div class="file-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; margin: 5px 0; border-radius: 5px;">
                <div class="file-info">
                    <span class="file-name" style="font-weight: bold;">${file.filename}</span>
                    <br>
                    <span class="file-expiry" style="font-size: 0.8em; color: #666;">Scade: ${new Date(file.expiresAt).toLocaleString('it-IT')}</span>
                </div>
                <button class="btn-download" onclick="downloadFile('${file.id}')" style="background: #667eea; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">📥 Scarica</button>
            </div>
        `;
    });

    staffFilesList.innerHTML = filesHtml;
}

async function downloadFile(fileId) {
    try {
        const response = await fetch(`/api/files/download/${fileId}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'download'; // Will be overridden by server
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('Download completato!', 'success');
        } else {
            const data = await response.json();
            showToast('Errore: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('Errore nel download', 'error');
    }
}

/* ===== INIT ALL ===== */
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  initThemeToggle();
  initFloatingDiscordBtn();
  initParallax();

  // Initialize file upload form - removed since we now use onsubmit
});
