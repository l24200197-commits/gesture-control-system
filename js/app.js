const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

const statusText = document.getElementById("status");
const commandText = document.getElementById("command");

let lastGestureTime = Date.now();
let suspended = false;
const SUSPEND_TIME = 5000;

/* ===========================
   RESALTAR GESTO EN PANEL
=========================== */
function highlightGesture(gesture) {
    const gesturesMap = {
        "Avanzar": "g-avanzar",
        "Detener": "g-detener",
        "Vuelta derecha": "g-vd",
        "Vuelta izquierda": "g-vi",
        "90° derecha": "g-90d",
        "90° izquierda": "g-90i",
        "360° derecha": "g-360d",
        "360° izquierda": "g-360i"
    };

    document.querySelectorAll(".list-group-item")
        .forEach(item => item.classList.remove("gesture-active"));

    if (gesture && gesturesMap[gesture]) {
        const element = document.getElementById(gesturesMap[gesture]);
        if (element) element.classList.add("gesture-active");
    }
}

/* ===========================
   INICIAR CÁMARA
=========================== */
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
    });
    videoElement.srcObject = stream;
}

/* ===========================
   DETECCIÓN DE GESTOS UNIFICADA
=========================== */

function detectGesture(landmarks, handLabel) {
    const fingerUp = (tip, pip) => landmarks[tip].y < landmarks[pip].y;

    // Estado de los dedos
    const thumbUp   = landmarks[4].y < landmarks[3].y;
    const thumbDown = landmarks[4].y > landmarks[3].y;
    const indexUp   = fingerUp(8, 6);
    const middleUp  = fingerUp(12, 10);
    const ringUp    = fingerUp(16, 14);
    const pinkyUp   = fingerUp(20, 18);

    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];

    // Condición: Todos los dedos extendidos (Palma)
    const allFingersUp = indexUp && middleUp && ringUp && pinkyUp && thumbUp;

    // --- 1. GESTOS 360 (Palma abierta con mano específica) ---
    if (allFingersUp) {
        if (handLabel === "Right") return "360° derecha";
        if (handLabel === "Left")  return "360° izquierda";
        return "Detener"; 
    }

    // --- 2. DETENER (Palma abierta genérica) ---
    if (indexUp && middleUp && ringUp && pinkyUp)
        return "Detener";

    // --- 3. AVANZAR (Pulgar abajo 👎) ---
    if (thumbDown && !indexUp && !middleUp && !ringUp && !pinkyUp)
        return "Avanzar";

    // --- 4. 90 GRADOS (Signo de paz ✌️ con dirección) ---
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
        const threshold90 = 0.1;
        // Si el dedo medio está a la derecha de la muñeca
        if (middleTip.x > wrist.x + threshold90) return "90° derecha";
        if (middleTip.x < wrist.x - threshold90) return "90° izquierda";
    }

    // --- 5. VUELTAS (Solo índice apuntando 👉 / 👈) ---
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
        const thresholdVuelta = 0.12; 
        if (indexTip.x > wrist.x + thresholdVuelta) return "Vuelta derecha";
        if (indexTip.x < wrist.x - thresholdVuelta) return "Vuelta izquierda";
    }

    return null;
}

/* ===========================
   INICIALIZAR MEDIAPIPE
=========================== */
async function initHands() {
    const hands = new Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.8,
        minTrackingConfidence: 0.8,
        selfieMode: true // La cámara actúa como espejo para que sea intuitivo
    });

    hands.onResults(results => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        // Dibujamos el frame de video (ya espejado por selfieMode)
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const handLabel = results.multiHandedness[0].label; // "Left" o "Right"

            // Dibujar el esqueleto verde sobre la mano
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 1 });

            const gesture = detectGesture(landmarks, handLabel);

            if (gesture) {
                lastGestureTime = Date.now();
                suspended = false;
                statusText.innerText = "Activo";
                commandText.innerText = gesture;
                highlightGesture(gesture);
            }
        }

        // Sistema de ahorro/suspensión
        if (Date.now() - lastGestureTime > SUSPEND_TIME) {
            suspended = true;
            statusText.innerText = "Modo suspendido";
            commandText.innerText = "Esperando gesto...";
            highlightGesture(null);
        }

        canvasCtx.restore();
    });

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });

    camera.start();
}

/* ===========================
   ARRANQUE DEL SISTEMA
=========================== */
(async () => {
    await startCamera();
    await initHands();
})();