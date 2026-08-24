const game = new Chess();
let board = null;
let socket = null;

// Estados Locales
let currentModo = "solo"; 
let monedas = parseInt(localStorage.getItem("monedas")) || 1000;
let elo = parseInt(localStorage.getItem("elo")) || 1200;

// Relojes
let tiempoBlancas = 300; 
let tiempoNegras = 300;
let temporizadorIntervalo = null;

// Variables de Grabación de Voz
let mediaRecorder = null;
let fragmentosAudio = [];
let grabandoVoz = false;

// SINTETIZADOR NATIVO DE EFECTOS DE SONIDO (Sin necesidad de archivos .mp3)
function reproducirSonido(tipo) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscilador = audioCtx.createOscillator();
  const nodoGanancia = audioCtx.createGain();
  
  oscilador.connect(nodoGanancia);
  nodoGanancia.connect(audioCtx.destination);

  if (tipo === 'move') {
    oscilador.type = 'triangle';
    oscilador.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscilador.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.08);
    nodoGanancia.gain.setValueAtTime(0.15, audioCtx.currentTime);
    nodoGanancia.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.08);
    oscilador.start();
    oscilador.stop(audioCtx.currentTime + 0.08);
  } else if (tipo === 'capture') {
    oscilador.type = 'sawtooth';
    oscilador.frequency.setValueAtTime(180, audioCtx.currentTime);
    oscilador.frequency.setValueAtTime(90, audioCtx.currentTime + 0.04);
    nodoGanancia.gain.setValueAtTime(0.2, audioCtx.currentTime);
    nodoGanancia.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
    oscilador.start();
    oscilador.stop(audioCtx.currentTime + 0.12);
  }
}

document.addEventListener("DOMContentLoaded", () => {
      // ==========================================
  // LÓGICA DE CONTROL: LOGIN Y REGISTRO (AUTH)
  // ==========================================
  const authContainer = document.getElementById("auth-container");
  const mainApp = document.getElementById("main-app");
  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");
  const nicknameGroup = document.getElementById("nickname-group");
  const authSubmitBtn = document.getElementById("auth-submit-btn");
  const authSwitchLink = document.getElementById("auth-switch-link");
  const authToggleText = document.getElementById("auth-toggle-text");
  const authForm = document.getElementById("auth-form");

  let esModoRegistro = false; // Estado inicial en Login

  // Alternar entre los modos de Iniciar Sesión y Registrarse
  authSwitchLink.addEventListener("click", () => {
    esModoRegistro = !esModoRegistro;

    if (esModoRegistro) {
      authTitle.innerText = "Crear Cuenta";
      authSubtitle.innerText = "Únete a la arena de ajedrez más competitiva";
      nicknameGroup.classList.remove("hidden");
      document.getElementById("auth-nickname").required = true;
      authSubmitBtn.innerText = "Registrarse y Entrar";
      authToggleText.innerHTML = `¿Ya tienes una cuenta? <span id="auth-switch-link">Inicia sesión aquí</span>`;
    } else {
      authTitle.innerText = "Iniciar Sesión";
      authSubtitle.innerText = "Ingresa a tu cuenta de ChessArena";
      nicknameGroup.classList.add("hidden");
      document.getElementById("auth-nickname").required = false;
      authSubmitBtn.innerText = "Entrar a la Arena";
      authToggleText.innerHTML = `¿No tienes una cuenta? <span id="auth-switch-link">Regístrate aquí</span>`;
    }

    // Como reescribimos el HTML interno del texto, debemos volver a vincular el evento del clic al enlace
    reincendiarEnlaceSwitch();
  });

  function reincendiarEnlaceSwitch() {
    document.getElementById("auth-switch-link").addEventListener("click", () => {
      authSwitchLink.click();
    });
  }

    // Evento al enviar el formulario (Conexión Real con Base de Datos)
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const nickname = document.getElementById("auth-nickname").value.trim();

    // Definir a qué URL le vamos a pegar según el modo
    const url = esModoRegistro ? '/api/registro' : '/api/login';
    const datosEnvio = esModoRegistro ? { email, password, nickname } : { email, password };

    try {
      // Realizar la petición HTTP POST al servidor
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnvio)
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        // Si el servidor devuelve un error (ej: correo ya registrado), se lo mostramos al usuario
        alert(resultado.error);
        return;
      }

      // SINCRONIZACIÓN DE DATOS REALES DE LA BASE DE DATOS
      monedas = resultado.usuario.monedas;
      elo = resultado.usuario.elo;
      
      // Actualizar los textos de la barra superior con los datos de la cuenta
      balanceMonedasEl.innerText = monedas;
      balanceEloEl.innerText = elo;

      // Guardar el nombre del jugador para las interacciones
      localStorage.setItem("nickname_actual", resultado.usuario.nickname);

      // Desbloquear la aplicación y dar paso al juego de ajedrez
      authContainer.classList.add("hidden");
      mainApp.classList.add("auth-success");

      alert(`¡Bienvenido ${resultado.usuario.nickname}! Tu cuenta ha sido validada.`);

    } catch (error) {
      console.error(error);
      alert("Hubo un error de conexión con el servidor de cuentas.");
    }
  });


    // PROTOTIPO LOCAL: Ocultamos el bloqueo y damos paso al juego
    // (En el siguiente paso conectaremos esto al servidor real para validar las cuentas)
    authContainer.classList.add("hidden"); // Oculta la tarjeta
    mainApp.classList.add("auth-success"); // Remueve el difuminado y activa clics en el ajedrez

    alert(`¡Bienvenido a ChessArena! Has ingresado con el correo: ${email}`);
  });

  const balanceMonedasEl = document.getElementById("balance-monedas");
  const balanceEloEl = document.getElementById("balance-elo");
  const openStoreBtn = document.getElementById("open-store-btn");
  const closeStoreBtn = document.getElementById("close-store-btn");
  const modesSection = document.getElementById("modes-section");
  const storeSection = document.getElementById("store-section");
  
  const privateRoomPanel = document.getElementById("private-room-panel");
  const roomCodeInput = document.getElementById("room-code-input");
  const connectRoomBtn = document.getElementById("connect-room-btn");
  const roomStatusText = document.getElementById("room-status-text");

  const chatGiftPanel = document.getElementById("chat-gift-panel");
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const sendChatBtn = document.getElementById("send-chat-btn");
  const sendGiftBtn = document.getElementById("send-gift-btn");
  const voiceBtn = document.getElementById("voice-btn");

  // Renderizar valores iniciales
  balanceMonedasEl.innerText = monedas;
  balanceEloEl.innerText = elo;

  // TIENDA
  openStoreBtn.addEventListener("click", () => { storeSection.classList.remove("hidden"); modesSection.classList.add("hidden"); });
  closeStoreBtn.addEventListener("click", () => { storeSection.classList.add("hidden"); modesSection.classList.remove("hidden"); });

  document.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const costo = parseInt(e.target.dataset.cost);
      const item = e.target.dataset.item;
      if (monedas >= costo) {
        monedas -= costo;
        localStorage.setItem("monedas", monedas);
        balanceMonedasEl.innerText = monedas;
        document.getElementById("myBoard").classList.remove("tablero-madera", "tablero-neon");
        document.getElementById("myBoard").classList.add(item);
        e.target.innerText = "Equipado";
        e.target.disabled = true;
        alert("¡Tablero equipado!");
      } else { alert("Monedas insuficientes."); }
    });
  });

  // RELOJES
  function formatearTiempo(segundos) {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const seg = String(segundos % 60).padStart(2, '0');
    return `${min}:${seg}`;
  }

  function iniciarReloj() {
    clearInterval(temporizadorIntervalo);
    temporizadorIntervalo = setInterval(() => {
      if (game.game_over()) { clearInterval(temporizadorIntervalo); return; }
      if (game.turn() === 'w') {
        tiempoBlancas--;
        document.getElementById("timer-white").innerText = `Blancas: ${formatearTiempo(tiempoBlancas)}`;
        if (tiempoBlancas <= 0) procesarFinPartida('Negras');
      } else {
        tiempoNegras--;
        document.getElementById("timer-black").innerText = `Negras: ${formatearTiempo(tiempoNegras)}`;
        if (tiempoNegras <= 0) procesarFinPartida('Blancas');
      }
    }, 1000);
  }

  // SISTEMA DE RECOMPENSAS Y CÁLCULO ELO
  function procesarFinPartida(ganador) {
    clearInterval(temporizadorIntervalo);
    if (ganador === "Blancas") {
      elo += 16;
      monedas += 150;
      alert("¡Victoria! Has ganado +16 de ELO y +150 Monedas.");
    } else {
      elo = Math.max(0, elo - 12);
      alert("Derrota. Has perdido -12 de ELO.");
    }
    localStorage.setItem("elo", elo);
    localStorage.setItem("monedas", monedas);
    balanceEloEl.innerText = elo;
    balanceMonedasEl.innerText = monedas;
  }

  // MOVIMIENTOS EN EL TABLERO
  function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) return false;
  }

  function onDrop(source, target) {
    // Detectar si el movimiento es una captura antes de realizarlo lógicamente
    const esCaptura = game.get(target) !== null || (game.get(source) && game.get(source).type === 'p' && source[0] !== target[0] && game.get(target) === null);

    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';

    // Disparar sonido correspondiente localmente
    reproducirSonido(esCaptura ? 'capture' : 'move');

    if (currentModo === "multi" && socket) {
      socket.emit("mover_pieza", { from: source, to: target, captura: esCaptura });
    }
    if (currentModo === "solo") iniciarReloj();
    actualizarEstado();
  }

  function onSnapEnd() { board.position(game.fen()); }

  function actualizarEstado() {
    let turno = game.turn() === 'w' ? 'Blancas' : 'Negras';
    let estadoText = `Turno de las ${turno}`;
    if (game.in_checkmate()) {
      estadoText = `¡Jaque Mate!`;
      procesarFinPartida(game.turn() === 'w' ? 'Negras' : 'Blancas');
    }
    document.getElementById('status').innerText = estadoText;
  }

  board = Chessboard('myBoard', {
    draggable: true, position: 'start', onDragStart: onDragStart, onDrop: onDrop, onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com{piece}.png'
  });

  // GESTIÓN DEL CHAT TEXTUAL
  function mostrarTextoEnChat(remitente, texto, estiloExtra = "") {
    const div = document.createElement("p");
    div.innerHTML = `<b style="${estiloExtra}">${remitente}:</b> ${texto}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // MULTIJUGADOR ONLINE Y ENLACE DE SOCKETS
  document.getElementById("mode-multi-btn").addEventListener("click", () => {
    currentModo = "multi";
    clearInterval(temporizadorIntervalo);
    document.getElementById("mode-multi-btn").classList.add("active");
    document.getElementById("mode-solo-btn").classList.remove("active");
    privateRoomPanel.classList.remove("hidden");
    chatGiftPanel.classList.remove("hidden");
    
    if (!socket) {
      socket = io();
      // Reemplaza esta URL por la que te otorgue Render en el Paso 3
       const URL_SERVIDOR = "https://onrender.com"; 
      socket = io(URL_SERVIDOR);

      socket.on("pieza_movida_rival", (movimiento) => {
        game.move({ from: movimiento.from, to: movimiento.to, promotion: 'q' });
        board.position(game.fen());
        reproducirSonido(movimiento.captura ? 'capture' : 'move');
        actualizarEstado();
      });

      socket.on("sala_conectada", (codigo) => {
        roomStatusText.innerText = `Conectado a la sala: ${codigo}`;
        roomStatusText.style.color = "#81b64c";
        mostrarTextoEnChat("Sistema", `Unido a la sala ${codigo}.`, "color: #81b64c;");
      });

      socket.on("recibir_mensaje_chat", (texto) => { mostrarTextoEnChat("Rival", texto, "color: #ffd700;"); });

      socket.on("recibir_regalo", (monto) => {
        monedas += monto;
        localStorage.setItem("monedas", monedas);
        balanceMonedasEl.innerText = monedas;
        mostrarTextoEnChat("Regalo", `🎁 ¡Recibiste ${monto} monedas de regalo!`, "color: #ffd700; font-weight: bold;");
      });

      // LÓGICA DE RECEPCIÓN DE AUDIO DE VOZ
      socket.on("recibir_nota_voz", (base64Audio) => {
        const divAudio = document.createElement("div");
        divAudio.innerHTML = `<b>Rival (Voz):</b><br><audio src="${base64Audio}" controls></audio>`;
        chatMessages.appendChild(divAudio);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      });
    }
  });

  connectRoomBtn.addEventListener("click", () => {
    const codigo = roomCodeInput.value.trim();
    if (codigo !== "" && socket) socket.emit("unirse_sala", codigo);
  });

  function enviarChat() {
    const texto = chatInput.value.trim();
    if (texto === "") return;
    mostrarTextoEnChat("Tú", texto, "color: #3390ec;");
    if (socket) socket.emit("enviar_mensaje_chat", texto);
    chatInput.value = "";
  }
  sendChatBtn.addEventListener("click", enviarChat);
  chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") enviarChat(); });

  sendGiftBtn.addEventListener("click", () => {
    if (monedas >= 100) {
      monedas -= 100;
      localStorage.setItem("monedas", monedas);
      balanceMonedasEl.innerText = monedas;
      mostrarTextoEnChat("Sistema", "🎁 Enviaste 100 monedas de regalo.", "color: #ffd700;");
      if (socket) socket.emit("enviar_regalo", 100);
    } else { alert("Monedas insuficientes."); }
  });

  // LÓGICA DEL CHAT DE VOZ POR AUDIO CODIFICADO
  voiceBtn.addEventListener("click", () => {
    if (!grabandoVoz) {
      // Comenzar a grabar
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        fragmentosAudio = [];
        
        mediaRecorder.ondataavailable = e => fragmentosAudio.push(e.data);
        
        mediaRecorder.onstop = () => {
          const blobAudio = new Blob(fragmentosAudio, { type: 'audio/ogg; codecs=opus' });
          const reader = new FileReader();
          reader.readAsDataURL(blobAudio); 
          reader.onloadend = () => {
            const base64String = reader.result;
            
            // CORRECCIÓN: Se añadieron las comillas invertidas (backticks) para interpretar el HTML correctamente
            const divAudio = document.createElement("div");
            divAudio.innerHTML = `<b>Tú (Voz):</b><br><audio src="${base64String}" controls></audio>`;
            
            chatMessages.appendChild(divAudio);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Transmitir nota de audio a la sala del servidor
            if (socket) socket.emit("enviar_nota_voz", base64String);
          };
        };

        mediaRecorder.start();
        grabandoVoz = true;
        voiceBtn.style.backgroundColor = "#2baf2b"; // Verde mientras graba
        document.getElementById("voice-icon").innerText = "stop";
      }).catch(err => alert("No se pudo acceder al micrófono."));
    } else {
      // Detener grabación
      if (mediaRecorder) mediaRecorder.stop();
      grabandoVoz = false;
      voiceBtn.style.backgroundColor = "#ea4335"; // Regresa a rojo
      document.getElementById("voice-icon").innerText = "mic";
    }
  });

  // CONTROL DEL MODO INDIVIDUAL
  document.getElementById("mode-solo-btn").addEventListener("click", () => {
    currentModo = "solo";
    document.getElementById("mode-solo-btn").classList.add("active");
    document.getElementById("mode-multi-btn").classList.remove("active");
    privateRoomPanel.classList.add("hidden");
    chatGiftPanel.classList.add("hidden");
    if (socket) { socket.disconnect(); socket = null; }
  });
