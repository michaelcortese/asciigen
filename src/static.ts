// Static file content for the dashboard

const CSS = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
    color: #333;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    min-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    text-align: center;
}

header h1 {
    font-size: 2.5em;
    margin-bottom: 10px;
}

.subtitle {
    font-size: 1.1em;
    opacity: 0.9;
}

.main-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 20px;
    flex: 1;
    overflow: hidden;
}

@media (max-width: 1024px) {
    .main-content {
        grid-template-columns: 1fr;
    }
}

.chat-panel, .ascii-panel {
    display: flex;
    flex-direction: column;
    background: #f8f9fa;
    border-radius: 15px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
}

.chat-header, .ascii-header {
    background: white;
    padding: 20px;
    border-bottom: 2px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chat-header h2, .ascii-header h2 {
    font-size: 1.5em;
    color: #667eea;
}

.ascii-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.ascii-controls label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.9em;
}

.ascii-controls input[type="number"] {
    width: 80px;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 5px;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.message {
    padding: 12px 16px;
    border-radius: 12px;
    max-width: 85%;
    word-wrap: break-word;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.message.user {
    background: #667eea;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
}

.message.assistant {
    background: white;
    color: #333;
    align-self: flex-start;
    border: 1px solid #e0e0e0;
    border-bottom-left-radius: 4px;
}

.message.system {
    background: #fff3cd;
    color: #856404;
    align-self: center;
    font-size: 0.9em;
    font-style: italic;
}

.chat-input-container {
    display: flex;
    gap: 10px;
    padding: 20px;
    background: white;
    border-top: 2px solid #e0e0e0;
}

#chatInput {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 25px;
    font-size: 1em;
    outline: none;
    transition: border-color 0.3s;
}

#chatInput:focus {
    border-color: #667eea;
}

.btn-primary, .btn-secondary {
    padding: 12px 24px;
    border: none;
    border-radius: 25px;
    font-size: 1em;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: 600;
}

.btn-primary {
    background: #667eea;
    color: white;
}

.btn-primary:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
    background: #6c757d;
    color: white;
    padding: 8px 16px;
    font-size: 0.9em;
}

.btn-secondary:hover {
    background: #5a6268;
}

.ascii-output {
    flex: 1;
    overflow: auto;
    padding: 20px;
    background: #1e1e1e;
    color: #00ff00;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    line-height: 1.2;
    white-space: pre;
    border-radius: 0 0 15px 15px;
}

.ascii-output .placeholder {
    color: #666;
    text-align: center;
    font-style: italic;
    font-family: 'Segoe UI', sans-serif;
}

.loading {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    color: white;
}

.loading.hidden {
    display: none;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 5px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.chat-messages::-webkit-scrollbar,
.ascii-output::-webkit-scrollbar {
    width: 8px;
}

.chat-messages::-webkit-scrollbar-track,
.ascii-output::-webkit-scrollbar-track {
    background: #f1f1f1;
}

.chat-messages::-webkit-scrollbar-thumb,
.ascii-output::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb:hover,
.ascii-output::-webkit-scrollbar-thumb:hover {
    background: #555;
}`;

const JS = `// Generate a session ID for this user session
const sessionId = \`session_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const clearChatButton = document.getElementById('clearChat');
const asciiOutput = document.getElementById('asciiOutput');
const colsInput = document.getElementById('colsInput');
const copyAsciiButton = document.getElementById('copyAscii');
const downloadAsciiButton = document.getElementById('downloadAscii');
const loadingIndicator = document.getElementById('loadingIndicator');

// Load conversation history on page load
loadConversationHistory();

// Event listeners
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
clearChatButton.addEventListener('click', clearChat);
copyAsciiButton.addEventListener('click', copyAscii);
downloadAsciiButton.addEventListener('click', downloadAsciiImage);

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to UI
    addMessage('user', message);
    chatInput.value = '';
    
    // Show loading
    setLoading(true);

    try {
        // Send to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                sessionId,
            }),
        });

        const data = await response.json();

        if (data.error) {
            addMessage('system', \`Error: \${data.error}\`);
            setLoading(false);
            return;
        }

        // Add assistant response
        if (data.response) {
            addMessage('assistant', data.response);
        }

        // If ASCII art was generated, display it
        if (data.ascii) {
            displayAscii(data.ascii);
            addMessage('system', 'ASCII art generated! Check the output panel.');
        }

    } catch (error) {
        addMessage('system', \`Error: \${error.message}\`);
    } finally {
        setLoading(false);
    }
}

function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = \`message \${role}\`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Save to conversation history
    saveMessage(role, content);
}

function displayAscii(asciiText) {
    asciiOutput.innerHTML = '';
    const pre = document.createElement('pre');
    pre.textContent = asciiText;
    asciiOutput.appendChild(pre);
}

function setLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

async function loadConversationHistory() {
    try {
        const response = await fetch(\`/api/conversation?sessionId=\${sessionId}\`);
        const conversation = await response.json();
        
        if (conversation.messages && conversation.messages.length > 0) {
            chatMessages.innerHTML = '';
            conversation.messages.forEach(msg => {
                addMessage(msg.role, msg.content);
            });
        }
    } catch (error) {
        console.error('Failed to load conversation:', error);
    }
}

async function saveMessage(role, content) {
    try {
        await fetch('/api/conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId,
                role,
                content,
            }),
        });
    } catch (error) {
        console.error('Failed to save message:', error);
    }
}

async function clearChat() {
    if (!confirm('Are you sure you want to clear the chat?')) return;

    try {
        await fetch(\`/api/conversation?sessionId=\${sessionId}\`, {
            method: 'DELETE',
        });
        chatMessages.innerHTML = '';
        asciiOutput.innerHTML = '<p class="placeholder">ASCII art will appear here...</p>';
    } catch (error) {
        console.error('Failed to clear chat:', error);
    }
}

function copyAscii() {
    const asciiText = asciiOutput.textContent.trim();
    if (!asciiText || asciiText === 'ASCII art will appear here...') {
        alert('No ASCII art to copy!');
        return;
    }

    navigator.clipboard.writeText(asciiText).then(() => {
        const btn = copyAsciiButton;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#28a745';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        alert('Failed to copy: ' + err.message);
    });
}

function downloadAsciiImage() {
    const asciiText = asciiOutput.textContent.trim();
    if (!asciiText || asciiText === 'ASCII art will appear here...') {
        alert('No ASCII art to download!');
        return;
    }

    // Create a canvas and render ASCII art as an image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const lines = asciiText.split('\\n');
    const maxWidth = Math.max(...lines.map(l => l.length));
    const lineHeight = 12;
    const charWidth = 6;
    
    canvas.width = maxWidth * charWidth;
    canvas.height = lines.length * lineHeight;
    
    // Background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Text
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px Courier New';
    ctx.textBaseline = 'top';
    
    lines.forEach((line, index) => {
        ctx.fillText(line, 0, index * lineHeight);
    });
    
    // Download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`ascii-art-\${Date.now()}.png\`;
        a.click();
        URL.revokeObjectURL(url);
    });
}`;

export const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASCIIGen - AI-Powered ASCII Art Generator</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎨 ASCIIGen</h1>
            <p class="subtitle">AI-Powered ASCII Art Generator with Chat</p>
        </header>

        <div class="main-content">
            <div class="chat-panel">
                <div class="chat-header">
                    <h2>Chat with AI</h2>
                    <button id="clearChat" class="btn-secondary">Clear Chat</button>
                </div>
                <div id="chatMessages" class="chat-messages"></div>
                <div class="chat-input-container">
                    <input 
                        type="text" 
                        id="chatInput" 
                        placeholder="Ask me to generate ASCII art or chat with me..." 
                        autocomplete="off"
                    />
                    <button id="sendButton" class="btn-primary">Send</button>
                </div>
            </div>

            <div class="ascii-panel">
                <div class="ascii-header">
                    <h2>ASCII Art Output</h2>
                    <div class="ascii-controls">
                        <label>
                            Width (cols):
                            <input type="number" id="colsInput" value="100" min="20" max="200" />
                        </label>
                        <button id="copyAscii" class="btn-secondary">Copy Text</button>
                        <button id="downloadAscii" class="btn-secondary">Download Image</button>
                    </div>
                </div>
                <div id="asciiOutput" class="ascii-output">
                    <p class="placeholder">ASCII art will appear here...</p>
                </div>
            </div>
        </div>

        <div id="loadingIndicator" class="loading hidden">
            <div class="spinner"></div>
            <p>Processing...</p>
        </div>
    </div>

    <script>${JS}</script>
</body>
</html>`;
