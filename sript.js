document.addEventListener('DOMContentLoaded', function() {
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

    // Lấy token từ storage
    function getAuthToken() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (token && expiry && Date.now() > parseInt(expiry)) {
            clearAuthData();
            return null;
        }
        return token;
    }

    // Lưu token
    function setAuthToken(token, expiresIn) {
        const expiry = Date.now() + (expiresIn * 1000);
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiry);
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        sessionToken = token;
        tokenExpiry = expiry;
        updateAuthUI();
    }

    // Xóa token khi đăng xuất
    function clearAuthData() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionToken = null;
        tokenExpiry = null;
        updateAuthUI();
    }

    // Cập nhật giao diện nút
    function updateAuthUI() {
    console.log('Update UI, sessionToken:', sessionToken); // Debug
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

    // Gọi webhook
    async function callWebhook(action, data) {
        const token = getAuthToken();
        const payload = { action, sessionToken: token, ...data };
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Nếu có token mới từ refresh
            if (result.user && result.user.session_token && result.user.expires_in) {
                setAuthToken(result.user.session_token, result.user.expires_in);
            }
            return result;
        } catch (error) {
            console.error(`API call failed for ${action}:`, error);
            throw error;
        }
    }

    // Sự kiện click nút login/logout
    loginBtn.addEventListener('click', () => {
        if (sessionToken) {
            clearAuthData();
        } else {
            showLoginModal();
        }
    });

    // Sự kiện đóng modal
    if (closeModal) closeModal.addEventListener('click', hideLoginModal);
    modalOverlay.addEventListener('click', hideLoginModal);

    // Xử lý đăng nhập
   submitLogin.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        document.getElementById('loginError').textContent = 'Vui lòng nhập đủ thông tin';
        return;
    }

    try {
        console.log('1. Bắt đầu đăng nhập:', { username, password });
        showLoading();
        const response = await callWebhook('auth', { username, password });
        console.log('2. Response từ webhook:', response);

        if (response.success && response.user && response.user.session_token && response.user.expires_in) {
            console.log('3. Đăng nhập thành công, token:', response.user.session_token);
            setAuthToken(response.user.session_token, response.user.expires_in);
            hideLoginModal();
        } else {
            console.log('4. Đăng nhập thất bại:', response);
            document.getElementById('loginError').textContent = response.message || 'Đăng nhập thất bại';
        }
    } catch (error) {
        console.error('5. Lỗi kết nối:', error);
        document.getElementById('loginError').textContent = 'Lỗi kết nối';
    } finally {
        hideLoading();
    }
});

    // Các hàm hiển thị/ẩn
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

    // Khởi tạo giao diện
    updateAuthUI();
});