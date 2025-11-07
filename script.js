let isLoggedIn = false;
let currentUser = null;
let token = null;

const ADMIN_ID = '1100354997738274858';
let products = [];
let editingProductId = null;

function getAuthHeaders() {
  return token ? {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  } : {
    'Content-Type': 'application/json'
  };
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
    const staffSection = document.getElementById('staff');
    const allSections = document.querySelectorAll('.content-section');
    const timeOfDay = getTimeOfDay();
    
    bg.classList.remove('morning', 'afternoon', 'evening');
    bg.classList.add(timeOfDay);
    
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
    window.location.href = '/auth/discord';
}

function toggleProfileModal() {
    const modal = document.getElementById('profile-modal');
    const isVisible = modal.style.display === 'block';
    modal.style.display = isVisible ? 'none' : 'block';
}

function logout() {
    token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    isLoggedIn = false;
    currentUser = null;
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

async function loadProductsFromAPI() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch('/api/products', {
            headers: headers
        });
        const data = await response.json();
        if (data.success && data.products) {
            products = data.products;
            renderProducts();
            if (isStaff()) {
                loadStaffProducts();
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
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
            : `background: linear-gradient(135deg, ${product.color}, ${adjustBrightness(product.color, -20)});`;
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image" style="${imageStyle}"></div>
            <div class="product-content">
                <h3>${product.name}</h3>
                <p class="map-type">${product.type}</p>
                <p>${product.description}</p>
                <ul class="features">
                    ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <div class="product-footer">
                    <span class="price">€${parseFloat(product.price).toFixed(2)}</span>
                    <button class="btn-compra" onclick="alert('Acquista ora')">Acquista</button>
                </div>
            </div>
        `;
        productsGrid.appendChild(card);
    });
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
            console.log('Token from localStorage:', token ? 'present' : 'missing');
            console.log('Headers:', headers);
            
            const response = await fetch('/api/user', {
                headers: headers
            });
            const data = await response.json();
            
            console.log('API response:', data);
            
            if (data.success && data.user) {
                isLoggedIn = true;
                currentUser = data.user;
                updateUIAfterLogin();
                await loadProductsFromAPI();
            } else {
                console.error('Login failed:', data);
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
        console.error('Error checking login status:', error);
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
            event.target.reset();
            await loadProductsFromAPI();
            alert('✅ Prodotto aggiunto con successo!');
        } else {
            alert('❌ Errore: ' + data.error);
        }
    } catch (error) {
        console.error('Error adding product:', error);
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
    
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
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
                features
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeEditModal();
            await loadProductsFromAPI();
            alert('✅ Prodotto modificato con successo!');
        } else {
            alert('❌ Errore: ' + data.error);
        }
    } catch (error) {
        console.error('Error saving product:', error);
        alert('❌ Errore nella richiesta');
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
            await loadProductsFromAPI();
            alert('✅ Prodotto eliminato!');
        } else {
            alert('❌ Errore: ' + data.error);
        }
    } catch (error) {
        console.error('Error deleting product:', error);
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
});
