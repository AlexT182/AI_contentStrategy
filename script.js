document.addEventListener('DOMContentLoaded', function() {
    // Cấu hình webhook
    const WEBHOOK_URL = 'https://rabbitbase.alphabot.vn/webhook/36dbb972-ca19-48ac-bd79-8ab661b88d4f';
    
    // DOM Elements
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.querySelector('.close');
    const submitLogin = document.getElementById('submitLogin');
    const inputForm = document.getElementById('inputForm');
    const topicsSection = document.getElementById('topicsSection');
    const resultSection = document.getElementById('resultSection');
    const topicsTable = document.getElementById('topicsTable');
    const confirmSelection = document.getElementById('confirmSelection');
    const aiSelectBtn = document.getElementById('aiSelectBtn');
    const contentAccordion = document.getElementById('contentAccordion');
    const viewPrevious = document.getElementById('viewPrevious');
    
    // Biến toàn cục
    let sessionToken = localStorage.getItem('sessionToken');
    let generatedTopics = [];
    let selectedTopics = [];
    
    // Kiểm tra đăng nhập khi load trang
    if(sessionToken) {
        loginBtn.textContent = 'Đã đăng nhập';
        loginBtn.classList.add('btn-success');
        loginBtn.classList.remove('btn-outline-secondary');
    }
    
    // Xử lý modal đăng nhập
    loginBtn.addEventListener('click', () => {
        if(!sessionToken) {
            loginModal.style.display = 'block';
        }
    });
    
    closeModal.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
    
    // Xử lý submit đăng nhập
    submitLogin.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            showLoading();
            const response = await callWebhook('auth', { username, password });
            
            if(response.success) {
                sessionToken = response.token;
                localStorage.setItem('sessionToken', sessionToken);
                loginModal.style.display = 'none';
                loginBtn.textContent = 'Đã đăng nhập';
                loginBtn.classList.add('btn-success');
                loginBtn.classList.remove('btn-outline-secondary');
            } else {
                document.getElementById('loginError').textContent = response.message || 'Đăng nhập thất bại';
            }
        } catch(error) {
            console.error('Login error:', error);
            document.getElementById('loginError').textContent = 'Lỗi kết nối';
        } finally {
            hideLoading();
        }
    });
    
    // Xử lý submit form chính
    inputForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if(!sessionToken) {
            alert('Vui lòng đăng nhập trước');
            return;
        }
        
        const inputs = {
            product: document.getElementById('productService').value,
            customer: document.getElementById('targetCustomer').value,
            field: document.getElementById('businessField').value
        };
        
        try {
            showLoading();
            // Gọi validate trước
            const validateResponse = await callWebhook('validate', inputs);
            
            if(validateResponse.errors) {
                // Hiển thị lỗi
                validateResponse.errors.forEach(error => {
                    const field = document.getElementById(`${error.field}Error`);
                    const input = document.getElementById(error.field);
                    field.textContent = error.message;
                    input.classList.add('is-invalid');
                });
                return;
            }
            
            // Nếu validate thành công, tạo chủ đề
            const generateResponse = await callWebhook('generate', inputs);
            
            if(generateResponse.success) {
                generatedTopics = generateResponse.topics;
                displayGeneratedTopics();
                topicsSection.style.display = 'block';
                inputSection.style.display = 'none';
            } else {
                alert('Lỗi khi tạo chủ đề: ' + generateResponse.message);
            }
        } catch(error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra');
        } finally {
            hideLoading();
        }
    });
    
    // Xử lý chọn chủ đề bằng AI
    aiSelectBtn.addEventListener('click', async () => {
        try {
            showLoading();
            const response = await callWebhook('ai_select', { topics: generatedTopics });
            
            if(response.success) {
                // Bỏ chọn tất cả trước
                document.querySelectorAll('.topic-checkbox').forEach(cb => {
                    cb.checked = false;
                    cb.closest('tr').classList.remove('selected-row');
                });
                
                // Chọn các topic được AI chọn
                response.selectedIds.forEach(id => {
                    const checkbox = document.querySelector(`.topic-checkbox[data-id="${id}"]`);
                    if(checkbox) {
                        checkbox.checked = true;
                        checkbox.closest('tr').classList.add('selected-row');
                    }
                });
            }
        } catch(error) {
            console.error('AI select error:', error);
        } finally {
            hideLoading();
        }
    });
    
    // Xác nhận lựa chọn
    confirmSelection.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.topic-checkbox:checked');
        selectedTopics = [];
        
        checkboxes.forEach(checkbox => {
            const id = checkbox.dataset.id;
            const topic = generatedTopics.find(t => t.id == id);
            if(topic) selectedTopics.push(topic);
        });
        
        if(selectedTopics.length !== 7) {
            alert('Vui lòng chọn chính xác 7 chủ đề');
            return;
        }
        
        try {
            showLoading();
            const response = await callWebhook('finalize', { topics: selectedTopics });
            
            if(response.success) {
                displayFinalContent(response.content);
                topicsSection.style.display = 'none';
                resultSection.style.display = 'block';
            }
        } catch(error) {
            console.error('Finalize error:', error);
        } finally {
            hideLoading();
        }
    });
    
    // Xem kết quả lần trước
    viewPrevious.addEventListener('click', async () => {
        try {
            showLoading();
            const response = await callWebhook('get_previous', {});
            
            if(response.success && response.content) {
                displayFinalContent(response.content);
            } else {
                alert('Không tìm thấy kết quả trước đó');
            }
        } catch(error) {
            console.error('Get previous error:', error);
        } finally {
            hideLoading();
        }
    });
    
    // Hàm hiển thị loading
    function showLoading() {
        let loadingDiv = document.getElementById('loadingOverlay');
        if(!loadingDiv) {
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
        if(loadingDiv) loadingDiv.style.display = 'none';
    }
    
    // Hàm gọi webhook tổng hợp
    async function callWebhook(action, data) {
        const payload = {
            action,
            sessionToken,
            ...data
        };
        
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        return await response.json();
    }
    
    // Hiển thị danh sách chủ đề
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
                if(e.target.type !== 'checkbox') {
                    const checkbox = this.querySelector('.topic-checkbox');
                    checkbox.checked = !checkbox.checked;
                    this.classList.toggle('selected-row', checkbox.checked);
                }
            });
            
            topicsTable.appendChild(row);
        });
    }
    
    // Hiển thị nội dung cuối cùng
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
});