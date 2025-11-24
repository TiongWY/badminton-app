// Initialize Lucide Icons
lucide.createIcons();

// --- Configuration ---
// ⚠️ 请在这里替换您的 Firebase 配置信息
const firebaseConfig = {
    apiKey: "AIzaSyDyPjFg7w532SqpOTwtb1S0DweBY-G-mfM",
    authDomain: "badminton-fc92c.firebaseapp.com",
    projectId: "badminton-fc92c",
    storageBucket: "badminton-fc92c.firebasestorage.app",
    messagingSenderId: "221714584114",
    appId: "1:221714584114:web:4a5d3becda3bc28f63e22b",
    measurementId: "G-WS4V0S3DHF"
};

// Initialize Firebase (Compat Mode)
let db;
let players = [];
const STORAGE_KEY = 'badminton_players_demo';

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Firebase initialized successfully (Compat Mode)");
    } else {
        throw new Error("Firebase SDK not loaded");
    }
} catch (error) {
    console.warn("Firebase config missing or SDK failed. Using LocalStorage fallback.", error);
    players = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

// --- DOM Elements ---
const playerListEl = document.getElementById('player-list');
const playerCountEl = document.getElementById('player-count');
const courtCountEl = document.getElementById('court-count');
const sessionDateEl = document.getElementById('session-date');
const sessionTimeDisplay = document.getElementById('session-time-display');
const sessionLocationDisplay = document.getElementById('session-location-display');
const locationLink = document.getElementById('location-link');
const mapIframe = document.getElementById('map-iframe');
const joinForm = document.getElementById('join-form');
const playerNameInput = document.getElementById('player-name');
const statusBadgeEl = document.querySelector('.status-badge');

// Admin Elements
const adminBtn = document.getElementById('admin-btn');
const adminModal = document.getElementById('admin-modal');
const closeModalBtn = document.getElementById('close-modal');
const adminLoginView = document.getElementById('admin-login-view');
const adminControlsView = document.getElementById('admin-controls-view');
const adminPasswordInput = document.getElementById('admin-password');
const loginSubmitBtn = document.getElementById('login-submit');
const endSessionBtn = document.getElementById('end-session-btn');
const reopenSessionBtn = document.getElementById('reopen-session-btn');
const courtNumbersInput = document.getElementById('court-numbers-input');
const adminHint = document.getElementById('admin-hint');

// Admin Edit Elements
const editTimeInput = document.getElementById('edit-time-input');
const editLocationInput = document.getElementById('edit-location-input');
const saveInfoBtn = document.getElementById('save-info-btn');

// History Elements
const historyBtn = document.getElementById('history-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryModalBtn = document.getElementById('close-history-modal');
const historyListEl = document.getElementById('history-list');

// --- Helper Functions ---

function getNextSaturday() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)

    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilSaturday);

    // Format: DD-MM-YYYY
    const day = targetDate.getDate().toString().padStart(2, '0');
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const year = targetDate.getFullYear();

    return `${day}-${month}-${year}`;
}

function calculateCourts(count) {
    if (count === 0) return 0;
    return Math.ceil(count / 6);
}

function formatTime(timestamp) {
    if (!timestamp) return '刚刚';
    // Handle Firestore Timestamp or ISO string
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// Expose delete function to window so onclick works
window.deletePlayer = async function (id) {
    if (!confirm("确定要取消报名吗？")) return;

    try {
        if (db && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
            await db.collection("sessions").doc("current").collection("players").doc(id).delete();
        } else {
            players = players.filter(p => p.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
            renderPlayerList(players);
        }
    } catch (error) {
        console.error("Error removing player: ", error);
        alert("取消失败: " + error.message);
    }
};

function renderPlayerList(playerData) {
    // Update Stats
    const count = playerData.length;
    playerCountEl.textContent = count;

    // Only update court count if we are NOT in closed mode (handled by session listener)
    if (!document.body.classList.contains('session-closed')) {
        courtCountEl.textContent = calculateCourts(count);
    }

    // Update List
    playerListEl.innerHTML = '';

    if (count === 0) {
        playerListEl.innerHTML = '<li class="empty-state">暂无报名，快来抢沙发！</li>';
        return;
    }

    playerData.forEach(player => {
        const li = document.createElement('li');
        li.className = 'player-item';

        const initial = player.name.charAt(0).toUpperCase();
        const id = player.id;

        li.innerHTML = `
            <div class="player-info">
                <div class="avatar">${initial}</div>
                <span class="player-name">${player.name}</span>
            </div>
            <div class="player-actions">
                <span class="player-time">${formatTime(player.joinedAt)}</span>
                <button class="delete-btn" onclick="deletePlayer('${id}')" title="取消报名">
                    <i data-lucide="trash-2" style="width: 16px;"></i>
                </button>
            </div>
        `;
        playerListEl.appendChild(li);
    });
    lucide.createIcons();
}

function updateSessionUI(sessionData) {
    // 1. Update Info (Time & Location)
    if (sessionData) {
        if (sessionData.time) {
            if (sessionTimeDisplay) sessionTimeDisplay.textContent = sessionData.time;
            if (editTimeInput) editTimeInput.value = sessionData.time;
        }
        if (sessionData.location) {
            const loc = sessionData.location;
            if (sessionLocationDisplay) sessionLocationDisplay.textContent = loc;
            if (editLocationInput) editLocationInput.value = loc;

            // Update Maps
            const mapQuery = encodeURIComponent(loc);
            if (locationLink) locationLink.href = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
            if (mapIframe) mapIframe.src = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
        }
    }

    // 2. Update Status
    if (sessionData && sessionData.status === 'closed') {
        // Closed State
        document.body.classList.add('session-closed');
        statusBadgeEl.textContent = '报名已截止';
        statusBadgeEl.classList.remove('open');
        statusBadgeEl.classList.add('closed');

        // Update Court Display
        const courtLabel = document.querySelector('.stat-box:nth-child(2) .stat-label');
        if (courtLabel) courtLabel.textContent = '球场号码';
        courtCountEl.textContent = sessionData.courtNumbers || '-';

        // Disable Form
        const btn = joinForm.querySelector('button');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '报名已结束';
        }
        if (playerNameInput) playerNameInput.disabled = true;

        // Admin Modal UI Update
        if (endSessionBtn) endSessionBtn.classList.add('hidden');
        if (reopenSessionBtn) reopenSessionBtn.classList.remove('hidden');
        if (courtNumbersInput) {
            courtNumbersInput.disabled = true;
            courtNumbersInput.value = sessionData.courtNumbers || '';
        }
        if (adminHint) adminHint.textContent = "当前报名已截止。点击上方按钮可重新开启。";

    } else {
        // Open State
        document.body.classList.remove('session-closed');
        statusBadgeEl.textContent = '报名中';
        statusBadgeEl.classList.add('open');
        statusBadgeEl.classList.remove('closed');

        const courtLabel = document.querySelector('.stat-box:nth-child(2) .stat-label');
        if (courtLabel) courtLabel.textContent = '预计球场';
        // courtCountEl is updated by renderPlayerList

        const btn = joinForm.querySelector('button');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>立即报名</span><i data-lucide="arrow-right"></i>';
        }
        if (playerNameInput) playerNameInput.disabled = false;

        // Admin Modal UI Update
        if (endSessionBtn) endSessionBtn.classList.remove('hidden');
        if (reopenSessionBtn) reopenSessionBtn.classList.add('hidden');
        if (courtNumbersInput) {
            courtNumbersInput.disabled = false;
            courtNumbersInput.value = '';
        }
        if (adminHint) adminHint.textContent = "点击后将停止报名，并保存当前记录到历史档案。";

        lucide.createIcons();
    }
}

// --- Main Logic ---

// 1. Set Date
const currentSessionDate = getNextSaturday();
if (sessionDateEl) sessionDateEl.textContent = currentSessionDate;

// 2. Setup Listeners
if (db && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    // A. Players Listener
    const playersRef = db.collection("sessions").doc("current").collection("players");
    playersRef.orderBy("joinedAt", "asc").onSnapshot((snapshot) => {
        const livePlayers = [];
        snapshot.forEach((doc) => {
            livePlayers.push({ id: doc.id, ...doc.data() });
        });
        renderPlayerList(livePlayers);
    });

    // B. Session Info Listener (Status & Courts)
    db.collection("sessions").doc("current").onSnapshot((doc) => {
        if (doc.exists) {
            updateSessionUI(doc.data());
        } else {
            // Init default if not exists
            db.collection("sessions").doc("current").set({
                status: 'open',
                location: 'Impian Sport',
                time: '21:00 - 23:00'
            });
        }
    });
} else {
    // LocalStorage Fallback
    renderPlayerList(players);
}

// 3. Handle Registration
if (joinForm) {
    joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = playerNameInput.value.trim();
        if (!name) return;

        const btn = joinForm.querySelector('button');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> 提交中...';
        lucide.createIcons();

        try {
            if (db && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
                await db.collection("sessions").doc("current").collection("players").add({
                    name: name,
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                const newPlayer = { id: Date.now(), name: name, joinedAt: new Date().toISOString() };
                players.push(newPlayer);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
                renderPlayerList(players);
            }

            playerNameInput.value = '';
            btn.innerHTML = '<i data-lucide="check"></i> 已报名';
            btn.style.background = '#22c55e';
            lucide.createIcons();

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
                lucide.createIcons();
            }, 2000);

        } catch (error) {
            console.error("Error adding player: ", error);
            alert("报名失败: " + error.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// --- Admin Logic ---

// Toggle Modal
if (adminBtn) {
    adminBtn.addEventListener('click', () => {
        adminModal.classList.remove('hidden');
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        adminModal.classList.add('hidden');
    });
}

// Login
if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', () => {
        const password = adminPasswordInput.value;
        if (password === 'admin123') { // Simple password
            adminLoginView.classList.add('hidden');
            adminControlsView.classList.remove('hidden');
        } else {
            alert('密码错误');
        }
    });
}

// Save Info (Time & Location)
if (saveInfoBtn) {
    saveInfoBtn.addEventListener('click', async () => {
        const newTime = editTimeInput.value.trim();
        const newLocation = editLocationInput.value.trim();

        if (!newTime || !newLocation) {
            alert("时间和地点不能为空");
            return;
        }

        saveInfoBtn.disabled = true;
        saveInfoBtn.textContent = "保存中...";

        try {
            if (db) {
                await db.collection("sessions").doc("current").set({
                    time: newTime,
                    location: newLocation
                }, { merge: true });

                alert("设置已更新！");
            }
        } catch (error) {
            console.error("Error updating info: ", error);
            alert("保存失败: " + error.message);
        } finally {
            saveInfoBtn.disabled = false;
            saveInfoBtn.innerHTML = '<i data-lucide="save"></i> 保存设置';
            lucide.createIcons();
        }
    });
}

// End Session & Archive
if (endSessionBtn) {
    endSessionBtn.addEventListener('click', async () => {
        const courts = courtNumbersInput.value.trim();
        if (!courts) {
            alert("请输入球场号码 (例如: 5, 6)");
            return;
        }

        if (!confirm("确定要结束报名并归档吗？")) return;

        endSessionBtn.disabled = true;
        endSessionBtn.textContent = "处理中...";

        try {
            if (db) {
                const batch = db.batch();
                const sessionRef = db.collection("sessions").doc("current");
                const historyRef = db.collection("history").doc(currentSessionDate); // Use Date as ID

                // 0. Get current session info (Location & Time)
                const sessionDoc = await sessionRef.get();
                const sessionData = sessionDoc.data() || {};
                const finalLocation = sessionData.location || "Impian Sport";
                const finalTime = sessionData.time || "21:00 - 23:00";

                // 1. Get current players
                const playersSnapshot = await sessionRef.collection("players").get();
                const playersList = [];
                playersSnapshot.forEach(doc => {
                    playersList.push(doc.data());
                });

                // 2. Archive to History
                batch.set(historyRef, {
                    date: currentSessionDate,
                    time: finalTime,
                    location: finalLocation,
                    courtNumbers: courts,
                    playerCount: playersList.length,
                    players: playersList,
                    archivedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 3. Update Current Session Status
                batch.set(sessionRef, {
                    status: 'closed',
                    courtNumbers: courts,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                await batch.commit();

                alert("已成功归档并结束报名！");
                adminModal.classList.add('hidden');
            }
        } catch (error) {
            console.error("Error ending session: ", error);
            alert("操作失败: " + error.message);
        } finally {
            endSessionBtn.disabled = false;
            endSessionBtn.innerHTML = '<i data-lucide="archive"></i> 结束报名 & 归档';
            lucide.createIcons();
        }
    });
}

// Reopen Session
if (reopenSessionBtn) {
    reopenSessionBtn.addEventListener('click', async () => {
        if (!confirm("确定要重新开启报名吗？")) return;

        reopenSessionBtn.disabled = true;
        reopenSessionBtn.textContent = "处理中...";

        try {
            if (db) {
                await db.collection("sessions").doc("current").update({
                    status: 'open',
                    courtNumbers: firebase.firestore.FieldValue.delete() // Remove court numbers
                });

                alert("报名已重新开启！");
                adminModal.classList.add('hidden');
            }
        } catch (error) {
            console.error("Error reopening session: ", error);
            alert("操作失败: " + error.message);
        } finally {
            reopenSessionBtn.disabled = false;
            reopenSessionBtn.innerHTML = '<i data-lucide="refresh-cw"></i> 重新开启报名';
            lucide.createIcons();
        }
    });
}

// --- History Logic ---

if (historyBtn) {
    historyBtn.addEventListener('click', async () => {
        historyModal.classList.remove('hidden');
        historyListEl.innerHTML = '<li class="empty-state">加载中...</li>';

        try {
            if (db) {
                const snapshot = await db.collection("history").orderBy("archivedAt", "desc").get();

                if (snapshot.empty) {
                    historyListEl.innerHTML = '<li class="empty-state">暂无历史记录</li>';
                    return;
                }

                historyListEl.innerHTML = '';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const li = document.createElement('li');
                    li.className = 'history-item';
                    li.innerHTML = `
                        <div class="history-header">
                            <span class="history-date">${data.date}</span>
                            <span class="history-count">${data.playerCount} 人</span>
                        </div>
                        <div class="history-details">
                            ${data.location} | 球场: ${data.courtNumbers}
                        </div>
                    `;

                    // Click to show details (simple alert for now, can be expanded)
                    li.addEventListener('click', () => {
                        const names = data.players.map(p => p.name).join(', ');
                        alert(`【${data.date} 报名名单】\n\n${names}`);
                    });

                    historyListEl.appendChild(li);
                });
            }
        } catch (error) {
            console.error("Error fetching history: ", error);
            historyListEl.innerHTML = '<li class="empty-state">加载失败</li>';
        }
    });
}

if (closeHistoryModalBtn) {
    closeHistoryModalBtn.addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });
}

// Add spin animation style for loader
const style = document.createElement('style');
style.innerHTML = `
@keyframes spin { 100% { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);
