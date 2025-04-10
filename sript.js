document.addEventListener('DOMContentLoaded', function() {
    // ========== CẤU HÌNH ==========
    const WEBHOOK_URL = 'https://rabbitbase.alphabot.vn/webhook/36dbb972-ca19-48ac-bd79-8ab661b88d4f';
    const AUTH_TOKEN_KEY = 'ct_strategy_token';
    const TOKEN_EXPIRY_KEY = 'ct_token_expiry';
    const REFRESH_THRESHOLD = 300000; // 5 phút (ms) trước khi hết hạn thì refresh

    // ========== DOM ELEMENTS ==========
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModal = loginModal.querySelector('.close');
    const submitLogin = document.getElementById('submitLogin');
    const inputForm = document.getElementById('inputForm');
    const topicsSection = document.getElementById('topicsSection');
    const resultSection = document.getElementById('resultSection');
    const topicsTable = document.getElementById('topicsTable');
    const confirmSelection = document.getElementById('confirmSelection');
    const aiSelectBtn = document.getElementById('aiSelectBtn');
    const contentAccordion = document.getElementById('contentAccordion');
    const viewPrevious = document.getElementById('viewPrevious');

    // ========== STATE ==========
    let sessionToken = getAuthToken();
    let tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    let generatedTopics = [];
    let selectedTopics = [];

    // ========== AUTH FUNCTIONS ==========
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
        const expiry = Date.now() + (expiresIn * 1000); // Chuyển expires_in từ giây sang ms
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiry);
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        sessionToken = token;
        tokenExpiry = expiry;
    }

    function clearAuthData() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionToken = null;
        tokenExpiry = null;
        updateAuthUI();
    }

    function updateAuthUI() {
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

    async function refreshToken() {
        try {
            const response = await callWebhook('refresh_token', {});
            if (response.success && response.session_token && response.expires_in) {
                setAuthToken(response.session_token, response.expires_in);
                console.log('Token refreshed successfully');
            }
        } catch (error) {
            console.error('Refresh token failed:', error);
            clearAuthData();
            showLoginModal();
        }
    }

    // ========== MODAL FUNCTIONS ==========
    function showLoginModal() {
        modalOverlay.style.display = 'block';
        loginModal.style.display = 'block';
    }

    function hideLoginModal() {
        modalOverlay.style.display = 'none';
        loginModal.style.display = 'none';
        document.getElementById('loginError').textContent = '';
    }

    // ========== API FUNCTIONS ==========
    async function callWebhook(action, data) {
        const token = getAuthToken();
        if (!token && action !== 'auth' && action !== 'refresh_token') {
            showLoginModal();
            throw new Error('Vui lòng đăng nhập');
        }

        // Kiểm tra và làm mới token nếu sắp hết hạn
        if (token && tokenExpiry && (tokenExpiry - Date.now() < REFRESH_THRESHOLD) && action !== 'refresh_token') {
            await refreshToken();
        }

        const payload = {
            action,
            sessionToken: token,
            ...data
        };

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || ''}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    clearAuthData();
                    showLoginModal();
                    throw new Error('Phiên đăng nhập hết hạn');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API call failed for ${action}:`, error);
            throw error;
        }
    }

    // ========== EVENT HANDLERS ==========
    loginBtn.addEventListener('click', () => {
        if (sessionToken) {
            clearAuthData();
        } else {
            showLoginModal();
        }
    });

    if (closeModal) {
        closeModal.addEventListener('click', hideLoginModal);
    }
    modalOverlay.addEventListener('click', hideLoginModal);

    submitLogin.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            document.getElementById('loginError').textContent = 'Vui lòng nhập đủ thông tin';
            return;
        }

        try {
            showLoading();
            const response = await callWebhook('auth', { username, password });

            if (response.success && response.session_token && response.expires_in) {
                setAuthToken(response.session_token, response.expires_in);
                updateAuthUI();
                hideLoginModal();
            } else {
                document.getElementById('loginError').textContent = response.message || 'Đăng nhập thất bại';
            }
        } catch (error) {
            console.error('Login error:', error);
            document.getElementById('loginError').textContent = 'Lỗi kết nối';
        } finally {
            hideLoading();
        }
    });

    inputForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!sessionToken) {
            alert('Vui lòng đăng nhập trước');
            showLoginModal();
            return;
        }

        const inputs = {
            product: document.getElementById('productService').value,
            customer: document.getElementById('targetCustomer').value,
            field: document.getElementById('businessField').value
        };

        try {
            showLoading();
            const validateResponse = await callWebhook('validate', inputs);

            if (validateResponse.errors) {
                validateResponse.errors.forEach(error => {
                    const field = document.getElementById(`${error.field}Error`);
                    const input = document.getElementById(error.field);
                    if (field && input) {
                        field.textContent = error.message;
                        input.classList.add('is-invalid');
                    }
                });
                return;
            }

            const generateResponse = await callWebhook('generate', inputs);

            if (generateResponse.success && generateResponse.topics) {
                generatedTopics = generateResponse.topics;
                displayGeneratedTopics();
                topicsSection.style.display = 'block';
                document.getElementById('inputSection').style.display = 'none';
            } else {
                alert('Lỗi khi tạo chủ đề: ' + (generateResponse.message || 'Không có dữ liệu'));
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    aiSelectBtn.addEventListener('click', async () => {
        try {
            showLoading();
            const response = await callWebhook('ai_select', { topics: generatedTopics });

            if (response.success && response.selectedIds) {
                document.querySelectorAll('.topic-checkbox').forEach(cb => {
                    cb.checked = false;
                    cb.closest('tr').classList.remove('selected-row');
                });

                response.selectedIds.forEach(id => {
                    const checkbox = document.querySelector(`.topic-checkbox[data-id="${id}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        checkbox.closest('tr').classList.add('selected-row');
                    }
                });
            }
        } catch (error) {
            console.error('AI select error:', error);
        } finally {
            hideLoading();
        }
    });

    confirmSelection.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.topic-checkbox:checked');
        selectedTopics = [];

        checkboxes.forEach(checkbox => {
            const id = checkbox.dataset.id;
            const topic = generatedTopics.find(t => t.id == id);
            if (topic) selectedTopics.push(topic);
        });

        if (selectedTopics.length !== 7) {
            alert('Vui lòng chọn chính xác 7 chủ đề');
            return;
        }

        try {
            showLoading();
            const response = await callWebhook('finalize', { topics: selectedTopics });

            if (response.success && response.content) {
                displayFinalContent(response.content);
                topicsSection.style.display = 'none';
                resultSection.style.display = 'block';
            }
        } catch (error) {
            console.error('Finalize error:', error);
        } finally {
            hideLoading();
        }
    });

    viewPrevious.addEventListener('click', async () => {
        try {
            showLoading();
            const response = await callWebhook('get_previous', {});

            if (response.success && response.content) {
                displayFinalContent(response.content);
            } else {
                alert('Không tìm thấy kết quả trước đó');
            }
        } catch (error) {
            console.error('Get previous error:', error);
        } finally {
            hideLoading();
        }
    });

    // ========== UTILITY FUNCTIONS ==========
    function showLoading() {
        let loadingDiv = document.getElementById('loadingOverlay');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'loadingOverlay';
            loadingDiv.className = 'loading';
            loadingDiv.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            `;
            document.body.appendChild(loadingDiv);
        }
        loadingDiv.style.display = 'flex';
    }

    function hideLoading() {
        const loadingDiv = document.getElementById('loadingOverlay');
        if (loadingDiv) loadingDiv.style.display = 'none';
    }

    function displayGeneratedTopics() {
        topicsTable.innerHTML = '';
        generatedTopics.forEach(topic => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="form-check-input topic-checkbox" data-id="${topic.id}"></td>
                <td>${topic.type}</td>
                <td>${topic.question}</td>
            `;

            row.addEventListener('click', function(e) {
                if (e.target.type !== 'checkbox') {
                    const checkbox = this.querySelector('.topic-checkbox');
                    checkbox.checked = !checkbox.checked;
                    this.classList.toggle('selected-row', checkbox.checked);
                }
            });

            topicsTable.appendChild(row);
        });
    }

    function displayFinalContent(contents) {
        contentAccordion.innerHTML = '';

        contents.forEach((content, index) => {
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';
            accordionItem.innerHTML = `
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                        ${content.question}
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" 
                     data-bs-parent="#contentAccordion">
                    <div class="accordion-body">
                        <p><strong>Chủ đề:</strong> ${content.topic}</p>
                        <p><strong>Nội dung:</strong> ${content.content}</p>
                        <p><strong>CTA:</strong> ${content.cta}</p>
                        <p><strong>Giai đoạn funnel:</strong> ${content.funnelStage}</p>
                    </div>
                </div>
            `;
            contentAccordion.appendChild(accordionItem);
        });
    }

    // ========== INIT ==========
    updateAuthUI();

    // Kiểm tra và làm mới token định kỳ
    setInterval(() => {
        if (sessionToken && tokenExpiry && (tokenExpiry - Date.now() < REFRESH_THRESHOLD)) {
            refreshToken();
        }
    }, 60000); // Kiểm tra mỗi phút
});