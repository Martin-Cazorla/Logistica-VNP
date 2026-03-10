// Importamos las funciones necesarias del SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Datos de configuración de TU proyecto (Pegar aquí lo que copiaste de la consola)
const firebaseConfig = {
  apiKey: "AIzaSyD38kaL9OaoraE0uaDYo3n4w1uDC0BirDs",
  authDomain: "logistica2-6f479.firebaseapp.com",
  projectId: "logistica2-6f479",
  storageBucket: "logistica2-6f479.firebasestorage.app",
  messagingSenderId: "975875603605",
  appId: "1:975875603605:web:1e4db08ec6eeff2cdc2f9c"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las instancias para usarlas en otros archivos
export const db = getFirestore(app);
export const auth = getAuth(app);