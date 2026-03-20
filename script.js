// Configurações
const CONFIG = {
    PASSWORD: '061098',
    USE_FIREBASE: true // Altere para false para usar localStorage
};

// Estado
let state = {
    users: [],
    currentUserIndex: null,
    selectedDate: new Date(),
    currentDateView: new Date(),
    filter: 'all',
    firebaseService: null
};

// DOM Elements
let DOM = {};

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    await init();
});

async function init() {
    // Inicializar Firebase se configurado
    if (CONFIG.USE_FIREBASE) {
        try {
            const { firebaseService } = await import('./firebase-service.js');
            await firebaseService.init();
            state.firebaseService = firebaseService;
            console.log('✅ Firebase conectado');
        } catch (error) {
            console.warn('⚠️ Firebase não disponível, usando localStorage:', error);
            CONFIG.USE_FIREBASE = false;
        }
    }

    DOM = {
        loginScreen: document.getElementById('loginScreen'),
        appContainer: document.getElementById('appContainer'),
        loginForm: document.getElementById('loginForm'),
        passwordInput: document.getElementById('passwordInput'),
        loginError: document.getElementById('loginError'),
        btnLogout: document.getElementById('btnLogout'),
        userList: document.getElementById('userList'),
        headerUserName: document.getElementById('headerUserName'),
        headerDate: document.getElementById('headerDate'),
        calendarGrid: document.getElementById('calendarGrid'),
        currentMonthYear: document.getElementById('currentMonthYear'),
        tasksList: document.getElementById('tasksList'),
        selectedDateLabel: document.getElementById('selectedDateLabel'),
        alertsList: document.getElementById('alertsList'),
        stats: {
            overdue: document.getElementById('statOverdue'),
            near: document.getElementById('statNear'),
            today: document.getElementById('statToday'),
            done: document.getElementById('statDone')
        },
        modals: {
            user: document.getElementById('userModal'),
            task: document.getElementById('taskModal')
        },
        forms: {
            user: document.getElementById('userForm'),
            task: document.getElementById('taskForm')
        },
        inputs: {
            newUserName: document.getElementById('newUserName'),
            taskId: document.getElementById('taskId'),
            taskTitle: document.getElementById('taskTitle'),
            taskCreatedDate: document.getElementById('taskCreatedDate'),
            taskDueDate: document.getElementById('taskDueDate'),
            taskPriority: document.getElementById('taskPriority'),
            subtasksContainer: document.getElementById('subtasksContainer')
        },
        buttons: {
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth'),
            btnNewUser: document.getElementById('btnNewUser'),
            btnAddTask: document.getElementById('btnAddTask'),
            btnAddSubtask: document.getElementById('btnAddSubtask'),
            btnCancelUser: document.getElementById('btnCancelUser'),
            btnCancelTask: document.getElementById('btnCancelTask'),
            btnCloseUserModal: document.getElementById('btnCloseUserModal'),
            btnCloseTaskModal: document.getElementById('btnCloseTaskModal')
        }
    };

    checkSession();
    setupEventListeners();
}

// Obter data local no formato YYYY-MM-DD
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Converter string de data para objeto Date (considerando timezone local)
function parseLocalDate(dateString) {
    const parts = dateString.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// Verificar sessão
async function checkSession() {
    if (CONFIG.USE_FIREBASE && state.firebaseService) {
        const session = await state.firebaseService.getSession();
        if (session?.authenticated) {
            loadApp();
            return;
        }
    } else {
        const session = localStorage.getItem('nexus_session');
        if (session === 'active') {
            loadApp();
            return;
        }
    }
    
    DOM.loginScreen.classList.remove('hidden');
    DOM.appContainer.classList.add('hidden');
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    const password = DOM.passwordInput.value;
    
    if (password === CONFIG.PASSWORD) {
        if (CONFIG.USE_FIREBASE && state.firebaseService) {
            await state.firebaseService.saveSession({ authenticated: true, loginAt: Date.now() });
        } else {
            localStorage.setItem('nexus_session', 'active');
        }
        
        DOM.loginScreen.classList.add('hidden');
        DOM.appContainer.classList.remove('hidden');
        await loadApp();
    } else {
        DOM.loginError.classList.remove('hidden');
        DOM.passwordInput.value = '';
        DOM.passwordInput.focus();
        DOM.loginForm.style.animation = 'shake 0.5s';
        setTimeout(() => { DOM.loginForm.style.animation = ''; }, 500);
    }
}

// Logout
async function handleLogout() {
    if (CONFIG.USE_FIREBASE && state.firebaseService) {
        await state.firebaseService.clearSession();
        state.firebaseService.cleanup();
    } else {
        localStorage.removeItem('nexus_session');
    }
    location.reload();
}

// Carregar app
async function loadApp() {
    await loadData();
    if (state.users.length === 0) {
        await createUser('Admin');
    } else {
        selectUser(0);
    }
}

// Carregar dados
async function loadData() {
    if (CONFIG.USE_FIREBASE && state.firebaseService) {
        try {
            state.users = await state.firebaseService.getAllUsers();
        } catch (error) {
            console.error('Erro ao carregar do Firebase:', error);
            // Fallback para localStorage
            const stored = localStorage.getItem('nexus_planner_data_v7');
            if (stored) {
                state.users = JSON.parse(stored);
            }
        }
    } else {
        const stored = localStorage.getItem('nexus_planner_data_v7');
        if (stored) {
            try {
                state.users = JSON.parse(stored);
            } catch (e) {
                console.error('Erro ao parsear localStorage:', e);
                state.users = [];
            }
        }
    }
}

// Salvar dados
async function saveData() {
    if (CONFIG.USE_FIREBASE && state.firebaseService) {
        // Salva usuário por usuário no Firebase
        for (const user of state.users) {
            try {
                await state.firebaseService.updateUser(user.id, {
                    name: user.name,
                    tasks: user.tasks,
                    updatedAt: Date.now()
                });
            } catch (error) {
                console.error(`Erro ao salvar usuário ${user.id}:`, error);
            }
        }
    }
    
    // Sempre mantém backup no localStorage
    try {
        localStorage.setItem('nexus_planner_data_v7', JSON.stringify(state.users));
    } catch (e) {
        console.error('Erro ao salvar no localStorage:', e);
    }
    
    renderUserList();
    updateStats();
    renderAlerts();
}

// Criar usuário
async function createUser(name) {
    const newUser = { 
        id: Date.now().toString(), 
        name: name, 
        tasks: {}
    };
    
    if (CONFIG.USE_FIREBASE && state.firebaseService) {
        try {
            const created = await state.firebaseService.createUser({ name });
            state.users.push(created);
        } catch (error) {
            console.error('Erro no Firebase, criando localmente:', error);
            state.users.push(newUser);
        }
    } else {
        state.users.push(newUser);
    }
    
    await saveData();
    selectUser(state.users.length - 1);
    closeModal('user');
    DOM.inputs.newUserName.value = '';
}

// Deletar usuário
async function deleteUser(index, event) {
    if (event) event.stopPropagation();
    
    if (state.users.length === 1) {
        alert("Não é possível excluir o último usuário.");
        return;
    }
    
    if (confirm(`Excluir usuário "${state.users[index].name}"?`)) {
        const userId = state.users[index].id;
        
        if (CONFIG.USE_FIREBASE && state.firebaseService) {
            try {
                await state.firebaseService.deleteUser(userId);
            } catch (error) {
                console.error('Erro ao deletar no Firebase:', error);
            }
        }
        
        state.users.splice(index, 1);
        await saveData();
        
        if (index === state.currentUserIndex) {
            selectUser(0);
        } else if (index < state.currentUserIndex) {
            state.currentUserIndex--;
            renderUserList();
        }
    }
}

// Selecionar usuário
function selectUser(index) {
    state.currentUserIndex = index;
    renderUserList();
    renderCalendar();
    renderTasks();
    updateHeader();
    renderAlerts();
    
    // Setup listener em tempo real para este usuário (Firebase)
    if (CONFIG.USE_FIREBASE && state.firebaseService) {
        const currentUser = state.users[index];
        if (currentUser) {
            state.firebaseService.onTasksChange(currentUser.id, (tasks) => {
                // Atualiza tasks do usuário
                state.users[index].tasks = tasks || {};
                if (index === state.currentUserIndex) {
                    renderTasks();
                    renderCalendar();
                    renderAlerts();
                    updateStats();
                }
            });
        }
    }
}

// Obter usuário atual
function getCurrentUser() {
    return state.users[state.currentUserIndex];
}

// Criar tarefa
async function createTask(taskData) {
    const user = getCurrentUser();
    
    if (CONFIG.USE_FIREBASE && state.firebaseService) {
        try {
            const created = await state.firebaseService.createTask(user.id, taskData);
            if (!user.tasks) user.tasks = {};
            user.tasks[created.id] = created;
        } catch (error) {
            console.error('Erro ao criar no Firebase:', error);
            // Fallback local
            if (!user.tasks) user.tasks = {};
            user.tasks[taskData.id] = taskData;
        }
    } else {
        if (!user.tasks) user.tasks = {};
        user.tasks[taskData.id] = taskData;
    }
    
    await saveData();
    renderTasks();
    renderCalendar();
    closeModal('task');
}

// Atualizar tarefa
async function updateTask(id, updatedData) {
    const user = getCurrentUser();
    
    if (CONFIG.USE_FIREBASE && state.firebaseService && user.tasks?.[id]) {
        try {
            await state.firebaseService.updateTask(user.id, id, updatedData);
        } catch (error) {
            console.error('Erro ao atualizar no Firebase:', error);
        }
    }
    
    if (user.tasks?.[id]) {
        user.tasks[id] = { 
            ...user.tasks[id], 
            ...updatedData,
            completed: user.tasks[id].completed // Mantém status se não foi alterado
        };
    }
    
    await saveData();
    renderTasks();
    renderCalendar();
    closeModal('task');
}

// Deletar tarefa
window.deleteTask = async function(id) {
    if (!confirm('Excluir esta tarefa?')) return;
    const user = getCurrentUser();
    
    if (CONFIG.USE_FIREBASE && state.firebaseService) {
        try {
            await state.firebaseService.deleteTask(user.id, id);
        } catch (error) {
            console.error('Erro ao deletar no Firebase:', error);
        }
    }
    
    if (user.tasks?.[id]) {
        delete user.tasks[id];
    }
    
    await saveData();
    renderTasks();
    renderCalendar();
};

// Toggle tarefa
window.toggleTask = async function(id) {
    const user = getCurrentUser();
    const task = user.tasks?.[id];
    
    if (task) {
        task.completed = !task.completed;
        
        if (CONFIG.USE_FIREBASE && state.firebaseService) {
            try {
                await state.firebaseService.updateTask(user.id, id, { completed: task.completed });
            } catch (error) {
                console.error('Erro ao atualizar status:', error);
            }
        }
        
        await saveData();
        renderTasks();
    }
};

// Toggle sub-tarefa
window.toggleSubtask = async function(taskId, subtaskId) {
    const user = getCurrentUser();
    const task = user.tasks?.[taskId];
    
    if (task?.subtasks) {
        const sub = task.subtasks.find(s => s.id === subtaskId);
        if (sub) {
            sub.completed = !sub.completed;
            
            if (CONFIG.USE_FIREBASE && state.firebaseService) {
                try {
                    await state.firebaseService.updateTask(user.id, taskId, { subtasks: task.subtasks });
                } catch (error) {
                    console.error('Erro ao atualizar subtask:', error);
                }
            }
            
            await saveData();
            renderTasks();
        }
    }
};

// Toggle expandir/colapsar subtasks
window.toggleSubtasksExpand = function(taskId) {
    const wrapper = document.getElementById(`subtasks-${taskId}`);
    const toggle = document.querySelector(`[onclick="toggleSubtasksExpand('${taskId}')"]`);
    if (wrapper) {
        wrapper.classList.toggle('expanded');
        if (toggle) {
            toggle.classList.toggle('expanded');
        }
    }
};

// Abrir edição
window.openEditModal = function(id) {
    const user = getCurrentUser();
    const task = user.tasks?.[id];
    if (!task) return;
    
    openModal('task');
    document.getElementById('modalTitle').textContent = 'Editar Missão';
    DOM.inputs.taskId.value = task.id;
    DOM.inputs.taskTitle.value = task.title;
    DOM.inputs.taskCreatedDate.value = task.createdDate;
    DOM.inputs.taskDueDate.value = task.dueDate;
    DOM.inputs.taskPriority.value = task.priority || 'medium';
    
    DOM.inputs.subtasksContainer.innerHTML = '';
    if (task.subtasks) {
        task.subtasks.forEach(sub => addSubtaskInput(sub.title));
    }
};

// Renderizar usuários
function renderUserList() {
    DOM.userList.innerHTML = '';
    state.users.forEach((user, index) => {
        const el = document.createElement('div');
        el.className = `user-item ${index === state.currentUserIndex ? 'active' : ''}`;
        el.onclick = () => selectUser(index);
        
        const initial = user.name.charAt(0).toUpperCase();
        el.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${initial}</div>
                <span>${user.name}</span>
            </div>
            <button class="btn-delete-user" type="button" title="Excluir">&times;</button>
        `;
        
        const deleteBtn = el.querySelector('.btn-delete-user');
        deleteBtn.onclick = (e) => deleteUser(index, e);
        
        DOM.userList.appendChild(el);
    });
}

// Atualizar header
function updateHeader() {
    const user = getCurrentUser();
    DOM.headerUserName.textContent = `OPERADOR: ${user.name.toUpperCase()}`;
    const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
    DOM.headerDate.textContent = state.selectedDate.toLocaleDateString('pt-BR', dateOpts);
}

// Renderizar calendário
function renderCalendar() {
    const year = state.currentDateView.getFullYear();
    const month = state.currentDateView.getMonth();
    
    const monthName = state.currentDateView.toLocaleString('pt-BR', { month: 'long' });
    DOM.currentMonthYear.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    
    DOM.calendarGrid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        DOM.calendarGrid.appendChild(document.createElement('div'));
    }
    
    const user = getCurrentUser();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.textContent = day;
        
        if (isSameDate(date, today)) cell.classList.add('today');
        if (isSameDate(date, state.selectedDate)) cell.classList.add('selected');
        
        const dayTasks = user.tasks ? Object.values(user.tasks).filter(t => {
            const createdDate = parseLocalDate(t.createdDate);
            return isSameDate(createdDate, date);
        }) : [];
        
        if (dayTasks.length > 0) {
            cell.classList.add('has-task');
            
            const hasUrgent = dayTasks.some(t => {
                if (t.completed) return false;
                const dueDate = parseLocalDate(t.dueDate);
                const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                return diffDays <= 2 && diffDays >= 0;
            });
            
            if (hasUrgent) cell.classList.add('near-deadline');
        }
        
        cell.onclick = () => {
            state.selectedDate = new Date(year, month, day);
            updateHeader();
            renderCalendar();
            renderTasks();
        };
        
        DOM.calendarGrid.appendChild(cell);
    }
}

// Renderizar alertas de vencimento
function renderAlerts() {
    const user = getCurrentUser();
    DOM.alertsList.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alerts = [];
    const tasks = user.tasks ? Object.values(user.tasks) : [];
    
    tasks.forEach(task => {
        if (task.completed) return;
        
        const dueDate = parseLocalDate(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            alerts.push({
                task: task,
                days: Math.abs(diffDays),
                type: 'overdue',
                message: `VENCEU há ${Math.abs(diffDays)} dia(s)`,
                createdOn: parseLocalDate(task.createdDate).toLocaleDateString('pt-BR')
            });
        } else if (diffDays === 0) {
            alerts.push({
                task: task,
                days: 0,
                type: 'today',
                message: 'VENCE HOJE',
                createdOn: parseLocalDate(task.createdDate).toLocaleDateString('pt-BR')
            });
        } else if (diffDays <= 3) {
            alerts.push({
                task: task,
                days: diffDays,
                type: 'near',
                message: `Vence em ${diffDays} dia(s)`,
                createdOn: parseLocalDate(task.createdDate).toLocaleDateString('pt-BR')
            });
        }
    });
    
    alerts.sort((a, b) => a.days - b.days);
    
    if (alerts.length === 0) {
        DOM.alertsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">// Sem alertas</p>';
        return;
    }
    
    alerts.forEach(alert => {
        const alertEl = document.createElement('div');
        alertEl.className = `alert-item ${alert.type === 'overdue' || alert.type === 'today' ? 'urgent' : ''}`;
        alertEl.innerHTML = `
            <strong>${alert.task.title}</strong>
            <small>⚠ ${alert.message}</small><br>
            <small style="opacity: 0.7">Criada: ${alert.createdOn}</small>
        `;
        alertEl.onclick = () => {
            const createdDate = parseLocalDate(alert.task.createdDate);
            state.selectedDate = createdDate;
            renderCalendar();
            renderTasks();
        };
        alertEl.style.cursor = 'pointer';
        DOM.alertsList.appendChild(alertEl);
    });
}

// Renderizar tarefas
function renderTasks() {
    const user = getCurrentUser();
    DOM.tasksList.innerHTML = '';
    
    const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
    DOM.selectedDateLabel.textContent = `REGISTRO: ${state.selectedDate.toLocaleDateString('pt-BR', dateOpts)}`;
    
    const tasks = user.tasks ? Object.values(user.tasks) : [];
    
    // Filtrar tarefas CRIADAS neste dia
    let filteredTasks = tasks.filter(t => {
        const createdDate = parseLocalDate(t.createdDate);
        return isSameDate(createdDate, state.selectedDate);
    });
    
    if (state.filter === 'pending') filteredTasks = filteredTasks.filter(t => !t.completed);
    if (state.filter === 'done') filteredTasks = filteredTasks.filter(t => t.completed);
    
    if (filteredTasks.length === 0) {
        DOM.tasksList.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">Nenhuma tarefa registrada neste dia</div>';
        return;
    }
    
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed - b.completed;
        
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority || 'medium'];
        const priorityB = priorityOrder[b.priority || 'medium'];
        return priorityB - priorityA;
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    filteredTasks.forEach(task => {
        const status = getTaskStatus(task);
        const dueDate = parseLocalDate(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority || 'medium'}`;
        
        if (!task.completed && diffDays <= 2) {
            card.classList.add('urgent');
        }
        
        const priorityText = {
            low: 'BAIXA',
            medium: 'MÉDIA',
            high: 'ALTA'
        };
        
        let subtasksHtml = '';
        if (task.subtasks && task.subtasks.length > 0) {
            const completedSubs = task.subtasks.filter(s => s.completed).length;
            const totalSubs = task.subtasks.length;
            const progress = Math.round((completedSubs / totalSubs) * 100);
            
            subtasksHtml = `
                <div class="subtasks-toggle" onclick="toggleSubtasksExpand('${task.id}')">
                    <span>📋 Sub-rotinas (${completedSubs}/${totalSubs})</span>
                    <span class="subtasks-count">${progress}% concluído</span>
                    <span class="arrow">▼</span>
                </div>
                <div id="subtasks-${task.id}" class="subtasks-wrapper">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin: 10px 0 5px 0;">
                        Progresso: ${progress}%
                    </div>
            `;
            task.subtasks.forEach(sub => {
                subtasksHtml += `
                    <div class="subtask-item ${sub.completed ? 'completed' : ''}">
                        <input type="checkbox" ${sub.completed ? 'checked' : ''} onchange="toggleSubtask('${task.id}', '${sub.id}')">
                        <span>${sub.title}</span>
                    </div>
                `;
            });
            subtasksHtml += `</div>`;
        }
        
        card.innerHTML = `
            <div class="task-main">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
                <div class="task-info">
                    <div class="task-title" style="${task.completed ? 'text-decoration:line-through; opacity:0.5' : ''}">${task.title}</div>
                    <div class="task-meta">
                        <span class="badge ${status.class}">${status.label}</span>
                        <span class="priority-badge ${task.priority || 'medium'}">${priorityText[task.priority || 'medium']}</span>
                        <span>📅 Vence: ${parseLocalDate(task.dueDate).toLocaleDateString('pt-BR')}</span>
                        ${!task.completed && diffDays <= 2 ? '<span style="color:var(--warning); font-weight:600;">⚠ URGENTE</span>' : ''}
                    </div>
                    ${subtasksHtml}
                </div>
                <div class="actions">
                    <button type="button" class="btn-icon" onclick="openEditModal('${task.id}')" title="Editar">✎</button>
                    <button type="button" class="btn-icon" onclick="deleteTask('${task.id}')" title="Excluir" style="color:var(--danger)">🗑</button>
                </div>
            </div>
        `;
        DOM.tasksList.appendChild(card);
    });
    
    updateStats();
}

// Atualizar stats
function updateStats() {
    const user = getCurrentUser();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let overdue = 0, near = 0, todoToday = 0, done = 0;
    
    const tasks = user.tasks ? Object.values(user.tasks) : [];
    
    tasks.forEach(task => {
        if (task.completed) {
            done++;
            return;
        }
        
        const dueDate = parseLocalDate(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) overdue++;
        else if (diffDays === 0) todoToday++;
        else if (diffDays <= 3) near++;
    });
    
    DOM.stats.overdue.textContent = overdue;
    DOM.stats.near.textContent = near;
    DOM.stats.today.textContent = todoToday;
    DOM.stats.done.textContent = done;
}

// Verificar datas iguais
function isSameDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

// Status da tarefa
function getTaskStatus(task) {
    if (task.completed) return { label: 'OK', class: 'normal' };
    
    const dueDate = parseLocalDate(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (dueDate < today) return { label: 'VENCIDA', class: 'overdue' };
    if (isSameDate(dueDate, today)) return { label: 'VENCE HOJE', class: 'today' };
    if (diffDays <= 3) return { label: 'PRÓXIMO', class: 'near' };
    return { label: 'NO PRAZO', class: 'normal' };
}

// Modal functions
function openModal(type) {
    DOM.modals[type].classList.remove('hidden');
}

function closeModal(type) {
    DOM.modals[type].classList.add('hidden');
    if (type === 'task') {
        DOM.forms.task.reset();
        DOM.inputs.taskId.value = '';
        DOM.inputs.subtasksContainer.innerHTML = '';
    }
    if (type === 'user') {
        DOM.forms.user.reset();
    }
}

// Fechar todos os modais
function closeAllModals() {
    closeModal('user');
    closeModal('task');
}

// Adicionar sub-tarefa
function addSubtaskInput(text = '') {
    const div = document.createElement('div');
    div.className = 'subtask-input-row';
    div.innerHTML = `
        <input type="text" class="subtask-text" value="${text}" placeholder="Sub-rotina..." autocomplete="off">
        <button type="button" class="btn-remove-sub" onclick="this.parentElement.remove()">×</button>
    `;
    DOM.inputs.subtasksContainer.appendChild(div);
}

// Setup event listeners
function setupEventListeners() {
    // Login
    if (DOM.loginForm) {
        DOM.loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout
    if (DOM.btnLogout) {
        DOM.btnLogout.addEventListener('click', handleLogout);
    }
    
    // Calendário
    if (DOM.buttons.prevMonth) {
        DOM.buttons.prevMonth.addEventListener('click', () => {
            state.currentDateView.setMonth(state.currentDateView.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (DOM.buttons.nextMonth) {
        DOM.buttons.nextMonth.addEventListener('click', () => {
            state.currentDateView.setMonth(state.currentDateView.getMonth() + 1);
            renderCalendar();
        });
    }
    
    // Filtros
    document.querySelectorAll('.filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.filter = e.target.dataset.filter;
            renderTasks();
        });
    });
    
    // Botões de modal - Abrir
    if (DOM.buttons.btnNewUser) {
        DOM.buttons.btnNewUser.addEventListener('click', () => openModal('user'));
    }
    
    if (DOM.buttons.btnAddTask) {
        DOM.buttons.btnAddTask.addEventListener('click', () => {
            document.getElementById('modalTitle').textContent = 'Nova Missão';
            DOM.forms.task.reset();
            DOM.inputs.taskId.value = '';
            DOM.inputs.taskCreatedDate.value = getLocalDateString(new Date());
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            DOM.inputs.taskDueDate.value = getLocalDateString(dueDate);
            DOM.inputs.subtasksContainer.innerHTML = '';
            openModal('task');
        });
    }
    
    if (DOM.buttons.btnAddSubtask) {
        DOM.buttons.btnAddSubtask.addEventListener('click', () => addSubtaskInput());
    }
    
    // Botões de modal - Fechar
    if (DOM.buttons.btnCancelUser) {
        DOM.buttons.btnCancelUser.addEventListener('click', () => closeModal('user'));
    }
    
    if (DOM.buttons.btnCancelTask) {
        DOM.buttons.btnCancelTask.addEventListener('click', () => closeModal('task'));
    }
    
    if (DOM.buttons.btnCloseUserModal) {
        DOM.buttons.btnCloseUserModal.addEventListener('click', () => closeModal('user'));
    }
    
    if (DOM.buttons.btnCloseTaskModal) {
        DOM.buttons.btnCloseTaskModal.addEventListener('click', () => closeModal('task'));
    }
    
    // Fechar ao clicar fora do modal
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.add('hidden');
        }
    });
    
    // Tecla ESC para fechar modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Formulário de usuário
    if (DOM.forms.user) {
        DOM.forms.user.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = DOM.inputs.newUserName.value.trim();
            if (name) createUser(name);
        });
    }
    
    // Formulário de tarefa
    if (DOM.forms.task) {
        DOM.forms.task.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const subtasksEls = document.querySelectorAll('.subtask-input-row');
            const subtasks = [];
            subtasksEls.forEach(el => {
                const txt = el.querySelector('.subtask-text').value.trim();
                if (txt) {
                    subtasks.push({ 
                        id: Date.now().toString() + Math.random(), 
                        title: txt, 
                        completed: false 
                    });
                }
            });
            
            const taskData = {
                id: DOM.inputs.taskId.value || Date.now().toString(),
                title: DOM.inputs.taskTitle.value,
                createdDate: DOM.inputs.taskCreatedDate.value,
                dueDate: DOM.inputs.taskDueDate.value,
                priority: DOM.inputs.taskPriority.value,
                subtasks: subtasks,
                completed: false
            };
            
            if (DOM.inputs.taskId.value) {
                await updateTask(DOM.inputs.taskId.value, taskData);
            } else {
                await createTask(taskData);
            }
        });
    }
}

// Cleanup ao fechar página
window.addEventListener('beforeunload', () => {
    if (state.firebaseService) {
        state.firebaseService.cleanup();
    }
});