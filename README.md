# ✋ Gesture Control System

Sistema web de reconocimiento gestual en tiempo real utilizando **MediaPipe Hands** y JavaScript.

La aplicación permite detectar órdenes mediante movimientos de la mano usando la cámara del navegador. Incluye detección de gestos estáticos y dinámicos (movimientos circulares para 360°), así como un sistema de suspensión automática por inactividad.

---

## 🚀 Características

- Detección de mano en tiempo real con MediaPipe
- Reconocimiento de gestos estáticos:
  - 👍 Avanzar
  - ✋ Detener
  - 👉 Vuelta derecha
  - 👈 Vuelta izquierda
  - ✌️ 90° derecha
  - ✌️ 90° izquierda
- Reconocimiento de gestos dinámicos:
  - 🔄 360° derecha (movimiento circular horario)
  - 🔄 360° izquierda (movimiento circular antihorario)
- Suspensión automática tras 5 segundos sin gesto válido
- Reactivación automática al detectar movimiento
- Interfaz moderna con Bootstrap 5
- Arquitectura modular (HTML, CSS y JS separados)

---

## 🧠 Tecnologías Utilizadas

- HTML5
- CSS3
- Bootstrap 5
- JavaScript (ES6+)
- MediaPipe Hands
- WebRTC (getUserMedia)
- WebGL

---

## 📁 Estructura del Proyecto
