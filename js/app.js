const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

const statusText = document.getElementById("status");
const commandText = document.getElementById("command");

let lastGestureTime = Date.now();
let suspended = false;
const SUSPEND_TIME = 5000;

/* ===========================
   VARIABLES PARA 360°
=========================== */
let indexPath = [];
const MAX_PATH = 40;

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
   DETECCIÓN DE PUÑO
=========================== */
function isFist(landmarks) {

    const fingerDown = (tip, pip) => landmarks[tip].y > landmarks[pip].y;

    const thumbDown  = landmarks[4].y > landmarks[3].y;
    const indexDown  = fingerDown(8, 6);
    const middleDown = fingerDown(12, 10);
    const ringDown   = fingerDown(16, 14);
    const pinkyDown  = fingerDown(20, 18);

    return thumbDown && indexDown && middleDown && ringDown && pinkyDown;
}

/* ===========================
   DETECCIÓN DE POSTURAS
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

    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp)
        return "Avanzar";

    if (thumbUp && indexUp && middleUp && ringUp && pinkyUp)
        return "Detener";

    if (indexUp && !middleUp && !ringUp && !pinkyUp &&
        indexTip.x > wrist.x + 0.15)
        return "Vuelta derecha";

    if (indexUp && !middleUp && !ringUp && !pinkyUp &&
        indexTip.x < wrist.x - 0.15)
        return "Vuelta izquierda";

    if (indexUp && middleUp && !ringUp && !pinkyUp &&
        indexTip.x > wrist.x)
        return "90° derecha";

    if (indexUp && middleUp && !ringUp && !pinkyUp &&
        indexTip.x < wrist.x)
        return "90° izquierda";

    return "Orden no reconocida";
}

/* ===========================
   DETECCIÓN DE 360° (SOLO CON PUÑO)
=========================== */
function detectCircularMotion() {

    if (indexPath.length < 20) return null;

    let cx = 0, cy = 0;

    indexPath.forEach(p => {
        cx += p.x;
        cy += p.y;
    });

    cx /= indexPath.length;
    cy /= indexPath.length;

    let totalAngle = 0;

    for (let i = 1; i < indexPath.length; i++) {

        const prev = indexPath[i - 1];
        const curr = indexPath[i];

        const angle1 = Math.atan2(prev.y - cy, prev.x - cx);
        const angle2 = Math.atan2(curr.y - cy, curr.x - cx);

        let delta = angle2 - angle1;

        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;

        totalAngle += delta;
    }

    if (Math.abs(totalAngle) > 5.5) {

        indexPath = [];

        if (totalAngle > 0)
            return "360° izquierda";
        else
            return "360° derecha";
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

            const indexTip = landmarks[8];

            // SOLO guardar trayectoria si hay puño
            if (isFist(landmarks)) {
                indexPath.push({ x: indexTip.x, y: indexTip.y });

                if (indexPath.length > MAX_PATH)
                    indexPath.shift();

                const circleGesture = detectCircularMotion();

                if (circleGesture) {
                    lastGestureTime = Date.now();
                    suspended = false;
                    statusText.innerText = "Activo";
                    commandText.innerText = circleGesture;
                    highlightGesture(circleGesture);
                    canvasCtx.restore();
                    return;
                }
            } else {
                indexPath = [];
            }

            const gesture = detectGesture(landmarks);

            if (gesture !== "Orden no reconocida") {
                lastGestureTime = Date.now();
                suspended = false;
                statusText.innerText = "Activo";
            }

            if (!suspended) {
                commandText.innerText = gesture;
                highlightGesture(gesture);
            }
        }

        if (Date.now() - lastGestureTime > SUSPEND_TIME) {
            suspended = true;
            statusText.innerText = "Modo suspendido";
            commandText.innerText = "Esperando gesto...";
            indexPath = [];
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
   INICIO
=========================== */
(async () => {
    await startCamera();
    await initHands();
})();