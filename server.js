const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SQLite Veritabanı Bağlantısı
const db = new sqlite3.Database('./factory_logs.db', (err) => {
    if (err) console.error('Veritabanına bağlanılamadı:', err.message);
    else console.log('SQLite veritabanına başarıyla bağlandı.');
});

// Tablolar Yüklü Değilse Oluştur
db.serialize(() => {
    db.run(`PRAGMA foreign_keys = ON;`);
    
    db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        users_name TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS operations (
        operation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_name TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS machine_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        operation_id INTEGER NOT NULL,
        start_time TEXT DEFAULT CURRENT_TIMESTAMP,
        time_used INTEGER,
        cut_measurement REAL NOT NULL,
        status TEXT DEFAULT 'SUCCESS',
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (operation_id) REFERENCES operations(operation_id)
    )`);
});

// API 1: Kayıtları Çekme (GET /api/logs)
app.get('/api/logs', (req, res) => {
    const query = `
        SELECT l.log_id, u.users_name, o.operation_name, l.cut_measurement, l.time_used, l.status 
        FROM machine_logs l
        JOIN users u ON l.user_id = u.user_id
        JOIN operations o ON l.operation_id = o.operation_id
        ORDER BY l.log_id DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API 2: Yeni İşlem Ekleme (POST /api/logs)
app.post('/api/logs', (req, res) => {
    const { users_name, operation_name, cut_measurement, time_used } = req.body;

    // Kullanıcıyı al yoksa ekle
    db.run(`INSERT OR IGNORE INTO users (users_name) VALUES (?)`, [users_name], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        // Operasyonu al yoksa ekle
        db.run(`INSERT OR IGNORE INTO operations (operation_name) VALUES (?)`, [operation_name], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            // ID'leri çek ve Log tablosuna ekle
            const insertLogSql = `
                INSERT INTO machine_logs (user_id, operation_id, cut_measurement, time_used)
                VALUES (
                    (SELECT user_id FROM users WHERE users_name = ?),
                    (SELECT operation_id FROM operations WHERE operation_name = ?),
                    ?, ?
                )
            `;

            db.run(insertLogSql, [users_name, operation_name, cut_measurement, time_used], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Log eklendi', log_id: this.lastID });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});