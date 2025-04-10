document.addEventListener('DOMContentLoaded', function() {
    console.log('1. Script loaded'); // Kiểm tra script chạy không
    const WEBHOOK_URL = 'https://your-n8n-instance/webhook/abc123'; // Thay bằng URL thực tế
    const AUTH_TOKEN_KEY = 'ct_strategy_token';
    const TOKEN_EXPIRY_KEY = 'ct_token_expiry';
    let sessionToken = getAuthToken();
    let tokenExpiry;

    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModal = loginModal.querySelector('.close');
    const submitLogin = document.getElementById('submitLogin');

    console.log('2. Elements:', { loginBtn, submitLogin }); // Kiểm tra DOM elements

    function getAuthToken() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (token && expiry && Date.now() > parseInt(expiry)) {
            clearAuthData();
            return null;
        }
        return token;
    }

    function setAuthToken(token, expiresIn) {
        console.log('5. Set token:', token, expiresIn);
        const expiry = Date.now() + (expiresIn * 1000);
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiry);
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        sessionToken = token;
        tokenExpiry = expiry;
        updateAuthUI();
    }

    function clearAuthData() {
        console.log('6. Clear auth data');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionToken = null;
        tokenExpiry = null;
        updateAuthUI();
    }

    function updateAuthUI() {
        console.log('7. Update UI, sessionToken:', sessionToken);
        if (sessionToken) {
            loginBtn.textContent = 'Đăng xuất';
            loginBtn.classList.add('btn-danger');
            loginBtn.classList.remove('btn-outline-secondary', 'btn-success');
        } else {
            loginBtn.textContent = 'Đăng nhập';
            loginBtn.classList.remove('btn-danger', 'btn-success');
            loginBtn.classList.add('btn-outline-secondary');
        }
    }

    async function callWebhook(action, data) {
        const token = getAuthToken();
        const payload = { action, sessionToken: token, ...data };
        console.log('3. Gửi payload:', payload);
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || ''}`
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            console.log('4. Response:', result);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            if (result.user && result.user.session_token && result.user.expires_in) {
                setAuthToken(result.user.session_token, result.user.expires_in);
            }
            return result;
        } catch (error) {
            console.error(`API call failed for ${action}:`, error);
            throw error;
        }
    }

    loginBtn.addEventListener('click', () => {
        console.log('8. Login button clicked, sessionToken:', sessionToken);
        if (sessionToken) {
            clearAuthData();
        } else {
            showLoginModal();
        }
    });

    if (closeModal) closeModal.addEventListener('click', hideLoginModal);
    modalOverlay.addEventListener('click', hideLoginModal);

    console.log('9. Attaching submitLogin event');
    submitLogin.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        console.log('10. Submit login clicked:', { username, password });

        if (!username || !password) {
            document.getElementById('loginError').textContent = 'Vui lòng nhập đủ thông tin';
            return;
        }

        try {
            showLoading();
            const response = await callWebhook('auth', { username, password });
            console.log('11. Response từ webhook:', response);

            if (response.success && response.user && response.user.session_token && response.user.expires_in) {
                console.log('12. Đăng nhập thành công');
                setAuthToken(response.user.session_token, response.user.expires_in);
                hideLoginModal();
            } else {
                console.log('13. Đăng nhập thất bại:', response);
                document.getElementById('loginError').textContent = response.message || 'Đăng nhập thất bại';
            }
        } catch (error) {
            console.error('14. Lỗi kết nối:', error);
            document.getElementById('loginError').textContent = 'Lỗi kết nối';
        } finally {
            hideLoading();
        }
    });

    function showLoginModal() {
        modalOverlay.style.display = 'block';
        loginModal.style.display = 'block';
    }

    function hideLoginModal() {
        modalOverlay.style.display = 'none';
        loginModal.style.display = 'none';
        document.getElementById('loginError').textContent = '';
    }

    function showLoading() {
        let loadingDiv = document.getElementById('loadingOverlay');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'loadingOverlay';
            loadingDiv.className = 'loading';
            loadingDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
            document.body.appendChild(loadingDiv);
        }
        loadingDiv.style.display = 'flex';
    }

    function hideLoading() {
        const loadingDiv = document.getElementById('loadingOverlay');
        if (loadingDiv) loadingDiv.style.display = 'none';
    }

    updateAuthUI(); // Khởi tạo giao diện
});