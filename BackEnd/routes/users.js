const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Nepřihlášen' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Neplatný token' });
    }
}


router.get('/', authMiddleware, (req, res) => {
    const sql = 'SELECT id, jmeno, prijmeni, vek, pohlavi, profilovka FROM users ORDER BY prijmeni ASC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        res.json(results);
    });
});


router.get('/:id', authMiddleware, (req, res) => {
    const sql = 'SELECT id, jmeno, prijmeni, vek, pohlavi, email, profilovka FROM users WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        if (results.length === 0) return res.status(404).json({ error: 'Uživatel nenalezen' });
        res.json(results[0]);
    });
});


router.get('/:id/posts', authMiddleware, (req, res) => {
    const sql = 'SELECT * FROM posts WHERE autor_id = ? ORDER BY created_at DESC';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        res.json(results);
    });
});


router.get('/:id/activity', authMiddleware, (req, res) => {
    const sql = `
        SELECT DISTINCT posts.*, users.jmeno, users.prijmeni
        FROM posts
        JOIN users ON posts.autor_id = users.id
        WHERE posts.id IN (
            SELECT post_id FROM likes WHERE user_id = ?
            UNION
            SELECT post_id FROM comments WHERE autor_id = ?
        )
        AND posts.autor_id != ?
        ORDER BY posts.created_at DESC
    `;
    db.query(sql, [req.params.id, req.params.id, req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        res.json(results);
    });
});

module.exports = router;