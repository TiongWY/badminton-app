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
const resetSessionBtn = document.getElementById('reset-session-btn');
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

// Edit Expense Modal Elements
const editExpenseModal = document.getElementById('edit-expense-modal');
const closeEditExpenseModalBtn = document.getElementById('close-edit-expense-modal');
const editExpenseDate = document.getElementById('edit-expense-date');
const editExpensePlayerCount = document.getElementById('edit-expense-player-count');
const editCourtRental = document.getElementById('edit-court-rental');
const editShuttlecockCount = document.getElementById('edit-shuttlecock-count');
const editShuttlecockPrice = document.getElementById('edit-shuttlecock-price');
const editTotalCost = document.getElementById('edit-total-cost');
const editPerPersonCost = document.getElementById('edit-per-person-cost');
const saveExpenseBtn = document.getElementById('save-expense-btn');
const cancelExpenseBtn = document.getElementById('cancel-expense-btn');

// Filter Elements
const filterSearch = document.getElementById('filter-search');

let currentEditingSessionId = null; // 当前正在编辑的 session ID (date)
let allHistoryData = []; // 存储所有历史记录用于筛选
let isAdminAuthenticated = false; // 管理员登录状态
let pendingLoginAction = null; // 登录后需要执行的操作


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

// 3. Join Action
joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = playerNameInput.value.trim();
    if (!name) return;

    const newPlayer = {
        name,
        joinedAt: new Date().toISOString()
    };

    try {
        const btn = joinForm.querySelector('button');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = '提交中...';

        if (db && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
            // Check if session is closed first
            const sessionDoc = await db.collection("sessions").doc("current").get();
            if (sessionDoc.exists && sessionDoc.data().status === 'closed') {
                alert("抱歉，报名已截止！");
                window.location.reload();
                return;
            }
            await db.collection("sessions").doc("current").collection("players").add({
                name: name,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            newPlayer.id = Date.now().toString();
            players.push(newPlayer);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
            renderPlayerList(players);
        }

        playerNameInput.value = '';
        btn.disabled = false;
        btn.innerHTML = originalText;

    } catch (error) {
        console.error("Error adding player: ", error);
        alert("报名失败: " + error.message);
        joinForm.querySelector('button').disabled = false;
    }
});

// --- Admin Logic ---

// 1. Open Modal
adminBtn.addEventListener('click', () => {
    adminModal.classList.remove('hidden');
    pendingLoginAction = null; // 清除任何挂起的操作

    // Check if already authenticated
    if (isAdminAuthenticated) {
        adminLoginView.classList.add('hidden');
        adminControlsView.classList.remove('hidden');
    } else {
        adminLoginView.classList.remove('hidden');
        adminControlsView.classList.add('hidden');
        adminPasswordInput.value = '';
    }
});

// 2. Close Modal
closeModalBtn.addEventListener('click', () => {
    adminModal.classList.add('hidden');
});

// 3. Login
loginSubmitBtn.addEventListener('click', () => {
    if (adminPasswordInput.value === 'admin123') {
        isAdminAuthenticated = true; // Set authenticated state

        if (pendingLoginAction) {
            // 如果有待处理的操作（例如打开费用编辑）
            adminModal.classList.add('hidden'); // 关闭登录窗口
            pendingLoginAction(); // 执行操作
            pendingLoginAction = null; // 重置
        } else {
            // 默认：显示管理控制台
            adminLoginView.classList.add('hidden');
            adminControlsView.classList.remove('hidden');
        }
    } else {
        alert('密码错误');
    }
});

// 4. Save Session Info (Time & Location)
if (saveInfoBtn) {
    saveInfoBtn.addEventListener('click', async () => {
        const newTime = editTimeInput.value.trim();
        const newLocation = editLocationInput.value.trim();

        if (!newTime || !newLocation) {
            alert("时间和地点不能为空");
            return;
        }

        try {
            saveInfoBtn.disabled = true;
            saveInfoBtn.textContent = "保存中...";

            if (db) {
                await db.collection("sessions").doc("current").update({
                    time: newTime,
                    location: newLocation
                });
                alert("设置已更新！");
                // UI will update via listener
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

// 5. End Session (Archive)
endSessionBtn.addEventListener('click', async () => {
    const courtNumbers = courtNumbersInput.value.trim();
    if (!courtNumbers) {
        alert("请输入球场号码 (例如: 5, 6, 7)");
        return;
    }

    if (!confirm("确定要结束本次报名并归档吗？")) return;

    try {
        endSessionBtn.disabled = true;
        endSessionBtn.textContent = "处理中...";

        if (db) {
            // 1. Get current players
            const playersSnapshot = await db.collection("sessions").doc("current").collection("players").get();
            const currentPlayers = [];
            playersSnapshot.forEach(doc => currentPlayers.push(doc.data()));

            // 2. Get current session info (location & time)
            const sessionDoc = await db.collection("sessions").doc("current").get();
            const sessionData = sessionDoc.data();
            const sessionLocation = sessionData.location || "Impian Sport";
            const sessionTime = sessionData.time || "21:00 - 23:00";

            // 3. Create History Record
            const historyData = {
                date: currentSessionDate,
                time: sessionTime,
                location: sessionLocation,
                playerCount: currentPlayers.length,
                courtNumbers: courtNumbers,
                players: currentPlayers,
                archivedAt: firebase.firestore.FieldValue.serverTimestamp(),
                expenses: {
                    courtRental: 0,
                    shuttlecockCount: 0,
                    shuttlecockPrice: 0,
                    totalCost: 0,
                    costPerPerson: 0
                }
            };

            await db.collection("history").doc(currentSessionDate).set(historyData);

            // 4. Update Session Status
            await db.collection("sessions").doc("current").update({
                status: 'closed',
                courtNumbers: courtNumbers
            });

            alert("报名已结束，记录已归档！");
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

// 6. Reopen Session
if (reopenSessionBtn) {
    reopenSessionBtn.addEventListener('click', async () => {
        if (!confirm("确定要重新开启报名吗？")) return;

        try {
            reopenSessionBtn.disabled = true;
            reopenSessionBtn.textContent = "处理中...";

            if (db) {
                await db.collection("sessions").doc("current").update({
                    status: 'open',
                    courtNumbers: firebase.firestore.FieldValue.delete()
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

// 7. Reset Session (New Feature)
if (resetSessionBtn) {
    resetSessionBtn.addEventListener('click', async () => {
        if (!confirm("⚠️ 警告：这将清空所有报名名单并重置状态！\n\n确定要开始新的一周吗？(请确保已归档上周记录)")) return;

        try {
            resetSessionBtn.disabled = true;
            resetSessionBtn.textContent = "重置中...";

            if (db) {
                // 1. Delete all players
                const playersRef = db.collection("sessions").doc("current").collection("players");
                const snapshot = await playersRef.get();

                const batch = db.batch();
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                // 2. Reset Status
                await db.collection("sessions").doc("current").update({
                    status: 'open',
                    courtNumbers: firebase.firestore.FieldValue.delete()
                });

                alert("已成功重置！新的一周开始了！");
                adminModal.classList.add('hidden');
            }
        } catch (error) {
            console.error("Error resetting session: ", error);
            alert("重置失败: " + error.message);
        } finally {
            resetSessionBtn.disabled = false;
            resetSessionBtn.innerHTML = '<i data-lucide="rotate-ccw"></i> 重置/开启新的一周';
            lucide.createIcons();
        }
    });
}

// --- History Logic ---

function renderHistoryList(dataToRender) {
    historyListEl.innerHTML = '';

    if (dataToRender.length === 0) {
        historyListEl.innerHTML = '<li class="empty-state">无匹配记录</li>';
        return;
    }

    dataToRender.forEach(({ doc, data }) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        // 费用显示
        let expenseHTML = '';
        if (data.expenses && data.expenses.totalCost > 0) {
            expenseHTML = `
                <div class="history-expense">
                    💰 人均: RM ${data.expenses.costPerPerson.toFixed(2)}
                </div>
            `;
        }

        li.innerHTML = `
            <div class="history-content">
                <div class="history-header">
                    <span class="history-date">${data.date}</span>
                    <span class="history-count">${data.playerCount} 人</span>
                </div>
                <div class="history-details">
                    ${data.location} | 球场: ${data.courtNumbers}
                </div>
                ${expenseHTML}
            </div>
            <button class="edit-expense-btn" data-session-id="${doc.id}" title="编辑费用">
                <i data-lucide="edit-2"></i>
            </button>
        `;

        // 点击 session 显示详细信息
        li.querySelector('.history-content').addEventListener('click', () => {
            const names = data.players.map(p => p.name).join(', ');
            let message = `【${data.date} 报名名单】\n\n参与者 (${data.playerCount}人):\n${names}`;

            if (data.expenses && data.expenses.totalCost > 0) {
                const exp = data.expenses;
                message += `\n\n费用明细:\n`;
                if (exp.courtRental > 0) message += `- 订场费用: RM ${exp.courtRental.toFixed(2)}\n`;
                if (exp.shuttlecockCount > 0) {
                    message += `- 羽毛球: ${exp.shuttlecockCount}粒 × RM ${exp.shuttlecockPrice.toFixed(2)} = RM ${(exp.shuttlecockCount * exp.shuttlecockPrice).toFixed(2)}\n`;
                }
                message += `${'\u2500'.repeat(20)}\n`;
                message += `总费用: RM ${exp.totalCost.toFixed(2)}\n`;
                message += `人均费用: RM ${exp.costPerPerson.toFixed(2)}`;
            }

            alert(message);
        });

        // 点击编辑按钮 (需管理员权限)
        li.querySelector('.edit-expense-btn').addEventListener('click', (e) => {
            e.stopPropagation();

            // 检查是否已登录
            if (isAdminAuthenticated) {
                openEditExpenseModal(doc.id, data);
            } else {
                // 设置待处理操作
                pendingLoginAction = () => openEditExpenseModal(doc.id, data);

                // 打开统一的管理员登录弹窗
                adminModal.classList.remove('hidden');
                adminLoginView.classList.remove('hidden');
                adminControlsView.classList.add('hidden');
                adminPasswordInput.value = '';
            }
        });

        historyListEl.appendChild(li);
    });

    lucide.createIcons();
}

function applySearch() {
    const keyword = filterSearch.value.toLowerCase().trim();

    if (!keyword) {
        // 没有关键字，显示全部
        renderHistoryList(allHistoryData);
        return;
    }

    // 根据关键字筛选
    const filtered = allHistoryData.filter(item => {
        const data = item.data;
        // 搜索日期、场馆名称
        return data.date.toLowerCase().includes(keyword) ||
            data.location.toLowerCase().includes(keyword);
    });

    renderHistoryList(filtered);
}

if (historyBtn) {
    historyBtn.addEventListener('click', async () => {
        historyModal.classList.remove('hidden');
        historyListEl.innerHTML = '<li class="empty-state">加载中...</li>';

        try {
            if (db) {
                const snapshot = await db.collection("history").orderBy("archivedAt", "desc").get();

                if (snapshot.empty) {
                    historyListEl.innerHTML = '<li class="empty-state">暂无历史记录</li>';
                    allHistoryData = [];
                    return;
                }

                // 存储所有数据
                allHistoryData = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    allHistoryData.push({ doc, data });
                });

                // 清空搜索框
                if (filterSearch) filterSearch.value = '';

                // 渲染所有记录
                renderHistoryList(allHistoryData);
            }
        } catch (error) {
            console.error("Error fetching history: ", error);
            historyListEl.innerHTML = '<li class="empty-state">加载失败</li>';
        }
    });
}

// 搜索框事件监听
if (filterSearch) {
    filterSearch.addEventListener('input', applySearch);
}

if (closeHistoryModalBtn) {
    closeHistoryModalBtn.addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });
}

// --- Expense Editing Logic ---

function updateEditCostCalculation() {
    const rental = parseFloat(editCourtRental.value) || 0;
    const count = parseInt(editShuttlecockCount.value) || 0;
    const price = parseFloat(editShuttlecockPrice.value) || 0;
    const playerCount = parseInt(editExpensePlayerCount.textContent) || 1;

    const totalCost = rental + (count * price);
    const perPersonCost = totalCost / playerCount;

    editTotalCost.textContent = `RM ${totalCost.toFixed(2)}`;
    editPerPersonCost.textContent = `RM ${perPersonCost.toFixed(2)}`;
}

[editCourtRental, editShuttlecockCount, editShuttlecockPrice].forEach(input => {
    if (input) input.addEventListener('input', updateEditCostCalculation);
});

function openEditExpenseModal(sessionId, sessionData) {
    currentEditingSessionId = sessionId;

    editExpenseDate.textContent = sessionData.date;
    editExpensePlayerCount.textContent = sessionData.playerCount;

    // 填充现有数据
    if (sessionData.expenses) {
        editCourtRental.value = sessionData.expenses.courtRental || '';
        editShuttlecockCount.value = sessionData.expenses.shuttlecockCount || '';
        editShuttlecockPrice.value = sessionData.expenses.shuttlecockPrice || '';
        updateEditCostCalculation();
    } else {
        // 重置
        editCourtRental.value = '';
        editShuttlecockCount.value = '';
        editShuttlecockPrice.value = '';
        editTotalCost.textContent = 'RM 0.00';
        editPerPersonCost.textContent = 'RM 0.00';
    }

    editExpenseModal.classList.remove('hidden');
}

if (closeEditExpenseModalBtn) {
    closeEditExpenseModalBtn.addEventListener('click', () => {
        editExpenseModal.classList.add('hidden');
    });
}

if (cancelExpenseBtn) {
    cancelExpenseBtn.addEventListener('click', () => {
        editExpenseModal.classList.add('hidden');
    });
}

if (saveExpenseBtn) {
    saveExpenseBtn.addEventListener('click', async () => {
        if (!currentEditingSessionId) return;

        const rental = parseFloat(editCourtRental.value) || 0;
        const count = parseInt(editShuttlecockCount.value) || 0;
        const price = parseFloat(editShuttlecockPrice.value) || 0;
        const playerCount = parseInt(editExpensePlayerCount.textContent) || 1;

        const totalCost = rental + (count * price);
        const perPersonCost = totalCost / playerCount;

        const expenseData = {
            courtRental: rental,
            shuttlecockCount: count,
            shuttlecockPrice: price,
            totalCost: totalCost,
            costPerPerson: perPersonCost
        };

        try {
            saveExpenseBtn.disabled = true;
            saveExpenseBtn.textContent = "保存中...";

            if (db) {
                await db.collection("history").doc(currentEditingSessionId).update({
                    expenses: expenseData
                });
                alert("费用已保存！");
                editExpenseModal.classList.add('hidden');
                // 刷新历史列表
                historyBtn.click();
            }
        } catch (error) {
            console.error("Error saving expenses: ", error);
            alert("保存失败: " + error.message);
        } finally {
            saveExpenseBtn.disabled = false;
            saveExpenseBtn.innerHTML = '<i data-lucide="save"></i> 保存';
            lucide.createIcons();
        }
    });
}
