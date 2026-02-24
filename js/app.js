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
function detectGesture(landmarks, handLabel) {

    const fingerUp = (tip, pip) => landmarks[tip].y < landmarks[pip].y;

    const thumbUp   = landmarks[4].y < landmarks[3].y;
    const thumbDown = landmarks[4].y > landmarks[3].y;

    const indexUp  = fingerUp(8, 6);
    const middleUp = fingerUp(12, 10);
    const ringUp   = fingerUp(16, 14);
    const pinkyUp  = fingerUp(20, 18);

    const wrist = landmarks[0];
    const indexTip = landmarks[8];

    // 👎 AVANZAR
    if (thumbDown && !indexUp && !middleUp && !ringUp && !pinkyUp)
        return "Avanzar";

    // ✋ DETENER
    if (thumbUp && indexUp && middleUp && ringUp && pinkyUp)
        return "Detener";

    // 👉 VUELTA DERECHA
    if (indexUp && !middleUp && !ringUp && !pinkyUp &&
        indexTip.x > wrist.x + 0.15)
        return "Vuelta derecha";

    // 👈 VUELTA IZQUIERDA
    if (indexUp && !middleUp && !ringUp && !pinkyUp &&
        indexTip.x < wrist.x - 0.15)
        return "Vuelta izquierda";

    // ✌️ 90° DERECHA
    if (indexUp && middleUp && !ringUp && !pinkyUp &&
        indexTip.x > wrist.x)
        return "90° derecha";

    // ✌️ 90° IZQUIERDA
    if (indexUp && middleUp && !ringUp && !pinkyUp &&
        indexTip.x < wrist.x)
        return "90° izquierda";

    // 🫱 MANO DERECHA ABIERTA → 360 IZQUIERDA
    if (thumbUp && indexUp && middleUp && ringUp && pinkyUp &&
        handLabel === "Right")
        return "360° izquierda";

    // 🫲 MANO IZQUIERDA ABIERTA → 360 DERECHA
    if (thumbUp && indexUp && middleUp && ringUp && pinkyUp &&
        handLabel === "Left")
        return "360° derecha";

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
            const handLabel = results.multiHandedness[0].label;

            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
                { color: "#00FF00", lineWidth: 3 });

            drawLandmarks(canvasCtx, landmarks,
                { color: "#FF0000", lineWidth: 2 });

            const gesture = detectGesture(landmarks, handLabel);

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