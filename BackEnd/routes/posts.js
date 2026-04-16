const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });


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
    const sql = `
        SELECT posts.*, users.jmeno, users.prijmeni, users.profilovka,
        COUNT(DISTINCT likes.id) as likes_count,
        COUNT(DISTINCT comments.id) as comments_count,
        MAX(CASE WHEN likes.user_id = ? THEN 1 ELSE 0 END) as user_liked
        FROM posts
        JOIN users ON posts.autor_id = users.id
        LEFT JOIN likes ON posts.id = likes.post_id
        LEFT JOIN comments ON posts.id = comments.post_id
        GROUP BY posts.id
        ORDER BY posts.created_at DESC
    `;
    db.query(sql, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        res.json(results);
    });
});


router.post('/', authMiddleware, upload.single('obrazek'), (req, res) => {
    const { nadpis, text } = req.body;
    if (!nadpis || !text) return res.status(400).json({ error: 'Vyplň nadpis a text' });
    const obrazek = req.file ? req.file.filename : null;
    const sql = 'INSERT INTO posts (autor_id, nadpis, text, obrazek) VALUES (?, ?, ?, ?)';
    db.query(sql, [req.user.id, nadpis, text, obrazek], (err, result) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        res.json({ message: 'Příspěvek přidán', id: result.insertId });
    });
});


router.post('/:id/like', authMiddleware, (req, res) => {
    const postId = req.params.id;
    const checkSql = 'SELECT * FROM likes WHERE user_id = ? AND post_id = ?';
    db.query(checkSql, [req.user.id, postId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        if (results.length > 0) {
            db.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId], (err) => {
                if (err) return res.status(500).json({ error: 'Chyba databáze' });
                getLikesCount(postId, res);
            });
        } else {
            db.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, postId], (err) => {
                if (err) return res.status(500).json({ error: 'Chyba databáze' });
                getLikesCount(postId, res);
            });
        }
    });
});

function getLikesCount(postId, res) {
    db.query('SELECT COUNT(*) as likes_count FROM likes WHERE post_id = ?', [postId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        res.json({ likes_count: results[0].likes_count });
    });
}


router.get('/:id/comments', authMiddleware, (req, res) => {
    const sql = `
        SELECT comments.*, users.jmeno, users.prijmeni
        FROM comments
        JOIN users ON comments.autor_id = users.id
        WHERE comments.post_id = ?
        ORDER BY comments.created_at DESC
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        res.json(results);
    });
});


router.post('/:id/comments', authMiddleware, (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Vyplň text komentáře' });
    const sql = 'INSERT INTO comments (autor_id, post_id, text) VALUES (?, ?, ?)';
    db.query(sql, [req.user.id, req.params.id, text], (err, result) => {
        if (err) return res.status(500).json({ error: 'Chyba databáze' });
        res.json({ message: 'Komentář přidán' });
    });
});

module.exports = router;