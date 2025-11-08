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
    navigateTo('home');
}

function updateNavButtons() {
    document.getElementById('nav-prodotti').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-chi-siamo').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-contatti').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('nav-staff').style.display = isStaff() ? 'block' : 'none';
    document.getElementById('login-container').style.display = isLoggedIn ? 'none' : 'block';
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
                    <button class="btn-compra" onclick="event.stopPropagation(); openPurchaseFromCard(${product.id})">Acquista</button>
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
    document.getElementById('modal-product-price').textContent = `€${parseFloat(product.price).toFixed(2)}`;
    
    const featuresContainer = document.getElementById('modal-product-features');
    featuresContainer.innerHTML = `
        <ul>
            ${features.map(f => `<li>${f}</li>`).join('')}
        </ul>
    `;
    
    document.getElementById('product-modal').classList.add('show');
}

function closeProductModal() {
    playSound('click');
    const modal = document.getElementById('product-modal');
    modal.classList.remove('show');
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
    showToast('🎉 Acquisto avviato! Unisciti al nostro Discord', 'success');
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
        closePurchaseModal();
    }, 500);
}

window.addEventListener('load', async function() {
    updateBackgroundTheme();
    setInterval(updateBackgroundTheme, 60000);
    
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

/* ===== THEME TOGGLE ===== */
function initThemeToggle() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }
  
  const themeBtn = document.createElement('button');
  themeBtn.className = 'theme-toggle';
  themeBtn.textContent = isDarkMode ? '☀️' : '🌙';
  themeBtn.onclick = toggleTheme;
  document.body.appendChild(themeBtn);
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark);
  document.querySelector('.theme-toggle').textContent = isDark ? '☀️' : '🌙';
  playSound('click');
  showToast(isDark ? '🌙 Dark mode attivato' : '☀️ Light mode attivato');
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

/* ===== INIT ALL ===== */
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initFloatingDiscordBtn();
  initParallax();
  
  const originalLoadProducts = window.loadProductsFromAPI;
  window.loadProductsFromAPI = async function() {
    showSkeletonLoading();
    await originalLoadProducts.call(this);
    initScrollAnimations();
  };
});
