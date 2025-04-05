document.addEventListener('DOMContentLoaded', function() {
    // Element references
    const requestForm = document.getElementById('request-form');
    const sendButton = document.getElementById('send-request');
    const clearButton = document.getElementById('clear-form');
    const requestMethod = document.getElementById('request-method');
    const requestUrl = document.getElementById('request-url');
    const requestBody = document.getElementById('request-body');
    const contentType = document.getElementById('content-type');
    const headersContainer = document.getElementById('headers-container');
    const addHeaderButton = document.getElementById('add-header');
    const requestHistory = document.getElementById('request-history');
    const responseMeta = document.getElementById('response-meta');
    const responseTime = document.getElementById('response-time');
    const responseSize = document.getElementById('response-size');
    const responseStatusContainer = document.getElementById('response-status-container');
    const responseStatusBadge = document.getElementById('response-status-badge');
    const responseStatusText = document.getElementById('response-status-text');
    const responseBodyWrapper = document.getElementById('response-body-wrapper');
    const responseHeadersWrapper = document.getElementById('response-headers-wrapper');
    const responseBody = document.getElementById('response-body');
    const responseHeaders = document.getElementById('response-headers');
    const responseLoading = document.getElementById('response-loading');
    const responseError = document.getElementById('response-error');
    const errorMessage = document.getElementById('error-message');
    const responseEmpty = document.getElementById('response-empty');
    const copyCurlButton = document.getElementById('copy-curl');

    let curlCommand = '';

    // Initialize and load history
    loadRequestHistory();

    // Event listeners
    sendButton.addEventListener('click', sendRequest);
    clearButton.addEventListener('click', clearForm);
    addHeaderButton.addEventListener('click', addHeaderRow);
    copyCurlButton.addEventListener('click', copyCurl);

    // Initial header row
    if (headersContainer.querySelectorAll('.header-row').length === 0) {
        addHeaderRow();
    }

    // Add event delegation for header removal
    headersContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-header') || e.target.closest('.remove-header')) {
            const headerRow = e.target.closest('.header-row');
            if (headerRow) {
                headerRow.remove();
            }
        }
    });

    // Add event delegation for history items
    requestHistory.addEventListener('click', function(e) {
        const historyItem = e.target.closest('.list-group-item');
        if (historyItem) {
            const url = historyItem.dataset.url;
            const method = historyItem.dataset.method;
            if (url && method) {
                requestUrl.value = url;
                requestMethod.value = method;
            }
        }
    });

    // Function to add a new header row
    function addHeaderRow() {
        const headerRow = document.createElement('div');
        headerRow.className = 'header-row input-group mb-2';
        headerRow.innerHTML = `
            <input type="text" class="form-control header-key" placeholder="Header name">
            <input type="text" class="form-control header-value" placeholder="Header value">
            <button type="button" class="btn btn-outline-danger remove-header">
                <i class="fas fa-times"></i>
            </button>
        `;
        headersContainer.appendChild(headerRow);
    }

    // Function to load request history
    function loadRequestHistory() {
        fetch('/get_history')
            .then(response => response.json())
            .then(history => {
                requestHistory.innerHTML = '';
                if (history.length === 0) {
                    requestHistory.innerHTML = `
                        <div class="list-group-item text-center text-muted py-4">
                            <i class="fas fa-history fa-2x mb-2"></i>
                            <p>No request history yet</p>
                        </div>
                    `;
                    return;
                }

                history.forEach(item => {
                    const statusClass = getStatusClass(item.status);
                    const historyItem = document.createElement('a');
                    historyItem.href = '#';
                    historyItem.className = 'list-group-item list-group-item-action';
                    historyItem.dataset.url = item.url;
                    historyItem.dataset.method = item.method;
                    historyItem.innerHTML = `
                        <div class="d-flex w-100 justify-content-between align-items-center">
                            <div>
                                <span class="badge rounded-pill bg-secondary me-2">${item.method}</span>
                                <span class="text-truncate d-inline-block" style="max-width: 350px;">${item.url}</span>
                            </div>
                            <div>
                                <span class="badge rounded-pill ${statusClass}">${item.status}</span>
                                <small class="text-muted ms-2">${item.timestamp}</small>
                            </div>
                        </div>
                    `;
                    requestHistory.appendChild(historyItem);
                });
            })
            .catch(error => {
                console.error('Error loading history:', error);
            });
    }

    // Function to send the API request
    function sendRequest() {
        // Validate URL
        if (!requestUrl.value) {
            showError('URL is required');
            return;
        }

        // Collect headers
        const headers = [];
        document.querySelectorAll('.header-row').forEach(row => {
            const keyInput = row.querySelector('.header-key');
            const valueInput = row.querySelector('.header-value');
            if (keyInput.value) {
                headers.push({
                    key: keyInput.value,
                    value: valueInput.value
                });
            }
        });

        // Prepare request data
        const requestData = {
            url: requestUrl.value,
            method: requestMethod.value,
            headers: headers,
            contentType: contentType.value,
            body: requestBody.value
        };

        // Show loading state
        showLoading(true);
        hideError();
        hideResponse();

        // Send the request
        fetch('/send_request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            displayResponse(data);
            loadRequestHistory(); // Refresh history after successful request
        })
        .catch(error => {
            showLoading(false);
            showError('Failed to send request: ' + error.message);
            console.error('Error:', error);
        });
    }

    // Function to display the response
    function displayResponse(data) {
        // Store curl command for copy function
        curlCommand = data.curl;
        
        // Show response containers
        responseStatusContainer.classList.remove('d-none');
        responseMeta.classList.remove('d-none');
        responseBodyWrapper.classList.remove('d-none');
        responseHeadersWrapper.classList.remove('d-none');
        responseEmpty.classList.add('d-none');
        
        // Update status
        responseStatusBadge.textContent = data.status;
        responseStatusBadge.className = `badge rounded-pill ${getStatusClass(data.status)}`;
        responseStatusText.textContent = data.statusText;
        
        // Update metadata
        responseTime.textContent = `${data.time} ms`;
        responseSize.textContent = formatBytes(data.size);
        
        // Update body with proper syntax highlighting
        responseBody.textContent = data.body;
        responseBody.className = 'language-json'; // Default to JSON
        
        // Determine language for syntax highlighting
        const contentTypeHeader = Object.keys(data.headers)
            .find(key => key.toLowerCase() === 'content-type');
        
        if (contentTypeHeader) {
            const contentType = data.headers[contentTypeHeader].toLowerCase();
            if (contentType.includes('application/json')) {
                responseBody.className = 'language-json';
            } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
                responseBody.className = 'language-xml';
            } else if (contentType.includes('text/html')) {
                responseBody.className = 'language-html';
            } else if (contentType.includes('text/css')) {
                responseBody.className = 'language-css';
            } else if (contentType.includes('application/javascript')) {
                responseBody.className = 'language-javascript';
            } else {
                responseBody.className = 'language-text';
            }
        }
        
        // Apply Prism syntax highlighting
        Prism.highlightElement(responseBody);
        
        // Update headers table
        responseHeaders.innerHTML = '';
        Object.entries(data.headers).forEach(([key, value]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-nowrap fw-bold">${key}</td>
                <td>${value}</td>
            `;
            responseHeaders.appendChild(row);
        });
    }

    // Function to clear the form
    function clearForm() {
        requestUrl.value = '';
        requestBody.value = '';
        
        // Reset headers
        headersContainer.innerHTML = '';
        addHeaderRow();
        
        // Reset method
        requestMethod.value = 'GET';
        
        // Reset content type
        contentType.value = 'application/json';
        
        // Hide response
        hideResponse();
        hideError();
    }

    // Function to copy curl command
    function copyCurl() {
        if (!curlCommand) return;
        
        navigator.clipboard.writeText(curlCommand)
            .then(() => {
                const originalText = copyCurlButton.innerHTML;
                copyCurlButton.innerHTML = '<i class="fas fa-check me-1"></i> Copied!';
                setTimeout(() => {
                    copyCurlButton.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy:', err);
            });
    }

    // Helper functions
    function showLoading(isLoading) {
        if (isLoading) {
            responseLoading.classList.remove('d-none');
            sendButton.disabled = true;
        } else {
            responseLoading.classList.add('d-none');
            sendButton.disabled = false;
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        responseError.classList.remove('d-none');
        responseEmpty.classList.add('d-none');
    }

    function hideError() {
        responseError.classList.add('d-none');
    }

    function hideResponse() {
        responseStatusContainer.classList.add('d-none');
        responseMeta.classList.add('d-none');
        responseBodyWrapper.classList.add('d-none');
        responseHeadersWrapper.classList.add('d-none');
        responseEmpty.classList.remove('d-none');
    }

    function getStatusClass(status) {
        if (status < 300) return 'bg-success';
        if (status < 400) return 'bg-warning';
        return 'bg-danger';
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
