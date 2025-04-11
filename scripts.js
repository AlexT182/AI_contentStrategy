const WEBHOOK_URL = 'https://rabbitbase.alphabot.vn/webhook/36dbb972-ca19-48ac-bd79-8ab661b88d4f';
let sheetLink = ''; // Lưu link Google Sheet từ response

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('login-message');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auth', username, password })
        });
        const result = await response.json();

        if (result.status) {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('main').style.display = 'block';
            document.getElementById('username-display').textContent = result.username;
            localStorage.setItem('userID', result.userID);
            message.textContent = '';
        } else {
            message.textContent = result.message || 'Đăng nhập thất bại';
        }
    } catch (error) {
        message.textContent = 'Lỗi kết nối, vui lòng thử lại';
    }
}

function logout() {
    localStorage.removeItem('userID');
    document.getElementById('main').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-message').textContent = '';
}

async function submitInput() {
    const userID = localStorage.getItem('userID');
    const product = document.getElementById('product').value;
    const targetCust = document.getElementById('targetCust').value;
    const field = document.getElementById('field').value;
    const message = document.getElementById('input-message');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'validateInput', userID, product, targetCust, field })
        });
        const result = await response.json();

        if (result.status) {
            message.textContent = 'Dữ liệu hợp lệ!';
            await loadQuestions();
        } else {
            message.textContent = result.message || 'Dữ liệu không hợp lệ';
        }
    } catch (error) {
        message.textContent = 'Lỗi kết nối, vui lòng thử lại';
    }
}

async function loadQuestions() {
    const userID = localStorage.getItem('userID');
    const message = document.getElementById('question-message');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getQuestions', userID })
        });
        const result = await response.json();

        if (result.status) {
            document.getElementById('input-form').style.display = 'none';
            document.getElementById('questions').style.display = 'block';
            const questionList = document.getElementById('question-list');
            questionList.innerHTML = result.questions.map(q => `
                <div>
                    <input type="checkbox" class="question-checkbox" data-id="${q.id}" />
                    <input type="text" value="${q.question}" data-id="${q.id}" />
                </div>
            `).join('');
            message.textContent = '';
        } else {
            message.textContent = result.message || 'Không tải được câu hỏi';
        }
    } catch (error) {
        message.textContent = 'Lỗi kết nối, vui lòng thử lại';
    }
}

async function userChoose() {
    const selected = document.querySelectorAll('.question-checkbox:checked');
    const message = document.getElementById('question-message');

    if (selected.length !== 7) {
        message.textContent = 'Vui lòng chọn đúng 7 câu hỏi';
        return;
    }

    const questions = Array.from(selected).map(cb => ({
        id: cb.dataset.id,
        question: cb.parentElement.querySelector('input[type="text"]').value
    }));
    const userID = localStorage.getItem('userID');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'userChoice', userID, questions })
        });
        const result = await response.json();

        if (result.status) {
            sheetLink = result.sheetLink;
            await loadSNSContent();
        } else {
            message.textContent = result.message || 'Lỗi khi gửi lựa chọn';
        }
    } catch (error) {
        message.textContent = 'Lỗi kết nối, vui lòng thử lại';
    }
}

async function aiChoose() {
    const userID = localStorage.getItem('userID');
    const message = document.getElementById('question-message');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'aiChoice', userID })
        });
        const result = await response.json();

        if (result.status) {
            sheetLink = result.sheetLink;
            await loadSNSContent();
        } else {
            message.textContent = result.message || 'Lỗi khi nhờ AI chọn';
        }
    } catch (error) {
        message.textContent = 'Lỗi kết nối, vui lòng thử lại';
    }
}

async function loadSNSContent() {
    const userID = localStorage.getItem('userID');
    const message = document.getElementById('sns-message');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getSNSContent', userID })
        });
        const result = await response.json();

        if (result.status) {
            document.getElementById('questions').style.display = 'none';
            document.getElementById('sns-content').style.display = 'block';
            const contentList = document.getElementById('content-list');
            contentList.innerHTML = result.contents.map(c => `
                <div>
                    <p><strong>Câu hỏi:</strong> ${c.question}</p>
                    <p><strong>Chủ đề:</strong> ${c.topic}</p>
                    <p><strong>Nội dung:</strong> ${c.content}</p>
                    <p><strong>CTA:</strong> ${c.cta}</p>
                    <p><strong>Giai đoạn:</strong> ${c.funnel_stage}</p>
                </div>
            `).join('');
            sheetLink = result.sheetLink;
            message.textContent = '';
        } else {
            message.textContent = result.message || 'Không tải được nội dung';
        }
    } catch (error) {
        message.textContent = 'Lỗi kết nối, vui lòng thử lại';
    }
}

function getSheetLink() {
    if (sheetLink) {
        alert('Link Google Sheet: ' + sheetLink);
    } else {
        document.getElementById('sns-message').textContent = 'Không có link Google Sheet';
    }
}

async function loadOldData() {
    const userID = localStorage.getItem('userID');
    const message = document.getElementById('sns-message');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'loadOldData', userID })
        });
        const result = await response.json();

        if (result.status) {
            document.getElementById('questions').style.display = 'none';
            document.getElementById('sns-content').style.display = 'block';
            const contentList = document.getElementById('content-list');
            contentList.innerHTML = result.contents.map(c => `
                <div>
                    <p><strong>Câu hỏi:</strong> ${c.question}</p>
                    <p><strong>Chủ đề:</strong> ${c.topic}</p>
                    <p><strong>Nội dung:</strong> ${c.content}</p>
                    <p><strong>CTA:</strong> ${c.cta}</p>
                    <p><strong>Giai đoạn:</strong> ${c.funnel_stage}</p>
                </div>
            `).join('');
            sheetLink = result.sheetLink;
            message.textContent = '';
        } else {
            message.textContent = result.message || 'Không có dữ liệu cũ';
        }
    } catch (error) {
        message.textContent = 'Lỗi kết nối, vui lòng thử lại';
    }
}