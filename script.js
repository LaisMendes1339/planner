// ============================================
// NEXUS PLANNER - SISTEMA SEGURO
// Senha: 061098
// Desenvolvido por Laís Mendes | 2026
// ============================================

// Configurações
const CONFIG = {
    PASSWORD: '061098',
    STORAGE_KEY: 'nexus_planner_data_v7'
};

// Estado da aplicação
let state = {
    users: [],
    currentUserIndex: null,
    selectedDate: new Date(),
    currentDateView: new Date(),
    filter: 'all'
};

// Elementos do DOM
let DOM = {};

// Inicialização - Aguarda DOM estar completo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Nexus Planner - Iniciando...');
    init();
});

function init() {
    // Verifica se todos os elementos existem
    try {
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

        console.log('DOM inicializado com sucesso');
        checkSession();
        setupEventListeners();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        alert('Erro ao carregar o sistema. Atualize a página (F5).');
    }
}

// Obter data local no formato YYYY-MM-DD
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

// Converter string de data para objeto Date
function parseLocalDate(dateString) {
    const parts = dateString.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// Verificar sessão
function checkSession() {
    try {
        const session = localStorage.getItem('nexus_session');
        console.log('Sessão:', session);
        
        if (session === 'active') {
            loadApp();
        } else {
            if (DOM.loginScreen) DOM.loginScreen.classList.remove('hidden');
            if (DOM.appContainer) DOM.appContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        // Mostra tela de login em caso de erro
        if (DOM.loginScreen) DOM.loginScreen.classList.remove('hidden');
        if (DOM.appContainer) DOM.appContainer.classList.add('hidden');
    }
}

// Login
function handleLogin(e) {
    e.preventDefault();
    
    if (!DOM.passwordInput) {
        console.error('Input de senha não encontrado');
        return;
    }
    
    const password = DOM.passwordInput.value;
    console.log('Tentativa de login - Senha digitada:', password);
    console.log('Senha correta:', CONFIG.PASSWORD);
    
    if (password === CONFIG.PASSWORD) {
        try {
            localStorage.setItem('nexus_session', 'active');
            console.log('Login bem-sucedido!');
            
            if (DOM.loginScreen) DOM.loginScreen.classList.add('hidden');
            if (DOM.appContainer) DOM.appContainer.classList.remove('hidden');
            
            loadApp();
        } catch (error) {
            console.error('Erro no login:', error);
            alert('Erro ao fazer login. Tente novamente.');
        }
    } else {
        console.log('Senha incorreta!');
        if (DOM.loginError) DOM.loginError.classList.remove('hidden');
        if (DOM.passwordInput) {
            DOM.passwordInput.value = '';
            DOM.passwordInput.focus();
        }
        if (DOM.loginForm) {
            DOM.loginForm.style.animation = 'shake 0.5s';
            setTimeout(function() { 
                DOM.loginForm.style.animation = ''; 
            }, 500);
        }
    }
}

// Logout
function handleLogout() {
    try {
        localStorage.removeItem('nexus_session');
        location.reload();
    } catch (error) {
        console.error('Erro no logout:', error);
        location.reload();
    }
}

// Carregar app
function loadApp() {
    console.log('Carregando aplicação...');
    loadData();
    
    if (state.users.length === 0) {
        console.log('Nenhum usuário encontrado, criando Admin...');
        createUser('Admin');
    } else {
        console.log('Usuários encontrados:', state.users.length);
        selectUser(0);
    }
}

// Carregar dados do localStorage
function loadData() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        console.log('Dados carregados do localStorage:', stored ? 'Sim' : 'Não');
        
        if (stored) {
            state.users = JSON.parse(stored);
        } else {
            state.users = [];
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        state.users = [];
    }
}

// Salvar dados no localStorage
function saveData() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.users));
        console.log('Dados salvos com sucesso');
        
        renderUserList();
        updateStats();
        renderAlerts();
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Erro ao salvar dados. Verifique se o localStorage está habilitado.');
    }
}

// Criar usuário
function createUser(name) {
    const newUser = { 
        id: Date.now().toString(), 
        name: name, 
        tasks: [] 
    };
    state.users.push(newUser);
    saveData();
    selectUser(state.users.length - 1);
    closeModal('user');
    if (DOM.inputs.newUserName) DOM.inputs.newUserName.value = '';
}

// Deletar usuário
function deleteUser(index, event) {
    if (event) event.stopPropagation();
    
    if (state.users.length === 1) {
        alert('Não é possível excluir o último usuário.');
        return;
    }
    
    if (confirm('Excluir usuário "' + state.users[index].name + '"?')) {
        state.users.splice(index, 1);
        saveData();
        
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
}

// Obter usuário atual
function getCurrentUser() {
    return state.users[state.currentUserIndex];
}

// Criar tarefa
function createTask(taskData) {
    const user = getCurrentUser();
    user.tasks.push(taskData);
    saveData();
    renderTasks();
    renderCalendar();
    closeModal('task');
}

// Atualizar tarefa
function updateTask(id, updatedData) {
    const user = getCurrentUser();
    const taskIndex = user.tasks.findIndex(function(t) { return t.id === id; });
    
    if (taskIndex > -1) {
        updatedData.completed = user.tasks[taskIndex].completed;
        user.tasks[taskIndex] = Object.assign({}, user.tasks[taskIndex], updatedData);
        saveData();
        renderTasks();
        renderCalendar();
        closeModal('task');
    }
}

// Deletar tarefa
window.deleteTask = function(id) {
    if (!confirm('Excluir esta tarefa?')) return;
    const user = getCurrentUser();
    user.tasks = user.tasks.filter(function(t) { return t.id !== id; });
    saveData();
    renderTasks();
    renderCalendar();
};

// Toggle tarefa
window.toggleTask = function(id) {
    const user = getCurrentUser();
    const task = user.tasks.find(function(t) { return t.id === id; });
    if (task) {
        task.completed = !task.completed;
        saveData();
        renderTasks();
    }
};

// Toggle sub-tarefa
window.toggleSubtask = function(taskId, subtaskId) {
    const user = getCurrentUser();
    const task = user.tasks.find(function(t) { return t.id === taskId; });
    if (task && task.subtasks) {
        const sub = task.subtasks.find(function(s) { return s.id === subtaskId; });
        if (sub) {
            sub.completed = !sub.completed;
            saveData();
            renderTasks();
        }
    }
};

// Toggle expandir/colapsar subtasks
window.toggleSubtasksExpand = function(taskId) {
    const wrapper = document.getElementById('subtasks-' + taskId);
    const toggle = document.querySelector('[onclick="toggleSubtasksExpand(\'' + taskId + '\')"]');
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
    const task = user.tasks.find(function(t) { return t.id === id; });
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
        task.subtasks.forEach(function(sub) { addSubtaskInput(sub.title); });
    }
};

// Renderizar usuários
function renderUserList() {
    if (!DOM.userList) return;
    
    DOM.userList.innerHTML = '';
    state.users.forEach(function(user, index) {
        const el = document.createElement('div');
        el.className = 'user-item' + (index === state.currentUserIndex ? ' active' : '');
        el.onclick = function() { selectUser(index); };
        
        const initial = user.name.charAt(0).toUpperCase();
        el.innerHTML = '<div class="user-info"><div class="user-avatar">' + initial + '</div><span>' + user.name + '</span></div><button class="btn-delete-user" type="button" title="Excluir">×</button>';
        
        const deleteBtn = el.querySelector('.btn-delete-user');
        deleteBtn.onclick = function(e) { deleteUser(index, e); };
        
        DOM.userList.appendChild(el);
    });
}

// Atualizar header
function updateHeader() {
    const user = getCurrentUser();
    DOM.headerUserName.textContent = 'OPERADOR: ' + user.name.toUpperCase();
    const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
    DOM.headerDate.textContent = state.selectedDate.toLocaleDateString('pt-BR', dateOpts);
}

// Renderizar calendário
function renderCalendar() {
    if (!DOM.calendarGrid) return;
    
    const year = state.currentDateView.getFullYear();
    const month = state.currentDateView.getMonth();
    
    const monthName = state.currentDateView.toLocaleString('pt-BR', { month: 'long' });
    DOM.currentMonthYear.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + year;
    
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
        
        const dayTasks = user.tasks.filter(function(t) {
            const createdDate = parseLocalDate(t.createdDate);
            return isSameDate(createdDate, date);
        });
        
        if (dayTasks.length > 0) {
            cell.classList.add('has-task');
            
            const hasUrgent = dayTasks.some(function(t) {
                if (t.completed) return false;
                const dueDate = parseLocalDate(t.dueDate);
                const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                return diffDays <= 2 && diffDays >= 0;
            });
            
            if (hasUrgent) cell.classList.add('near-deadline');
        }
        
        cell.onclick = function() {
            state.selectedDate = new Date(year, month, day);
            updateHeader();
            renderCalendar();
            renderTasks();
        };
        
        DOM.calendarGrid.appendChild(cell);
    }
}

// Renderizar alertas
function renderAlerts() {
    if (!DOM.alertsList) return;
    
    const user = getCurrentUser();
    DOM.alertsList.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alerts = [];
    
    user.tasks.forEach(function(task) {
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
                message: 'VENCEU há ' + Math.abs(diffDays) + ' dia(s)',
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
                message: 'Vence em ' + diffDays + ' dia(s)',
                createdOn: parseLocalDate(task.createdDate).toLocaleDateString('pt-BR')
            });
        }
    });
    
    alerts.sort(function(a, b) { return a.days - b.days; });
    
    if (alerts.length === 0) {
        DOM.alertsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">// Sem alertas</p>';
        return;
    }
    
    alerts.forEach(function(alert) {
        const alertEl = document.createElement('div');
        alertEl.className = 'alert-item' + (alert.type === 'overdue' || alert.type === 'today' ? ' urgent' : '');
        alertEl.innerHTML = '<strong>' + alert.task.title + '</strong><small>⚠ ' + alert.message + '</small><br><small style="opacity: 0.7">Criada: ' + alert.createdOn + '</small>';
        alertEl.onclick = function() {
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
    if (!DOM.tasksList) return;
    
    const user = getCurrentUser();
    DOM.tasksList.innerHTML = '';
    
    const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
    DOM.selectedDateLabel.textContent = 'REGISTRO: ' + state.selectedDate.toLocaleDateString('pt-BR', dateOpts);
    
    let tasks = user.tasks.filter(function(t) {
        const createdDate = parseLocalDate(t.createdDate);
        return isSameDate(createdDate, state.selectedDate);
    });
    
    if (state.filter === 'pending') tasks = tasks.filter(function(t) { return !t.completed; });
    if (state.filter === 'done') tasks = tasks.filter(function(t) { return t.completed; });
    
    if (tasks.length === 0) {
        DOM.tasksList.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">Nenhuma tarefa registrada neste dia</div>';
        return;
    }
    
    tasks.sort(function(a, b) {
        if (a.completed !== b.completed) return a.completed - b.completed;
        
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority || 'medium'];
        const priorityB = priorityOrder[b.priority || 'medium'];
        return priorityB - priorityA;
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    tasks.forEach(function(task) {
        const status = getTaskStatus(task);
        const dueDate = parseLocalDate(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        const card = document.createElement('div');
        card.className = 'task-card priority-' + (task.priority || 'medium');
        
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
            const completedSubs = task.subtasks.filter(function(s) { return s.completed; }).length;
            const totalSubs = task.subtasks.length;
            const progress = Math.round((completedSubs / totalSubs) * 100);
            
            subtasksHtml = '<div class="subtasks-toggle" onclick="toggleSubtasksExpand(\'' + task.id + '\')"><span>📋 Sub-rotinas (' + completedSubs + '/' + totalSubs + ')</span><span class="subtasks-count">' + progress + '% concluído</span><span class="arrow">▼</span></div><div id="subtasks-' + task.id + '" class="subtasks-wrapper"><div style="font-size: 0.75rem; color: var(--text-muted); margin: 10px 0 5px 0;">Progresso: ' + progress + '%</div>';
            
            task.subtasks.forEach(function(sub) {
                subtasksHtml += '<div class="subtask-item' + (sub.completed ? ' completed' : '') + '"><input type="checkbox"' + (sub.completed ? ' checked' : '') + ' onchange="toggleSubtask(\'' + task.id + '\', \'' + sub.id + '\')"><span>' + sub.title + '</span></div>';
            });
            subtasksHtml += '</div>';
        }
        
        card.innerHTML = '<div class="task-main"><input type="checkbox" class="task-checkbox"' + (task.completed ? ' checked' : '') + ' onchange="toggleTask(\'' + task.id + '\')"><div class="task-info"><div class="task-title" style="' + (task.completed ? 'text-decoration:line-through; opacity:0.5' : '') + '">' + task.title + '</div><div class="task-meta"><span class="badge ' + status.class + '">' + status.label + '</span><span class="priority-badge ' + (task.priority || 'medium') + '">' + priorityText[task.priority || 'medium'] + '</span><span>📅 Vence: ' + parseLocalDate(task.dueDate).toLocaleDateString('pt-BR') + '</span>' + (!task.completed && diffDays <= 2 ? '<span style="color:var(--warning); font-weight:600;">⚠ URGENTE</span>' : '') + '</div>' + subtasksHtml + '</div><div class="actions"><button type="button" class="btn-icon" onclick="openEditModal(\'' + task.id + '\')" title="Editar">✎</button><button type="button" class="btn-icon" onclick="deleteTask(\'' + task.id + '\')" title="Excluir" style="color:var(--danger)">🗑</button></div></div>';
        
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
    
    user.tasks.forEach(function(task) {
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
    
    if (DOM.stats.overdue) DOM.stats.overdue.textContent = overdue;
    if (DOM.stats.near) DOM.stats.near.textContent = near;
    if (DOM.stats.today) DOM.stats.today.textContent = todoToday;
    if (DOM.stats.done) DOM.stats.done.textContent = done;
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
    if (DOM.modals[type]) DOM.modals[type].classList.remove('hidden');
}

function closeModal(type) {
    if (DOM.modals[type]) DOM.modals[type].classList.add('hidden');
    if (type === 'task') {
        if (DOM.forms.task) DOM.forms.task.reset();
        if (DOM.inputs.taskId) DOM.inputs.taskId.value = '';
        if (DOM.inputs.subtasksContainer) DOM.inputs.subtasksContainer.innerHTML = '';
    }
    if (type === 'user') {
        if (DOM.forms.user) DOM.forms.user.reset();
    }
}

// Fechar todos os modais
function closeAllModals() {
    closeModal('user');
    closeModal('task');
}

// Adicionar sub-tarefa
function addSubtaskInput(text) {
    text = text || '';
    const div = document.createElement('div');
    div.className = 'subtask-input-row';
    div.innerHTML = '<input type="text" class="subtask-text" value="' + text + '" placeholder="Sub-rotina..." autocomplete="off"><button type="button" class="btn-remove-sub" onclick="this.parentElement.remove()">×</button>';
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
        DOM.buttons.prevMonth.addEventListener('click', function() {
            state.currentDateView.setMonth(state.currentDateView.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (DOM.buttons.nextMonth) {
        DOM.buttons.nextMonth.addEventListener('click', function() {
            state.currentDateView.setMonth(state.currentDateView.getMonth() + 1);
            renderCalendar();
        });
    }
    
    // Filtros
    document.querySelectorAll('.filter').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            document.querySelectorAll('.filter').forEach(function(b) { b.classList.remove('active'); });
            e.target.classList.add('active');
            state.filter = e.target.dataset.filter;
            renderTasks();
        });
    });
    
    // Botões de modal - Abrir
    if (DOM.buttons.btnNewUser) {
        DOM.buttons.btnNewUser.addEventListener('click', function() { openModal('user'); });
    }
    
    if (DOM.buttons.btnAddTask) {
        DOM.buttons.btnAddTask.addEventListener('click', function() {
            document.getElementById('modalTitle').textContent = 'Nova Missão';
            if (DOM.forms.task) DOM.forms.task.reset();
            if (DOM.inputs.taskId) DOM.inputs.taskId.value = '';
            if (DOM.inputs.taskCreatedDate) DOM.inputs.taskCreatedDate.value = getLocalDateString(new Date());
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            if (DOM.inputs.taskDueDate) DOM.inputs.taskDueDate.value = getLocalDateString(dueDate);
            if (DOM.inputs.subtasksContainer) DOM.inputs.subtasksContainer.innerHTML = '';
            openModal('task');
        });
    }
    
    if (DOM.buttons.btnAddSubtask) {
        DOM.buttons.btnAddSubtask.addEventListener('click', function() { addSubtaskInput(''); });
    }
    
    // Botões de modal - Fechar
    if (DOM.buttons.btnCancelUser) {
        DOM.buttons.btnCancelUser.addEventListener('click', function() { closeModal('user'); });
    }
    
    if (DOM.buttons.btnCancelTask) {
        DOM.buttons.btnCancelTask.addEventListener('click', function() { closeModal('task'); });
    }
    
    if (DOM.buttons.btnCloseUserModal) {
        DOM.buttons.btnCloseUserModal.addEventListener('click', function() { closeModal('user'); });
    }
    
    if (DOM.buttons.btnCloseTaskModal) {
        DOM.buttons.btnCloseTaskModal.addEventListener('click', function() { closeModal('task'); });
    }
    
    // Fechar ao clicar fora do modal
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.add('hidden');
        }
    });
    
    // Tecla ESC para fechar modais
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Formulário de usuário
    if (DOM.forms.user) {
        DOM.forms.user.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = DOM.inputs.newUserName.value.trim();
            if (name) createUser(name);
        });
    }
    
    // Formulário de tarefa
    if (DOM.forms.task) {
        DOM.forms.task.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const subtasksEls = document.querySelectorAll('.subtask-input-row');
            const subtasks = [];
            subtasksEls.forEach(function(el) {
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
                updateTask(DOM.inputs.taskId.value, taskData);
            } else {
                createTask(taskData);
            }
        });
    }
    
    console.log('Event listeners configurados com sucesso');
}
