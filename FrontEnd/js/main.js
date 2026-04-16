const API = 'http://localhost:3000/api';


function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString('cs-CZ');
}


const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const heslo = document.getElementById('heslo').value;

        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, heslo })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'wall.html';
        } else {
            document.getElementById('error-msg').textContent = data.error;
        }
    });
}


const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const vek = parseInt(document.getElementById('vek').value);
        if (vek < 13) {
            document.getElementById('error-msg').textContent = 'Musíš mít alespoň 13 let!';
            return;
        }

        const formData = new FormData();
        formData.append('jmeno', document.getElementById('jmeno').value);
        formData.append('prijmeni', document.getElementById('prijmeni').value);
        formData.append('vek', vek);
        formData.append('pohlavi', document.getElementById('pohlavi').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('heslo', document.getElementById('heslo').value);
        const profilovka = document.getElementById('profilovka').files[0];
        if (profilovka) formData.append('profilovka', profilovka);

        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById('success-msg').textContent = 'Registrace úspěšná! Přihlas se.';
            setTimeout(() => window.location.href = 'index.html', 2000);
        } else {
            document.getElementById('error-msg').textContent = data.error;
        }
    });
}


const postsContainer = document.getElementById('posts-container');
if (postsContainer) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }

    loadPosts();


    const newPostForm = document.getElementById('new-post-form');
    newPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('nadpis', document.getElementById('nadpis').value);
        formData.append('text', document.getElementById('text').value);
        const obrazek = document.getElementById('obrazek').files[0];
        if (obrazek) formData.append('obrazek', obrazek);

        const res = await fetch(`${API}/posts`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });

        if (res.ok) {
            newPostForm.reset();
            loadPosts();
        }
    });


    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}

async function loadPosts() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/posts`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const posts = await res.json();
    postsContainer.innerHTML = '';
    posts.forEach(post => renderPost(post));
}

function renderPost(post) {
    const user = JSON.parse(localStorage.getItem('user'));
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
        <div class="post-header">
            <img src="${post.profilovka ? API.replace('/api','') + '/uploads/' + post.profilovka : 'https://via.placeholder.com/45'}" alt="profilovka">
            <div>
                <a href="user-detail.html?id=${post.autor_id}" class="post-author">${post.jmeno} ${post.prijmeni}</a>
                <div class="post-date">${formatDate(post.created_at)}</div>
            </div>
        </div>
        <div class="post-title">${post.nadpis}</div>
        <div class="post-text">${post.text}</div>
        ${post.obrazek ? `<img src="${API.replace('/api','')}/uploads/${post.obrazek}" class="post-image">` : ''}
        <div class="post-actions">
            <button class="like-btn ${post.user_liked ? 'liked' : ''}" onclick="toggleLike(${post.id}, this)">
                👍 ${post.likes_count || 0}
            </button>
            <button class="comment-toggle" onclick="toggleComments(${post.id})">
                💬 Komentáře (${post.comments_count || 0})
            </button>
        </div>
        <div class="comments-section" id="comments-${post.id}" style="display:none">
            <div id="comments-list-${post.id}"></div>
            <div class="comment-form">
                <input type="text" id="comment-input-${post.id}" placeholder="Napiš komentář...">
                <button onclick="addComment(${post.id})">Odeslat</button>
            </div>
        </div>
    `;
    postsContainer.appendChild(div);
}

async function toggleLike(postId, btn) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (res.ok) {
        btn.classList.toggle('liked');
        btn.textContent = `👍 ${data.likes_count}`;
    }
}

async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (section.style.display === 'none') {
        section.style.display = 'block';
        await loadComments(postId);
    } else {
        section.style.display = 'none';
    }
}

async function loadComments(postId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/posts/${postId}/comments`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const comments = await res.json();
    const list = document.getElementById(`comments-list-${postId}`);
    list.innerHTML = '';
    comments.forEach(c => {
        list.innerHTML += `
            <div class="comment">
                <span class="comment-author">${c.jmeno} ${c.prijmeni}</span>
                ${c.text}
                <div class="comment-date">${formatDate(c.created_at)}</div>
            </div>
        `;
    });
}

async function addComment(postId) {
    const token = localStorage.getItem('token');
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input.value.trim()) return;

    const res = await fetch(`${API}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: input.value })
    });

    if (res.ok) {
        input.value = '';
        await loadComments(postId);
    }
}

const userInfo = document.getElementById('user-info');
if (userInfo) {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'index.html';

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    fetch(`${API}/users/${userId}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(user => {
        userInfo.innerHTML = `
            <img src="${user.profilovka ? API.replace('/api','') + '/uploads/' + user.profilovka : 'https://via.placeholder.com/80'}" alt="profilovka">
            <div class="user-detail-info">
                <h2>${user.jmeno} ${user.prijmeni}</h2>
                <p>Věk: ${user.vek}</p>
                <p>Pohlaví: ${user.pohlavi}</p>
                <p>Email: ${user.email}</p>
            </div>
        `;
    });


    fetch(`${API}/users/${userId}/posts`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(posts => {
        const container = document.getElementById('user-posts');
        if (posts.length === 0) {
            container.innerHTML = '<p style="color:#888">Žádné příspěvky</p>';
            return;
        }
        posts.forEach(post => {
            container.innerHTML += `
                <div class="post">
                    <div class="post-title">${post.nadpis}</div>
                    <div class="post-text">${post.text}</div>
                    ${post.obrazek ? `<img src="${API.replace('/api','')}/uploads/${post.obrazek}" class="post-image">` : ''}
                    <div class="post-date">${formatDate(post.created_at)}</div>
                </div>
            `;
        });
    });


    fetch(`${API}/users/${userId}/activity`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(posts => {
        const container = document.getElementById('user-activity');
        if (posts.length === 0) {
            container.innerHTML = '<p style="color:#888">Žádná aktivita</p>';
            return;
        }
        posts.forEach(post => {
            container.innerHTML += `
                <div class="post">
                    <div class="post-header">
                        <div>
                            <div class="post-author">${post.jmeno} ${post.prijmeni}</div>
                            <div class="post-date">${formatDate(post.created_at)}</div>
                        </div>
                    </div>
                    <div class="post-title">${post.nadpis}</div>
                    <div class="post-text">${post.text}</div>
                    ${post.obrazek ? `<img src="${API.replace('/api','')}/uploads/${post.obrazek}" class="post-image">` : ''}
                </div>
            `;
        });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}