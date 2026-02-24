const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

const statusText = document.getElementById("status");
const commandText = document.getElementById("command");

let lastGestureTime = Date.now();
let suspended = false;
const SUSPEND_TIME = 5000;

/* ===========================
   VARIABLES PARA DETECTAR DESPLAZAMIENTO
=========================== */
let previousX = null;

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

    if (gesturesMap[gesture]) {
        const element = document.getElementById(gesturesMap[gesture]);
        if (element) element.classList.add("gesture-active");
    }
}

/* ===========================
   INICIAR CÁMARA
=========================== */
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
}

/* ===========================
   DETECCIÓN DE GESTOS
=========================== */
function detectGesture(landmarks) {

    const fingerUp = (tip, pip) => landmarks[tip].y < landmarks[pip].y;

    const thumbUp  = landmarks[4].y < landmarks[3].y;
    const indexUp  = fingerUp(8, 6);
    const middleUp = fingerUp(12, 10);
    const ringUp   = fingerUp(16, 14);
    const pinkyUp  = fingerUp(20, 18);

    const wrist = landmarks[0];
    const indexTip = landmarks[8];

    // 👍 Avanzar
    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp)
        return "Avanzar";

    // ✋ Detener
    if (thumbUp && indexUp && middleUp && ringUp && pinkyUp)
        return "Detener";

    // 👉 Vuelta derecha
    if (indexUp && !middleUp && !ringUp && !pinkyUp &&
        indexTip.x > wrist.x + 0.15)
        return "Vuelta derecha";

    // 👈 Vuelta izquierda
    if (indexUp && !middleUp && !ringUp && !pinkyUp &&
        indexTip.x < wrist.x - 0.15)
        return "Vuelta izquierda";

    // ✌️ 90° derecha
    if (indexUp && middleUp && !ringUp && !pinkyUp &&
        indexTip.x > wrist.x)
        return "90° derecha";

    // ✌️ 90° izquierda
    if (indexUp && middleUp && !ringUp && !pinkyUp &&
        indexTip.x < wrist.x)
        return "90° izquierda";

    return null;
}

/* ===========================
   DETECTAR 360 POR DESPLAZAMIENTO
=========================== */
function detect360(landmarks) {

    const wrist = landmarks[0];

    if (previousX === null) {
        previousX = wrist.x;
        return null;
    }

    const deltaX = wrist.x - previousX;
    previousX = wrist.x;

    const fingerUp = (tip, pip) => landmarks[tip].y < landmarks[pip].y;

    const thumbUp  = landmarks[4].y < landmarks[3].y;
    const indexUp  = fingerUp(8, 6);
    const middleUp = fingerUp(12, 10);
    const ringUp   = fingerUp(16, 14);
    const pinkyUp  = fingerUp(20, 18);

    const openHand = thumbUp && indexUp && middleUp && ringUp && pinkyUp;

    if (openHand) {

        if (deltaX > 0.08)
            return "360° derecha";

        if (deltaX < -0.08)
            return "360° izquierda";
    }

    return null;
}

/* ===========================
   INICIALIZAR MEDIAPIPE
=========================== */
async function initHands() {

    const hands = new Hands({
        locateFile: file =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(results => {

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0,
            canvasElement.width, canvasElement.height);

        if (results.multiHandLandmarks.length > 0) {

            const landmarks = results.multiHandLandmarks[0];

            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
                { color: "#00FF00", lineWidth: 3 });

            drawLandmarks(canvasCtx, landmarks,
                { color: "#FF0000", lineWidth: 2 });

            let gesture = detectGesture(landmarks);

            if (!gesture) {
                gesture = detect360(landmarks);
            }

            if (gesture) {
                lastGestureTime = Date.now();
                suspended = false;
                statusText.innerText = "Activo";
                commandText.innerText = gesture;
                highlightGesture(gesture);
            }
        }

        if (Date.now() - lastGestureTime > SUSPEND_TIME) {
            suspended = true;
            statusText.innerText = "Modo suspendido";
            commandText.innerText = "Esperando gesto...";
            highlightGesture(null);
            previousX = null;
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

(async () => {
    await startCamera();
    await initHands();
})();