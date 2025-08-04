const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'super_secret_key';

// Asetetaan keski-ohjelma (middleware)
app.use(express.json());

// Tarjoile staattiset tiedostot juurikansiosta (yksinkertaisempi tapa)
app.use(express.static('./'));

// Tietokannan alustus
const db = new sqlite3.Database('palkkalaskuri.db', (err) => {
    if (err) {
        console.error('Virhe tietokannan luomisessa:', err.message);
    } else {
        console.log('Yhdistetty tietokantaan.');
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password_hash TEXT
            )
        `, (err) => {
            if (err) console.error('Virhe users-taulun luomisessa:', err.message);
        });
        db.run(`
            CREATE TABLE IF NOT EXISTS merkinnat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                pvm TEXT,
                asiakas TEXT,
                paikkakunta TEXT,
                tunnit REAL,
                urakka REAL,
                tyontehtava TEXT,
                paivarahat REAL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) console.error('Virhe merkinnat-taulun luomisessa:', err.message);
        });
    }
});

// Rekisteröintireitti
app.post('/api/register', async (req, res) => {
    const { kayttajanimi, salasana } = req.body;
    
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(salasana, saltRounds);

    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [kayttajanimi, password_hash], function(err) {
        if (err) {
            return res.status(400).json({ message: 'Kayttajanimi on jo olemassa.' });
        }
        res.status(201).json({ message: 'Kayttaja luotu!' });
    });
});

// Kirjautumisreitti
app.post('/api/login', async (req, res) => {
    const { kayttajanimi, salasana } = req.body;

    db.get('SELECT id, password_hash FROM users WHERE username = ?', [kayttajanimi], async (err, row) => {
        if (err || !row) {
            return res.status(400).json({ message: 'Virheellinen kayttajanimi tai salasana.' });
        }

        const match = await bcrypt.compare(salasana, row.password_hash);
        if (!match) {
            return res.status(400).json({ message: 'Virheellinen kayttajanimi tai salasana.' });
        }

        const token = jwt.sign({ userId: row.id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    });
});

// Autentikointi-keskiohjelma
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Merkintojen reitit, jotka vaativat kirjautumisen
app.get('/api/merkinnat', authenticateToken, (req, res) => {
    db.all('SELECT * FROM merkinnat WHERE user_id = ?', [req.user.userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Virhe merkintojen haussa.' });
        }
        res.json({ merkinnat: rows });
    });
});

app.post('/api/merkinta', authenticateToken, (req, res) => {
    const { pvm, asiakas, paikkakunta, tunnit, urakka, tyontehtava, paivarahat } = req.body;
    db.run(
        'INSERT INTO merkinnat (user_id, pvm, asiakas, paikkakunta, tunnit, urakka, tyontehtava, paivarahat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.userId, pvm, asiakas, paikkakunta, tunnit, urakka, tyontehtava, paivarahat],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Merkinnan tallennus epaonnistui.' });
            }
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

app.delete('/api/merkinta', authenticateToken, (req, res) => {
    const { merkintaId } = req.body;
    db.run('DELETE FROM merkinnat WHERE id = ? AND user_id = ?', [merkintaId, req.user.userId], function(err) {
        if (err || this.changes === 0) {
            return res.status(404).json({ message: 'Merkintaa ei loytynyt tai sinulla ei ole oikeuksia poistaa sita.' });
        }
        res.status(200).json({ message: 'Merkinta poistettu.' });
    });
});

// Palvelimen käynnistys
app.listen(PORT, () => {
    console.log(`Palvelin kaynnissa osoitteessa http://localhost:${PORT}`);
});