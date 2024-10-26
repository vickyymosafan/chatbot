let currentCode = '';
let generatedCode = {};

// Tambahkan variabel baru di bagian atas file
const previewToggle = document.querySelector('.preview-toggle');
const previewColumn = document.querySelector('.preview-column');
const chatColumn = document.querySelector('.chat-column');

function createMessageElement(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-container ${role}-message-container`;
    const message = document.createElement('div');
    message.className = `message ${role}-message`;
    
    if (role === 'bot' && content.includes('```')) {
        // Pesan bot yang berisi kode
        message.innerHTML = formatMessage(content);
        if (Object.keys(generatedCode).length > 0) {
            const fileCards = createFileCards();
            message.innerHTML += fileCards;
        }
    } else {
        // Pesan biasa tanpa kode
        message.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
    }
    
    messageDiv.appendChild(message);
    return messageDiv;
}

function createFileCards() {
    let cardsHTML = '<div class="file-cards">';
    for (const [filename, codeInfo] of Object.entries(generatedCode)) {
        cardsHTML += `
            <div class="file-card" data-filename="${filename}">
                <div class="file-icon"><i class="fas fa-file-code"></i></div>
                <div class="file-name">${filename}</div>
                <div class="file-language">${codeInfo.language}</div>
            </div>
        `;
    }
    cardsHTML += '</div>';
    return cardsHTML;
}

function formatMessage(content) {
    return content.replace(/```(\w+)?\s*(.+?)\n([\s\S]+?)\n```/g, function(match, language, filename, code) {
        currentCode = code.trim();
        
        // Simpan kode yang digenerate berdasarkan nama file
        if (filename) {
            generatedCode[filename] = {
                language: language || '',
                code: currentCode
            };
        }
        
        updateCodeView(currentCode, language);
        return ''; // Menghapus blok kode dari pesan chat
    }).replace(/\n/g, '<br>');
}

function combineGeneratedCode() {
    let combinedCode = '';
    const htmlStructure = {
        'doctype': '<!DOCTYPE html>\n',
        'html': '<html lang="id">\n',
        'head': '<head>\n',
        'body': '<body>\n',
        'script': '',
        'style': ''
    };
    
    for (const [filename, codeInfo] of Object.entries(generatedCode)) {
        const { language, code } = codeInfo;
        
        if (language === 'html') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(code, 'text/html');
            
            // Ekstrak bagian-bagian HTML
            const headContent = doc.querySelector('head');
            if (headContent) htmlStructure.head += indentCode(headContent.innerHTML, 1);
            
            const bodyContent = doc.querySelector('body');
            if (bodyContent) htmlStructure.body += indentCode(bodyContent.innerHTML, 1);
            
        } else if (language === 'css') {
            htmlStructure.style += `  <style>\n${indentCode(code, 2)}  </style>\n`;
        } else if (language === 'javascript') {
            htmlStructure.script += `  <script>\n${indentCode(code, 2)}  </script>\n`;
        } else {
            // Untuk bahasa lain, tambahkan sebagai komentar
            combinedCode += `<!-- File: ${filename} (${language}) -->\n${indentCode(code, 0)}\n\n`;
        }

    }
    
    // Gabungkan semua bagian menjadi satu struktur HTML
    combinedCode = `${htmlStructure.doctype}${htmlStructure.html}${htmlStructure.head}${htmlStructure.style}${htmlStructure.head.endsWith('>\n') ? '' : '  '}${htmlStructure.head.endsWith('>\n') ? '' : '</head>\n'}${htmlStructure.body}${htmlStructure.script}${htmlStructure.body.endsWith('>\n') ? '' : '</body>\n'}</html>`;
    
    return combinedCode.trim();
}

function indentCode(code, indentLevel) {
    const indent = '  '.repeat(indentLevel);
    return code.split('\n').map(line => `${indent}${line}`).join('\n') + '\n';
}

function updateCodeView(code, language) {
    const codeContent = document.querySelector('#code-content pre code');
    const combinedCode = combineGeneratedCode();
    codeContent.textContent = combinedCode;
    codeContent.className = 'language-html';
    if (window.hljs) {
        hljs.highlightElement(codeContent);
    }
    
    // Perbarui pratinjau hasil dengan mengirimkan 'multiple' sebagai bahasa
    updateResultPreview(combinedCode, 'multiple');
}

function updateResultPreview(code, language) {
    const resultPreview = document.getElementById('result-preview');
    
    // Bersihkan preview sebelumnya
    resultPreview.innerHTML = '';

    if (language === 'html' || language === 'multiple') {
        // Buat iframe untuk menampilkan HTML, CSS, dan JavaScript
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        resultPreview.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        
        // Gabungkan HTML, CSS, dan JavaScript
        const combinedCode = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>${generatedCode['style.css'] ? generatedCode['style.css'].code : ''}</style>
            </head>
            <body>
                ${code}
                <script>${generatedCode['script.js'] ? generatedCode['script.js'].code : ''}</script>
            </body>
            </html>
        `;
        
        iframeDoc.write(combinedCode);
        iframeDoc.close();
    } else {
        // Untuk bahasa lain, tampilkan kode sebagai teks biasa
        const preElement = document.createElement('pre');
        preElement.textContent = code;
        resultPreview.appendChild(preElement);
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function getCheatSheetContent(filename) {
  const owner = 'Breanzy';
  const repo = 'html-css-javascript-cheat-sheet';
  const path = filename;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const content = atob(data.content); // Decode konten Base64
    return content;
  } catch (error) {
    console.error('Gagal mengambil cheat sheet:', error);
    return null;
  }
}

function updateFileList() {
    // Hapus seluruh fungsi ini
}

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const message = userInput.value.trim();

    if (message) {
        chatContainer.appendChild(createMessageElement('user', message));
        userInput.value = '';

        try {
            // Ambil konten cheat sheet
            const htmlCheatSheet = await getCheatSheetContent('html-cheat-sheet.md');
            const cssCheatSheet = await getCheatSheetContent('css-cheat-sheet.md');
            const jsCheatSheet = await getCheatSheetContent('javascript-cheat-sheet.md');

            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    htmlCheatSheet,
                    cssCheatSheet,
                    jsCheatSheet,
                    requestType: 'complex_website'
                }),
            });

            if (response.ok) {
                const reader = response.body.getReader();
                let botResponse = '';
                const botMessageElement = createMessageElement('bot', '');
                chatContainer.appendChild(botMessageElement);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    botResponse += new TextDecoder().decode(value);
                    botMessageElement.querySelector('.bot-message').innerHTML = formatMessage(botResponse);
                }

                // Hapus pemanggilan updateFileList()
            } else {
                throw new Error('Gagal mendapatkan respons dari server');
            }
        } catch (error) {
            console.error('Error:', error);
            chatContainer.appendChild(createMessageElement('error', 'Terjadi kesalahan saat berkomunikasi dengan server.'));
        }

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    sendButton.addEventListener('click', sendMessage);

    // Tambahkan event listener untuk pesan yang disarankan
    document.querySelectorAll('.suggested-message').forEach(element => {
        element.addEventListener('click', () => {
            userInput.value = element.textContent;
            sendMessage();
        });
    });

    document.getElementById('chat-container').addEventListener('click', (e) => {
        const fileCard = e.target.closest('.file-card');
        if (fileCard) {
            const filename = fileCard.dataset.filename;
            const codeInfo = generatedCode[filename];
            updateCodeView(codeInfo.code, codeInfo.language);
            updateResultPreview(codeInfo.code, codeInfo.language);
        }
    });
});

// Fungsi untuk menangani perpindahan tab
function switchTab(event) {
    const target = event.target.dataset.target;
    document.querySelectorAll('.preview-nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.preview-content').forEach(content => content.style.display = 'none');
    event.target.classList.add('active');
    document.getElementById(target).style.display = 'block';
}

// Menambahkan event listener untuk tab
document.querySelectorAll('.preview-nav-item').forEach(item => {
    item.addEventListener('click', switchTab);
});
