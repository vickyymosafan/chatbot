const express = require("express");
const Groq = require("groq-sdk");
require("dotenv").config();
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Ubah ini untuk menentukan folder statis dengan benar
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Ganti ini dengan konfigurasi CORS yang lebih spesifik
app.use(cors({
  origin: 'https://ai-neon-zeta.vercel.app', // Sesuaikan dengan URL deployment Anda
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Tambahkan logging untuk memeriksa permintaan yang masuk
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Tambahkan rute GET untuk halaman utama
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/chat", async (req, res) => {
  console.log("Menerima permintaan chat:", JSON.stringify(req.body, null, 2));
  const {message, htmlCheatSheet, cssCheatSheet, jsCheatSheet} = req.body;

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
          content: `Anda adalah asisten AI yang memiliki pengetahuan mendalam tentang pengembangan web. Gunakan informasi berikut sebagai referensi: ${combinedCheatSheet}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 1,
      max_tokens: 1024,
      top_p: 1,
      stream: true,
      stop: null,
    });

    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
    });

    for await (const chunk of chatCompletion) {
      const content = chunk.choices[0]?.delta?.content || "";
      res.write(content);
    }

    res.end();
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({error: "Terjadi kesalahan saat memproses permintaan"});
  }
});

// Tambahkan ini di akhir file, sebelum app.listen
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).send("Halaman tidak ditemukan");
});

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
