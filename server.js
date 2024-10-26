const express = require('express');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const port = 3000;

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

app.use(express.static('public'));
app.use(express.json());

app.post('/chat', async (req, res) => {
    const { message, htmlCheatSheet, cssCheatSheet, jsCheatSheet } = req.body;

    // Gabungkan cheat sheet ke dalam satu string
    const combinedCheatSheet = `
HTML Cheat Sheet:
${htmlCheatSheet}

CSS Cheat Sheet:
${cssCheatSheet}

JavaScript Cheat Sheet:
${jsCheatSheet}
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Anda adalah asisten AI yang memiliki pengetahuan mendalam tentang pengembangan web. Gunakan informasi berikut sebagai referensi: ${combinedCheatSheet}`
                },
                {
                    role: "user",
                    content: message
                }
            ],
            model: "llama-3.1-70b-versatile",
            temperature: 1,
            max_tokens: 1024,
            top_p: 1,
            stream: true,
            stop: null
        });

        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Transfer-Encoding': 'chunked'
        });

        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || '';
            res.write(content);
        }

        res.end();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses permintaan' });
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
