// src/firebase.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuración de Firebase proporcionada por el usuario
const firebaseConfig = {
    apiKey: "AIzaSyBqHgV4vDat1-VmZfKbiPg7nuiX-ROcexw",
    authDomain: "cirineo-cec21.firebaseapp.com",
    projectId: "cirineo-cec21",
    storageBucket: "cirineo-cec21.firebasestorage.app",
    messagingSenderId: "620210618284",
    appId: "1:620210618284:web:482bab9bf74650fff18409",
    measurementId: "G-B7YLM78RVW"
};

// Inicializar la aplicación
const app = initializeApp(firebaseConfig);

// Exportar los servicios de Firebase para que app.js pueda usarlos
export const auth = getAuth(app);
export const db = getFirestore(app);
