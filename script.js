document.addEventListener('DOMContentLoaded', function() {
    const inputForm = document.getElementById('inputForm');
    const topicsSection = document.getElementById('topicsSection');
    const selectedTopicsSection = document.getElementById('selectedTopicsSection');
    const topicsTable = document.getElementById('topicsTable');
    const confirmSelection = document.getElementById('confirmSelection');
    const topicsAccordion = document.getElementById('topicsAccordion');
    
    let generatedTopics = [];
    let selectedTopics = [];
    
    // Xử lý submit form
    inputForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const productService = document.getElementById('productService').value;
        const targetCustomer = document.getElementById('targetCustomer').value;
        const businessField = document.getElementById('businessField').value;
        
        // Gửi data tới N8n webhook (thay URL bằng webhook thực tế của bạn)
        fetch('YOUR_N8N_WEBHOOK_URL', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productService,
                targetCustomer,
                businessField
            })
        })
        .then(response => response.json())
        .then(data => {
            generatedTopics = data.topics; // Giả sử API trả về array topics
            displayGeneratedTopics();
            topicsSection.style.display = 'block';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi gửi dữ liệu');
        });
    });
    
    // Hiển thị 30 chủ đề
    function displayGeneratedTopics() {
        topicsTable.innerHTML = '';
        generatedTopics.forEach((topic, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td>${topic.type || 'N/A'}</td>
                <td>${topic.value || 'N/A'}</td>
                <td>${topic.question || 'N/A'}</td>
                <td><input type="checkbox" class="form-check-input topic-checkbox"></td>
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
    
    // Xác nhận lựa chọn 7 chủ đề
    confirmSelection.addEventListener('click', function() {
        const checkboxes = document.querySelectorAll('.topic-checkbox:checked');
        
        if (checkboxes.length !== 7) {
            alert('Vui lòng chọn chính xác 7 chủ đề');
            return;
        }
        
        selectedTopics = [];
        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const index = row.dataset.index;
            selectedTopics.push(generatedTopics[index]);
        });
        
        displaySelectedTopics();
        selectedTopicsSection.style.display = 'block';
    });
    
    // Hiển thị 7 chủ đề đã chọn
    function displaySelectedTopics() {
        topicsAccordion.innerHTML = '';
        
        selectedTopics.forEach((topic, index) => {
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';
            accordionItem.innerHTML = `
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                        ${topic.question}
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" 
                     data-bs-parent="#topicsAccordion">
                    <div class="accordion-body">
                        <table class="table">
                            <tr>
                                <th>Topic</th>
                                <td>${topic.topic || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>Content</th>
                                <td>${topic.content || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>CTA</th>
                                <td>${topic.cta || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>Funnel Stage</th>
                                <td>${topic.funnelStage || 'N/A'}</td>
                            </tr>
                        </table>
                    </div>
                </div>
            `;
            
            topicsAccordion.appendChild(accordionItem);
        });
    }
});