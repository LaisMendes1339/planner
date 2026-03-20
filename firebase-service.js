// firebase-service.js
// Serviço para operações com Firebase Realtime Database

// Aguardar Firebase estar disponível
export async function waitForFirebase() {
    while (!window.firebaseDB) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.firebaseDB;
}

// Paths do banco de dados
const DB_PATHS = {
    USERS: 'users',
    SESSION: 'session'
};

// Inicializar serviço
export class FirebaseService {
    constructor() {
        this.db = null;
        this.listeners = new Map();
    }

    async init() {
        const fb = await waitForFirebase();
        this.db = fb.database;
        this.firebase = fb;
        return this;
    }

    // === OPERAÇÕES DE USUÁRIOS ===

    // Criar usuário
    async createUser(userData) {
        try {
            const userRef = this.firebase.push(this.firebase.ref(DB_PATHS.USERS));
            const userId = userRef.key;
            await this.firebase.set(userRef, {
                id: userId,
                name: userData.name,
                tasks: {},
                createdAt: Date.now()
            });
            return { id: userId, ...userData };
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            throw error;
        }
    }

    // Obter todos os usuários
    async getAllUsers() {
        try {
            const snapshot = await this.firebase.get(this.firebase.ref(DB_PATHS.USERS));
            if (!snapshot.exists()) return [];
            
            const users = [];
            snapshot.forEach(child => {
                users.push(child.val());
            });
            return users;
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
    }

    // Atualizar usuário
    async updateUser(userId, updates) {
        try {
            await this.firebase.update(
                this.firebase.ref(`${DB_PATHS.USERS}/${userId}`),
                updates
            );
            return true;
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    }

    // Deletar usuário
    async deleteUser(userId) {
        try {
            await this.firebase.remove(this.firebase.ref(`${DB_PATHS.USERS}/${userId}`));
            return true;
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            throw error;
        }
    }

    // === OPERAÇÕES DE TAREFAS ===

    // Criar tarefa para um usuário
    async createTask(userId, taskData) {
        try {
            const taskRef = this.firebase.push(
                this.firebase.ref(`${DB_PATHS.USERS}/${userId}/tasks`)
            );
            const taskId = taskRef.key;
            
            const task = {
                id: taskId,
                title: taskData.title,
                createdDate: taskData.createdDate,
                dueDate: taskData.dueDate,
                priority: taskData.priority || 'medium',
                subtasks: taskData.subtasks || [],
                completed: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            
            await this.firebase.set(taskRef, task);
            return { id: taskId, ...task };
        } catch (error) {
            console.error('Erro ao criar tarefa:', error);
            throw error;
        }
    }

    // Obter tarefas de um usuário
    async getTasks(userId) {
        try {
            const snapshot = await this.firebase.get(
                this.firebase.ref(`${DB_PATHS.USERS}/${userId}/tasks`)
            );
            if (!snapshot.exists()) return [];
            
            const tasks = [];
            snapshot.forEach(child => {
                tasks.push(child.val());
            });
            return tasks;
        } catch (error) {
            console.error('Erro ao buscar tarefas:', error);
            return [];
        }
    }

    // Atualizar tarefa
    async updateTask(userId, taskId, updates) {
        try {
            await this.firebase.update(
                this.firebase.ref(`${DB_PATHS.USERS}/${userId}/tasks/${taskId}`),
                {
                    ...updates,
                    updatedAt: Date.now()
                }
            );
            return true;
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error);
            throw error;
        }
    }

    // Deletar tarefa
    async deleteTask(userId, taskId) {
        try {
            await this.firebase.remove(
                this.firebase.ref(`${DB_PATHS.USERS}/${userId}/tasks/${taskId}`)
            );
            return true;
        } catch (error) {
            console.error('Erro ao deletar tarefa:', error);
            throw error;
        }
    }

    // === LISTENERS EM TEMPO REAL ===

    // Ouvir mudanças em um usuário específico
    onUserChange(userId, callback) {
        const userRef = this.firebase.ref(`${DB_PATHS.USERS}/${userId}`);
        
        const listener = this.firebase.onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        });
        
        this.listeners.set(`user_${userId}`, { ref: userRef, listener });
        return () => this.offUserChange(userId);
    }

    // Parar de ouvir mudanças em usuário
    offUserChange(userId) {
        const key = `user_${userId}`;
        if (this.listeners.has(key)) {
            const { ref, listener } = this.listeners.get(key);
            this.firebase.off(ref, 'value', listener);
            this.listeners.delete(key);
        }
    }

    // Ouvir mudanças nas tarefas de um usuário
    onTasksChange(userId, callback) {
        const tasksRef = this.firebase.ref(`${DB_PATHS.USERS}/${userId}/tasks`);
        
        const listener = this.firebase.onValue(tasksRef, (snapshot) => {
            const tasks = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    tasks.push(child.val());
                });
            }
            callback(tasks);
        });
        
        this.listeners.set(`tasks_${userId}`, { ref: tasksRef, listener });
        return () => this.offTasksChange(userId);
    }

    // Parar de ouvir mudanças nas tarefas
    offTasksChange(userId) {
        const key = `tasks_${userId}`;
        if (this.listeners.has(key)) {
            const { ref, listener } = this.listeners.get(key);
            this.firebase.off(ref, 'value', listener);
            this.listeners.delete(key);
        }
    }

    // Limpar todos os listeners
    cleanup() {
        this.listeners.forEach(({ ref, listener }) => {
            this.firebase.off(ref, 'value', listener);
        });
        this.listeners.clear();
    }

    // === SESSÃO ===

    // Salvar sessão
    async saveSession(sessionData) {
        try {
            await this.firebase.set(
                this.firebase.ref(DB_PATHS.SESSION),
                { ...sessionData, updatedAt: Date.now() }
            );
            return true;
        } catch (error) {
            console.error('Erro ao salvar sessão:', error);
            // Fallback para localStorage se Firebase falhar
            localStorage.setItem('nexus_session_fallback', JSON.stringify(sessionData));
            return true;
        }
    }

    // Obter sessão
    async getSession() {
        try {
            const snapshot = await this.firebase.get(this.firebase.ref(DB_PATHS.SESSION));
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar sessão:', error);
            // Fallback para localStorage
            const fallback = localStorage.getItem('nexus_session_fallback');
            return fallback ? JSON.parse(fallback) : null;
        }
    }

    // Limpar sessão
    async clearSession() {
        try {
            await this.firebase.remove(this.firebase.ref(DB_PATHS.SESSION));
        } catch (error) {
            console.error('Erro ao limpar sessão:', error);
        }
        localStorage.removeItem('nexus_session_fallback');
    }
}

// Exportar instância singleton
export const firebaseService = new FirebaseService();