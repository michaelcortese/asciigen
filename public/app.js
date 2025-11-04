// Generate a session ID for this user session
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
            addMessage('system', `Error: ${data.error}`);
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
        addMessage('system', `Error: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
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
        const response = await fetch(`/api/conversation?sessionId=${sessionId}`);
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
        await fetch(`/api/conversation?sessionId=${sessionId}`, {
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
        btn.textContent = '[Copied]';
        setTimeout(() => {
            btn.textContent = originalText;
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
    const lines = asciiText.split('\n');
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
        a.download = `ascii-art-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

