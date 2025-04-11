document.addEventListener('DOMContentLoaded', function() {
    const WEBHOOK_URL = 'https://rabbitbase.alphabot.vn/webhook/36dbb972-ca19-48ac-bd79-8ab661b88d4f';

    const inputForm = document.getElementById('inputForm');
    const questionsSection = document.getElementById('questionsSection');
    const questionsTable = document.getElementById('questionsTable');
    const aiSelectBtn = document.getElementById('aiSelectBtn');
    const submitQuestionsBtn = document.getElementById('submitQuestionsBtn');
    const contentsSection = document.getElementById('contentsSection');
    const contentsTable = document.getElementById('contentsTable');

    async function callWebhook(action, data) {
        const payload = { action, ...data };
        console.log('Sending payload:', payload);
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const text = await response.text();
            console.log('Raw response:', text);
            const result = text ? JSON.parse(text) : {};
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return result;
        } catch (error) {
            console.error(`API call failed for ${action}:`, error);
            throw error;
        }
    }

    inputForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productService = document.getElementById('productService').value;
        const targetCustomer = document.getElementById('targetCustomer').value;
        const businessField = document.getElementById('businessField').value;

        try {
            showLoading();
            const response = await callWebhook('generate_questions', { productService, targetCustomer, businessField });
            if (response.success && response.questions) {
                displayQuestions(response.questions);
                questionsSection.style.display = 'block';
                contentsSection.style.display = 'none';
            } else {
                alert('Không tạo được câu hỏi: ' + (response.message || 'Lỗi không xác định'));
            }
        } catch (error) {
            alert('Có lỗi xảy ra khi tạo câu hỏi');
        } finally {
            hideLoading();
        }
    });

    aiSelectBtn.addEventListener('click', async () => {
        try {
            showLoading();
            const response = await callWebhook('ai_select', {});
            if (response.success && response.questions) {
                displayQuestions(response.questions);
                checkSelectedCount();
            }
        } catch (error) {
            alert('Có lỗi xảy ra khi AI chọn câu');
        } finally {
            hideLoading();
        }
    });

    submitQuestionsBtn.addEventListener('click', async () => {
        const selectedQuestions = Array.from(questionsTable.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => JSON.parse(cb.dataset.question));
        if (selectedQuestions.length !== 7) {
            alert('Vui lòng chọn đúng 7 câu hỏi!');
            return;
        }

        try {
            showLoading();
            const response = await callWebhook('generate_contents', { questions: selectedQuestions });
            if (response.success && response.contents) {
                displayContents(response.contents);
                questionsSection.style.display = 'none';
                contentsSection.style.display = 'block';
            }
        } catch (error) {
            alert('Có lỗi xảy ra khi tạo nội dung');
        } finally {
            hideLoading();
        }
    });

    function displayQuestions(questions) {
        questionsTable.innerHTML = '';
        questions.forEach(q => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${q.type}</td>
                <td>${q.value}</td>
                <td>${q.question}</td>
                <td><input type="checkbox" ${q.selected ? 'checked' : ''} data-question='${JSON.stringify(q)}'></td>
            `;
            questionsTable.appendChild(row);
        });
        questionsTable.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', checkSelectedCount);
        });
    }

    function checkSelectedCount() {
        const selectedCount = questionsTable.querySelectorAll('input[type="checkbox"]:checked').length;
        submitQuestionsBtn.disabled = selectedCount !== 7;
    }

    function displayContents(contents) {
        contentsTable.innerHTML = '';
        contents.forEach(c => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${c.question}</td>
                <td>${c.topic}</td>
                <td>${c.content}</td>
                <td>${c.cta}</td>
                <td>${c.funnel_stage}</td>
            `;
            contentsTable.appendChild(row);
        });
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
});