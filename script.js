// =================================================================================
// I. DOM ELEMENTLERİ
// =================================================================================

const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const statusMessage = document.getElementById('status-message');
const currentTimeDisplay = document.getElementById('current-time-display');

const pomodoroBtn = document.getElementById('pomodoro-btn');
const breakBtn = document.getElementById('break-btn');

// YENİ DOM: Bugün Çalışılan Süre
const dailyFocusDisplay = document.getElementById('daily-focus-display'); 

// Ayarlar Modal DOM Elementleri
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeBtn = document.querySelector('.close-btn');
const settingsForm = document.getElementById('settings-form');
const pomodoroInput = document.getElementById('pomodoro-duration');
const breakInput = document.getElementById('break-duration');


// =================================================================================
// II. VERİ VE AYARLAR
// =================================================================================

let SETTINGS = {
    pomodoro: 25 * 60,
    break: 5 * 60
};

// YENİ: İstatistik Veri Yapısı
let STATS = {
    dailyFocusTime: 0, // Saniye cinsinden
    lastUpdatedDate: new Date().toLocaleDateString('tr-TR')
};

let currentMode = 'pomodoro';
let isRunning = false;
let timerInterval;
let timeLeft;

// =================================================================================
// III. YARDIMCI VE ZAMAN FONKSİYONLARI
// =================================================================================

function updateCurrentTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    currentTimeDisplay.textContent = time;
}

/**
 * Saniyeyi MM:SS formatına veya okunabilir istatistik formatına dönüştürür.
 */
function formatTime(totalSeconds, isDisplay = false) {
    const total = Math.abs(totalSeconds);

    if (isDisplay) {
        // Zamanlayıcı ekranı için MM:SS
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // İstatistikler için okunabilir format (Örn: 1s 32d 15sn)
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    let parts = [];
    if (hours > 0) parts.push(`${hours}s`);
    if (minutes > 0) parts.push(`${minutes}d`);
    if (seconds > 0 || total === 0) parts.push(`${seconds}sn`);
    return parts.join(' ') || '0sn';
}

function updateDisplay() {
    // Zamanlayıcı ekranı (MM:SS)
    timeDisplay.textContent = formatTime(timeLeft, true); 
}

/**
 * YENİ: İstatistik ekranını günceller.
 */
function updateStatsDisplay() {
    dailyFocusDisplay.textContent = formatTime(STATS.dailyFocusTime);
}

/**
 * YENİ: İstatistikleri LocalStorage'a kaydeder.
 */
function saveStats() {
    STATS.lastUpdatedDate = new Date().toLocaleDateString('tr-TR');
    localStorage.setItem('focusTimerStats', JSON.stringify(STATS));
}

/**
 * YENİ: İstatistikleri yükler ve günlük sıfırlama yapar.
 */
function loadStats() {
    const savedStats = localStorage.getItem('focusTimerStats');
    if (savedStats) {
        const loaded = JSON.parse(savedStats);

        const today = new Date().toLocaleDateString('tr-TR');
        if (loaded.lastUpdatedDate !== today) {
            // Günlük sıfırlama
            loaded.dailyFocusTime = 0;
            loaded.lastUpdatedDate = today;
        }
        STATS = loaded;
    }
    updateStatsDisplay();
}

function loadSettings() {
    const savedSettings = localStorage.getItem('focusTimerSettings');
    if (savedSettings) {
        SETTINGS = JSON.parse(savedSettings);
    }

    pomodoroInput.value = SETTINGS.pomodoro / 60;
    breakInput.value = SETTINGS.break / 60;

    timeLeft = SETTINGS.pomodoro;
    updateDisplay();
}

function saveSettings() {
    localStorage.setItem('focusTimerSettings', JSON.stringify(SETTINGS));
}

// =================================================================================
// IV. ZAMANLAYICI KONTROL FONKSİYONLARI (İstatistik Takibi Eklendi)
// =================================================================================

function startTimer() {
    if (isRunning) return;

    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;

    timerInterval = setInterval(() => {
        timeLeft--; 

        if (timeLeft < 0) {
            clearInterval(timerInterval);
            isRunning = false;
            handleTimerFinish();
            return;
        }
        updateDisplay();
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;

    // YENİ: Pomodoro modunda duraklatılırsa, çalışılan süreyi kaydet
    if (currentMode === 'pomodoro') {
        const timeWorked = SETTINGS.pomodoro - timeLeft;
        STATS.dailyFocusTime += timeWorked;
        saveStats();
        updateStatsDisplay();
    }

    isRunning = false;
    clearInterval(timerInterval);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

function resetTimer() {
    if (isRunning) {
        pauseTimer();
    }

    timeLeft = SETTINGS[currentMode];

    updateDisplay();
    startBtn.disabled = false;
    pauseBtn.disabled = true;

    const currentDuration = SETTINGS[currentMode] / 60;
    statusMessage.textContent = 
        currentMode === 'pomodoro' 
        ? `${currentDuration} dakikalık odaklanma hazır.` 
        : `${currentDuration} dakikalık mola hazır.`;
}

function setMode(mode) {
    if (isRunning) {
        pauseTimer(); 
    }

    currentMode = mode;

    document.querySelectorAll('.mode-selector button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${mode}-btn`).classList.add('active'); 

    resetTimer();
}

function handleTimerFinish() {
    new Audio('https://www.soundjay.com/buttons/beep-07.wav').play().catch(e => console.error("Alarm sesi çalınamadı.")); 

    // YENİ: Pomodoro bitince, tam süreyi kaydet
    if (currentMode === 'pomodoro') {
        STATS.dailyFocusTime += SETTINGS.pomodoro; // Tam pomodoro süresini ekle
        saveStats();
        updateStatsDisplay();

        statusMessage.textContent = 'Odak bitti! Şimdi mola zamanı.';
        setMode('break');
    } else {
        statusMessage.textContent = 'Mola bitti! Haydi tekrar odaklanmaya.';
        setMode('pomodoro');
    }
}


// =================================================================================
// V. AYARLAR MANTIĞI
// =================================================================================

function openSettings() {
    settingsModal.style.display = 'block';
}

function closeSettings() {
    settingsModal.style.display = 'none';
}

settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newPomodoro = parseInt(pomodoroInput.value) * 60;
    const newBreak = parseInt(breakInput.value) * 60;

    SETTINGS.pomodoro = newPomodoro;
    SETTINGS.break = newBreak;

    saveSettings();
    setMode(currentMode);
    closeSettings();
    alert('Ayarlar başarıyla kaydedildi!');
});


// =================================================================================
// VI. OLAY DİNLEYİCİLERİ VE BAŞLANGIÇ
// =================================================================================

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

pomodoroBtn.addEventListener('click', () => setMode('pomodoro'));
breakBtn.addEventListener('click', () => setMode('break'));

settingsBtn.addEventListener('click', openSettings);
closeBtn.addEventListener('click', closeSettings);

window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        closeSettings();
    }
});


// Uygulamayı başlat
setInterval(updateCurrentTime, 1000);
updateCurrentTime();
loadSettings(); 
loadStats(); // YENİ: İstatistikleri yükle
