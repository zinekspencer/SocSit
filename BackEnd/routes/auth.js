const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post('/register', upload.single('profilovka'), (req, res) => {
    const { jmeno, prijmeni, vek, pohlavi, email, heslo } = req.body;

    if (!jmeno || !prijmeni || !vek || !pohlavi || !email || !heslo) {
        return res.status(400).json({ error: 'Vyplň všechna pole' });
    }

    if (vek < 13) {
        return res.status(400).json({ error: 'Musíš mít alespoň 13 let' });
    }

    const checkSql = 'SELECT * FROM users WHERE email = ?';
    db.query(checkSql, [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        if (results.length > 0) return res.status(400).json({ error: 'Email již existuje' });

     bcrypt.hash(heslo, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Chyba hashování' });

    const profilovka = req.file ? req.file.filename : null;
    const sql = 'INSERT INTO users (jmeno, prijmeni, vek, pohlavi, email, heslo, profilovka) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [jmeno, prijmeni, vek, pohlavi, email, hash, profilovka], (err, result) => {
        if (err) return res.status(500).json({ error: 'Chyba při registraci' });
        res.json({ message: 'Registrace úspěšná' });
            });
        });
    });
});

router.post('/login', (req, res) => {
    const { email, heslo } = req.body;

    if (!email || !heslo) {
        return res.status(400).json({ error: 'Vyplň email a heslo' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        if (results.length === 0) return res.status(400).json({ error: 'Uživatel nenalezen' });

        const user = results[0];
        bcrypt.compare(heslo, user.heslo, (err, match) => {
            if (err) return res.status(500).json({ error: 'Chyba porovnání hesla' });
            if (!match) return res.status(400).json({ error: 'Špatné heslo' });

            const token = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({ message: 'Přihlášení úspěšné', token, user: { id: user.id, jmeno: user.jmeno, prijmeni: user.prijmeni } });
        });
    });
});

module.exports = router;