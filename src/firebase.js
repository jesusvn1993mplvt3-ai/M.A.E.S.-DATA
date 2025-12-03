// src/firebase.js

// Importamos las funciones necesarias desde los servidores de Google
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Tu configuración específica (sacada de tu archivo original)
const firebaseConfig = {
    apiKey: "AIzaSyBqHgV4vDat1-VmZfKbiPg7nuiX-ROcexw",
    authDomain: "cirineo-cec21.firebaseapp.com",
    projectId: "cirineo-cec21",
    storageBucket: "cirineo-cec21.firebasestorage.app",
    messagingSenderId: "620210618284",
    appId: "1:620210618284:web:482bab9bf74650fff18409",
    measurementId: "G-B7YLM78RVW"
};

// Inicializamos la aplicación
const app = initializeApp(firebaseConfig);

// Exportamos 'auth' y 'db' para que otros archivos (como app.js) puedan usarlos
export const auth = getAuth(app);
export const db = getFirestore(app);
