let currentMode = 'qr';
let intervalId = null;

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    
    if (mode === 'qr') {
        document.querySelector('button[onclick="setMode('qr')"]').classList.add('active');
        document.getElementById('pairingInput').classList.add('hidden');
    } else {
        document.querySelector('button[onclick="setMode('pairing')"]').classList.add('active');
        document.getElementById('pairingInput').classList.remove('hidden');
    }
}

async function startConnection() {
    const phoneNumber = document.getElementById('phoneNumber').value.replace(/\D/g, '');
    
    if (currentMode === 'pairing' && phoneNumber.length < 10) {
        alert('Por favor, digite um número de telefone válido (com DDI). Ex: 5511999999999');
        return;
    }

    const btn = document.getElementById('connectBtn');
    btn.disabled = true;
    btn.innerText = 'Iniciando...';

    try {
        const response = await fetch('/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                usePairingCode: currentMode === 'pairing',
                phoneNumber: phoneNumber
            })
        });

        const data = await response.json();
        log('Solicitação de conexão enviada: ' + data.message);

        document.getElementById('displayArea').classList.remove('hidden');
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('qrDisplay').classList.add('hidden');
        document.getElementById('codeDisplay').classList.add('hidden');

        // Start polling
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(pollStatus, 2000);

    } catch (err) {
        log('Erro ao iniciar: ' + err.message);
        btn.disabled = false;
        btn.innerText = 'Iniciar Conexão';
    }
}

async function pollStatus() {
    try {
        const res = await fetch('/status');
        const data = await res.json();
        
        updateStatusUI(data.status);
        
        if (data.status === 'connected') {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('qrDisplay').classList.add('hidden');
            document.getElementById('codeDisplay').classList.add('hidden');
            document.getElementById('connectBtn').innerText = 'Bot Conectado';
            clearInterval(intervalId);
            return;
        }

        if (data.qr && currentMode === 'qr') {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('qrDisplay').classList.remove('hidden');
            
            // Render QR only if changed (simple check)
            const qrContainer = document.getElementById('qrcode');
            if (qrContainer.getAttribute('data-last-qr') !== data.qr) {
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, {
                    text: data.qr,
                    width: 200,
                    height: 200
                });
                qrContainer.setAttribute('data-last-qr', data.qr);
                log('QR Code atualizado');
            }
        }

        if (data.pairingCode && currentMode === 'pairing') {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('codeDisplay').classList.remove('hidden');
            
            const codeEl = document.getElementById('pairingCodeText');
            // Format code: ABCD-EFGH
            const formatted = data.pairingCode.match(/.{1,4}/g).join('-');
            codeEl.innerText = formatted;
        }

    } catch (err) {
        console.error('Polling error', err);
    }
}

function updateStatusUI(status) {
    const el = document.getElementById('connectionStatus');
    const text = document.getElementById('statusText');
    const indicator = document.querySelector('.status-indicator');

    indicator.className = 'status-indicator'; // reset
    
    if (status === 'connected') {
        indicator.classList.add('connected');
        text.innerText = 'Conectado';
    } else if (status === 'connecting' || status === 'waiting_for_qr' || status === 'waiting_for_code') {
        indicator.classList.add('connecting');
        text.innerText = 'Conectando / Aguardando';
    } else {
        indicator.classList.add('disconnected');
        text.innerText = 'Desconectado';
    }
}

function log(msg) {
    const logs = document.getElementById('logs');
    const div = document.createElement('div');
    div.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    div.innerText = `[${time}] ${msg}`;
    logs.prepend(div);
}

// Initial check
pollStatus();
