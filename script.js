// ========== إدارة البيانات ==========
class AppData {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.habits = JSON.parse(localStorage.getItem('habits')) || [];
        this.currentFilter = 'all';
        this.timerMinutes = 45;
        this.timerSeconds = 45 * 60;
        this.timerInterval = null;
        this.isTimerRunning = false;
        this.currentDate = new Date();
        this.selectedHabitColor = '#FF6B6B';
        this.points = parseInt(localStorage.getItem('userPoints')) || 0;
        this.level = parseInt(localStorage.getItem('userLevel')) || 1;
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.syncWithCalendar();
    }

    saveHabits() {
        localStorage.setItem('habits', JSON.stringify(this.habits));
    }

    savePoints() {
        localStorage.setItem('userPoints', this.points);
        this.updateLevel();
    }

    updateLevel() {
        const newLevel = Math.floor(this.points / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            localStorage.setItem('userLevel', this.level);
            this.playSound('levelUp');
            this.showToast(`🎉 تهانينا! وصلت إلى المستوى ${this.level}! 🎉`);
        }
        localStorage.setItem('userLevel', this.level);
    }

    addPoints(amount, reason) {
        this.points += amount;
        this.savePoints();
        this.playSound('point');
        this.showToast(`+${amount} نقطة ${reason ? 'لـ ' + reason : ''}! ✨`);
        this.updateLevelUI();
    }

    updateLevelUI() {
        const nextLevelPoints = this.level * 500;
        const currentLevelPoints = (this.level - 1) * 500;
        const progress = ((this.points - currentLevelPoints) / 500) * 100;
        
        const levelDisplay = document.getElementById('levelDisplay');
        const pointsDisplay = document.getElementById('pointsDisplay');
        const progressBar = document.getElementById('levelProgress');
        
        if (levelDisplay) levelDisplay.textContent = this.level;
        if (pointsDisplay) pointsDisplay.textContent = this.points;
        if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
    }

    getTodayTasks() {
        const today = new Date().toISOString().split('T')[0];
        return this.tasks.filter(t => t.date === today);
    }

    getFilteredTasks() {
        if (this.currentFilter === 'completed') return this.tasks.filter(t => t.completed);
        if (this.currentFilter === 'pending') return this.tasks.filter(t => !t.completed);
        return this.tasks;
    }

    getStreak() {
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const hasCompletedHabit = this.habits.some(h => 
                h.dates && h.dates.includes(dateStr)
            );
            if (hasCompletedHabit || this.tasks.some(t => t.completed && t.date === dateStr)) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // مزامنة مع تقويم الهاتف
    async syncWithCalendar() {
        if ('Calendar' in window && navigator.onLine) {
            try {
                const calendarEvents = [];
                this.tasks.forEach(task => {
                    if (task.date && !task.completed) {
                        calendarEvents.push({
                            title: task.title,
                            date: task.date,
                            description: task.description || 'مهمة من TaskFlow'
                        });
                    }
                });
                localStorage.setItem('calendarSync', JSON.stringify(calendarEvents));
            } catch(e) {
                console.log('مزامنة التقويم غير متاحة');
            }
        }
    }

    // تصدير المهام إلى تقويم الهاتف
    exportToPhoneCalendar() {
        if (!navigator.onLine) {
            this.showToast('⚠️ يرجى الاتصال بالإنترنت لمزامنة التقويم');
            return;
        }

        const events = [];
        this.tasks.forEach(task => {
            if (task.date && !task.completed) {
                events.push({
                    title: task.title,
                    startDate: task.date,
                    description: task.description || 'مهمة من TaskFlow'
                });
            }
        });

        // إنشاء ملف ICS للتقويم
        let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TaskFlow//AR//
CALSCALE:GREGORIAN\n`;

        events.forEach(event => {
            const date = new Date(event.startDate);
            const dateStr = date.toISOString().replace(/[-:]/g, '').split('.')[0];
            icsContent += `BEGIN:VEVENT
UID:${Date.now()}-${Math.random()}@taskflow
DTSTAMP:${dateStr}
DTSTART:${dateStr}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
END:VEVENT\n`;
        });

        icsContent += `END:VCALENDAR`;

        // تحميل ملف ICS
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'taskflow_calendar.ics';
        link.click();
        URL.revokeObjectURL(link.href);
        
        this.showToast('📅 تم تصدير المهام إلى ملف التقويم');
        this.playSound('success');
    }
}

const app = new AppData();

// ========== نظام الأصوات ==========
const sounds = {
    complete: new Audio('data:audio/wav;base64,U3RlYWx0aCBzb3VuZA=='),
    point: new Audio('data:audio/wav;base64,U3RlYWx0aCBzb3VuZA=='),
    levelUp: new Audio('data:audio/wav;base64,U3RlYWx0aCBzb3VuZA=='),
    timerEnd: new Audio('data:audio/wav;base64,U3RlYWx0aCBzb3VuZA=='),
    success: new Audio('data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==')
};

// إنشاء أصوات باستخدام Web Audio API (بديل يعمل على جميع المتصفحات)
function createBeep(frequency, duration, type = 'sine') {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function playSoundEffect(type) {
    try {
        switch(type) {
            case 'complete':
                createBeep(880, 0.2);
                setTimeout(() => createBeep(440, 0.2), 200);
                break;
            case 'point':
                createBeep(660, 0.15);
                break;
            case 'levelUp':
                createBeep(523.25, 0.2);
                setTimeout(() => createBeep(659.25, 0.2), 200);
                setTimeout(() => createBeep(783.99, 0.4), 400);
                break;
            case 'timerEnd':
                createBeep(440, 0.5);
                setTimeout(() => createBeep(440, 0.5), 600);
                setTimeout(() => createBeep(440, 1), 1200);
                break;
            case 'success':
                createBeep(523.25, 0.2);
                setTimeout(() => createBeep(659.25, 0.2), 150);
                break;
            case 'delete':
                createBeep(220, 0.1);
                break;
        }
    } catch(e) {
        console.log('تشغيل الصوت غير متاح');
    }
}

app.playSound = playSoundEffect;

// ========== الكشف عن حالة الاتصال ==========
let isOnline = navigator.onLine;

function updateOnlineStatus() {
    isOnline = navigator.onLine;
    const statusElement = document.getElementById('onlineStatus');
    if (statusElement) {
        if (isOnline) {
            statusElement.innerHTML = '🟢 متصل';
            statusElement.style.background = 'rgba(0,184,148,0.8)';
            app.showToast('✅ تم استعادة الاتصال بالإنترنت');
        } else {
            statusElement.innerHTML = '🔴 غير متصل (وضع غير متصل)';
            statusElement.style.background = 'rgba(255,107,107,0.8)';
            app.showToast('⚠️ وضع غير متصل - البيانات تحفظ محلياً');
        }
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// حفظ البيانات محلياً عند عدم الاتصال
function saveOfflineData() {
    const offlineData = {
        tasks: app.tasks,
        habits: app.habits,
        points: app.points,
        level: app.level,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('offlineBackup', JSON.stringify(offlineData));
}

// استعادة البيانات عند الاتصال
async function syncOfflineData() {
    if (navigator.onLine) {
        const offlineBackup = localStorage.getItem('offlineBackup');
        if (offlineBackup) {
            const backup = JSON.parse(offlineBackup);
            if (backup.tasks.length > app.tasks.length) {
                app.tasks = backup.tasks;
                app.saveTasks();
                app.showToast('🔄 تمت مزامنة البيانات من وضع عدم الاتصال');
            }
            localStorage.removeItem('offlineBackup');
        }
        app.syncWithCalendar();
    }
}

// ========== تحميل بيانات المستخدم ==========
function loadUserProfile() {
    const userProfile = localStorage.getItem('userProfile');
    const profileImage = localStorage.getItem('userProfileImage');
    
    if (userProfile) {
        try {
            const profile = JSON.parse(userProfile);
            const greetingElement = document.getElementById('greetingTitle');
            if (greetingElement && profile.name) {
                greetingElement.innerHTML = `مرحباً ${profile.name}! 👋`;
            }
            
            const avatarImg = document.getElementById('userAvatar');
            if (avatarImg) {
                if (profileImage && profileImage !== 'null' && profileImage !== '') {
                    avatarImg.src = profileImage;
                } else if (profile.profileImage && profile.profileImage !== 'null') {
                    avatarImg.src = profile.profileImage;
                }
            }
        } catch(e) {
            console.error('خطأ في تحليل بيانات المستخدم', e);
        }
    }
}

// ========== تسجيل الخروج ==========
function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        playSoundEffect('delete');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('userProfileImage');
        window.location.href = "onboarding.html";
    }
}

// ========== التنقل ==========
function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    const tabMap = {
        'home': { nav: 0, page: 'home-page' },
        'tasks': { nav: 1, page: 'tasks-page' },
        'timer': { nav: 2, page: 'timer-page' },
        'habits': { nav: 3, page: 'habits-page' },
        'calendar': { nav: 4, page: 'calendar-page' }
    };
    
    const tab = tabMap[tabName];
    document.querySelectorAll('.nav-item')[tab.nav].classList.add('active');
    document.getElementById(tab.page).classList.add('active');
    
    if (tabName === 'calendar') renderCalendar();
    if (tabName === 'home') updateHomePage();
}

document.querySelectorAll('.nav-item').forEach((item, index) => {
    item.addEventListener('click', () => {
        const tabNames = ['home', 'tasks', 'timer', 'habits', 'calendar'];
        switchTab(tabNames[index]);
    });
});

// ========== الصفحة الرئيسية ==========
function updateHomePage() {
    loadUserProfile();
    app.updateLevelUI();
    updateOnlineStatus();
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateDisplay').textContent = 
        new Date().toLocaleDateString('ar-SA', options);
    
    document.getElementById('totalTasks').textContent = app.tasks.length;
    document.getElementById('doneTasks').textContent = app.tasks.filter(t => t.completed).length;
    document.getElementById('streakDays').textContent = app.getStreak();
    
    const todayTasks = app.getTodayTasks();
    const preview = document.getElementById('todayTasksPreview');
    if (todayTasks.length === 0) {
        preview.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">لا توجد مهام لليوم 🎉</p>';
    } else {
        preview.innerHTML = todayTasks.slice(0, 3).map(task => `
            <div class="task-item">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="toggleTask(${task.id})"></div>
                <div class="task-content">
                    <div class="task-title" style="${task.completed ? 'text-decoration:line-through;opacity:0.5' : ''}">${task.title}</div>
                </div>
                <span class="priority-dot priority-${task.priority}"></span>
            </div>
        `).join('');
    }
    
    const habitsPreview = document.getElementById('habitsPreview');
    if (app.habits.length === 0) {
        habitsPreview.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">أضف عادات جديدة للتتبع ✨</p>';
    } else {
        habitsPreview.innerHTML = app.habits.slice(0, 3).map(habit => {
            const today = new Date().toISOString().split('T')[0];
            const isDone = habit.dates && habit.dates.includes(today);
            return `
                <div class="habit-card" style="background: ${habit.color || '#6C5CE7'}">
                    <div class="habit-icon">${habit.icon || '⭐'}</div>
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-streak">${habit.streak || 0} يوم متتالي</div>
                    </div>
                    <button class="habit-check ${isDone ? 'done' : ''}" onclick="toggleHabit(${habit.id})">
                        ${isDone ? '✓' : ''}
                    </button>
                </div>
            `;
        }).join('');
    }
    
    saveOfflineData();
}

// ========== المهام ==========
function addTaskFromModal() {
    const title = document.getElementById('taskTitleInput').value.trim();
    if (!title) return;
    
    const task = {
        id: Date.now(),
        title: title,
        description: document.getElementById('taskDescInput').value,
        date: document.getElementById('taskDateInput').value || new Date().toISOString().split('T')[0],
        priority: document.getElementById('taskPriorityInput').value,
        completed: false,
        created: new Date().toISOString()
    };
    
    app.tasks.unshift(task);
    app.saveTasks();
    closeTaskModal();
    renderTasks();
    updateHomePage();
    app.addPoints(10, 'إضافة مهمة جديدة');
    playSoundEffect('success');
}

function openTaskModal() {
    document.getElementById('taskModal').classList.add('show');
    document.getElementById('taskTitleInput').focus();
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
    document.getElementById('taskTitleInput').value = '';
    document.getElementById('taskDescInput').value = '';
}

function toggleTask(id) {
    const task = app.tasks.find(t => t.id === id);
    if (task) {
        const wasCompleted = task.completed;
        task.completed = !task.completed;
        app.saveTasks();
        
        if (!wasCompleted && task.completed) {
            app.addPoints(15, 'إكمال مهمة');
            playSoundEffect('complete');
        }
        
        renderTasks();
        updateHomePage();
    }
}

function deleteTask(id) {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
        app.tasks = app.tasks.filter(t => t.id !== id);
        app.saveTasks();
        renderTasks();
        updateHomePage();
        playSoundEffect('delete');
        showToast('🗑️ تم حذف المهمة');
    }
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    const tasks = app.getFilteredTasks();
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999;">
                <div style="font-size:48px; margin-bottom:16px;">📝</div>
                <p>لا توجد مهام</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-item" style="${task.completed ? 'opacity:0.6' : ''}">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                 onclick="toggleTask(${task.id})"></div>
            <div class="task-content" onclick="deleteTask(${task.id})">
                <div class="task-title" style="${task.completed ? 'text-decoration:line-through' : ''}">${task.title}</div>
                <div class="task-meta">
                    <span>${task.date}</span>
                    <span class="priority-dot priority-${task.priority}" style="margin-right:8px"></span>
                </div>
            </div>
        </div>
    `).join('');
}

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        app.currentFilter = chip.dataset.filter;
        renderTasks();
    });
});

// ========== العادات ==========
function openHabitModal() {
    document.getElementById('habitModal').classList.add('show');
    document.getElementById('habitNameInput').focus();
}

function closeHabitModal() {
    document.getElementById('habitModal').classList.remove('show');
    document.getElementById('habitNameInput').value = '';
}

function addHabitFromModal() {
    const name = document.getElementById('habitNameInput').value.trim();
    if (!name) return;
    
    const habit = {
        id: Date.now(),
        name: name,
        frequency: document.getElementById('habitFreqInput').value,
        color: app.selectedHabitColor,
        icon: '⭐',
        streak: 0,
        dates: []
    };
    
    app.habits.push(habit);
    app.saveHabits();
    closeHabitModal();
    renderHabits();
    updateHomePage();
    app.addPoints(20, 'إضافة عادة جديدة');
    playSoundEffect('success');
}

function toggleHabit(id) {
    const habit = app.habits.find(h => h.id === id);
    if (!habit) return;
    
    const today = new Date().toISOString().split('T')[0];
    if (!habit.dates) habit.dates = [];
    
    if (habit.dates.includes(today)) {
        habit.dates = habit.dates.filter(d => d !== today);
        habit.streak = Math.max(0, (habit.streak || 0) - 1);
        playSoundEffect('delete');
    } else {
        habit.dates.push(today);
        habit.streak = (habit.streak || 0) + 1;
        app.addPoints(25, 'إنجاز عادة يومية');
        playSoundEffect('complete');
        
        // مكافأة خاصة للسلسلة
        if (habit.streak % 7 === 0 && habit.streak > 0) {
            app.addPoints(100, `🔥 ${habit.streak} يوم متتالي في عادة ${habit.name}`);
            playSoundEffect('levelUp');
        }
    }
    
    app.saveHabits();
    renderHabits();
    updateHomePage();
}

function deleteHabit(id) {
    if (confirm('هل تريد حذف هذه العادة؟')) {
        app.habits = app.habits.filter(h => h.id !== id);
        app.saveHabits();
        renderHabits();
        updateHomePage();
        playSoundEffect('delete');
    }
}

function renderHabits() {
    const grid = document.getElementById('habitsGrid');
    if (app.habits.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999;">
                <div style="font-size:48px; margin-bottom:16px;">🔄</div>
                <p>أضف عادتك الأولى</p>
            </div>
        `;
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    grid.innerHTML = app.habits.map(habit => {
        const isDone = habit.dates && habit.dates.includes(today);
        return `
            <div class="habit-card" style="background: ${habit.color || '#6C5CE7'}">
                <div class="habit-icon">${habit.icon || '⭐'}</div>
                <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-streak">🔥 ${habit.streak || 0} يوم</div>
                </div>
                <button class="habit-check ${isDone ? 'done' : ''}" onclick="toggleHabit(${habit.id})">
                    ${isDone ? '✓' : ''}
                </button>
                <button onclick="deleteHabit(${habit.id})" style="position:absolute;top:8px;left:8px;background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:16px;">✕</button>
            </div>
        `;
    }).join('');
}

document.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        app.selectedHabitColor = btn.dataset.color;
    });
});

// ========== المؤقت ==========
function setPresetTimer(minutes) {
    app.timerMinutes = minutes;
    app.timerSeconds = minutes * 60;
    updateTimerDisplay();
    
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    if (app.isTimerRunning) {
        pauseTimer();
    }
}

function toggleTimer() {
    if (app.isTimerRunning) {
        pauseTimer();
    } else {
        const customInput = document.getElementById('customMinutes');
        if (customInput.value && customInput.value > 0) {
            app.timerMinutes = parseInt(customInput.value);
            app.timerSeconds = app.timerMinutes * 60;
        }
        startTimer();
    }
}

function startTimer() {
    app.isTimerRunning = true;
    document.getElementById('timerStartBtn').innerHTML = '<span>⏸ إيقاف</span>';
    
    app.timerInterval = setInterval(() => {
        if (app.timerSeconds > 0) {
            app.timerSeconds--;
            updateTimerDisplay();
        } else {
            clearInterval(app.timerInterval);
            app.isTimerRunning = false;
            document.getElementById('timerStartBtn').innerHTML = '<span>▶ بدء المؤقت</span>';
            
            playSoundEffect('timerEnd');
            app.addPoints(50, 'إكمال جلسة تركيز');
            
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('TaskFlow', { body: 'انتهى وقت التركيز! +50 نقطة 🎉' });
            }
            showToast('انتهى الوقت! +50 نقطة 🎉');
            vibrate();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(app.timerInterval);
    app.isTimerRunning = false;
    document.getElementById('timerStartBtn').innerHTML = '<span>▶ استئناف</span>';
}

function updateTimerDisplay() {
    const minutes = Math.floor(app.timerSeconds / 60);
    const seconds = app.timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const totalSeconds = app.timerMinutes * 60;
    const progress = ((totalSeconds - app.timerSeconds) / totalSeconds) * 565.48;
    document.getElementById('timerProgress').style.strokeDashoffset = progress;
}

// ========== الرزنامة ==========
function navigateMonth(direction) {
    app.currentDate.setMonth(app.currentDate.getMonth() + direction);
    renderCalendar();
}

function renderCalendar() {
    const year = app.currentDate.getFullYear();
    const month = app.currentDate.getMonth();
    
    const monthNames = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    document.getElementById('monthDisplay').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    let daysHTML = '';
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        daysHTML += `<div class="calendar-day other-month">${prevMonthDays - i}</div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = today.getDate() === day && 
                       today.getMonth() === month && 
                       today.getFullYear() === year;
        
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const hasTask = app.tasks.some(t => t.date === dateStr && !t.completed);
        
        daysHTML += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasTask ? 'has-task' : ''}" 
                     style="${hasTask ? 'border:2px solid #6C5CE7;' : ''}">${day}</div>`;
    }
    
    document.getElementById('calendarDays').innerHTML = daysHTML;
}

// ========== وظائف مساعدة ==========
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 9999;
        font-family: 'Cairo', sans-serif;
        animation: slideDown 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function vibrate() {
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
    }
}

// ========== إغلاق النوافذ المنبثقة ==========
document.getElementById('taskModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTaskModal();
});

document.getElementById('habitModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeHabitModal();
});

document.getElementById('avatarBtn')?.addEventListener('click', logout);

// ========== شاشة التحميل والمزامنة ==========
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.classList.add('hidden');
    }, 2000);
    syncOfflineData();
});

// ========== طلب إذن الإشعارات ==========
if ('Notification' in window) {
    Notification.requestPermission();
}

// ========== التهيئة ==========
updateHomePage();
renderTasks();
renderHabits();
renderCalendar();
updateTimerDisplay();
app.updateLevelUI();

// إضافة أزرار وحدة التحكم بالنقاط والمستويات والتصدير إلى التقويم
function addExtraControls() {
    const homePage = document.getElementById('home-page');
    const statsContainer = document.querySelector('.quick-stats');
    
    if (statsContainer && !document.getElementById('levelCard')) {
        const levelCard = document.createElement('div');
        levelCard.className = 'stat-card glass';
        levelCard.id = 'levelCard';
        levelCard.style.cursor = 'pointer';
        levelCard.onclick = () => app.exportToPhoneCalendar();
        levelCard.innerHTML = `
            <div class="stat-icon" style="background: linear-gradient(135deg, #FFD93D, #FFB830)">
                <span>🏆</span>
            </div>
            <div class="stat-info">
                <span class="stat-value" id="pointsDisplay">${app.points}</span>
                <span class="stat-label">نقطة</span>
            </div>
        `;
        
        const exportCard = document.createElement('div');
        exportCard.className = 'stat-card glass';
        exportCard.id = 'exportCard';
        exportCard.style.cursor = 'pointer';
        exportCard.onclick = () => app.exportToPhoneCalendar();
        exportCard.innerHTML = `
            <div class="stat-icon" style="background: linear-gradient(135deg, #4ECDC4, #44B5AD)">
                <span>📅</span>
            </div>
            <div class="stat-info">
                <span class="stat-value">تصدير</span>
                <span class="stat-label">تقويم</span>
            </div>
        `;
        
        statsContainer.appendChild(levelCard);
        statsContainer.appendChild(exportCard);
    }
    
    // إضافة شريط حالة الاتصال
    if (!document.getElementById('onlineStatus')) {
        const statusBar = document.createElement('div');
        statusBar.id = 'onlineStatus';
        statusBar.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 11px;
            z-index: 1000;
            font-family: monospace;
        `;
        document.body.appendChild(statusBar);
        updateOnlineStatus();
    }
    
    // إضافة شريط تقدم المستوى
    const levelProgressContainer = document.createElement('div');
    levelProgressContainer.style.cssText = `
        background: rgba(255,255,255,0.2);
        border-radius: 20px;
        padding: 3px;
        margin: 10px 0;
        position: relative;
    `;
    levelProgressContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: white;">
            <span>🏆 المستوى ${app.level}</span>
            <span>${app.points}/${app.level * 500} نقطة</span>
        </div>
        <div style="background: rgba(0,0,0,0.3); border-radius: 20px; overflow: hidden;">
            <div id="levelProgress" style="width: ${((app.points - ((app.level-1)*500)) / 500 * 100)}%; height: 8px; background: linear-gradient(90deg, #FFD93D, #FFB830); transition: width 0.3s;"></div>
        </div>
    `;
    
    const statsContainer2 = document.querySelector('.quick-stats');
    if (statsContainer2 && !document.getElementById('levelProgress')) {
        statsContainer2.parentNode.insertBefore(levelProgressContainer, statsContainer2.nextSibling);
    }
}

setTimeout(addExtraControls, 100);