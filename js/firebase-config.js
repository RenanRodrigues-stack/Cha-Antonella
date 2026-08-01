/**
 * CONFIGURAÇÃO DO FIREBASE
 * -----------------------------------
 * Troque os valores abaixo pelos dados do SEU projeto Firebase.
 * Você encontra isso em: Firebase Console > ⚙️ Configurações do projeto
 * > seção "Seus apps" > ícone Web (</>) > "Config".
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDuDZoIAV3lqgVOIIGGCNY82dT4MsEEh40",
  authDomain: "cha-antonella.firebaseapp.com",
  projectId: "cha-antonella",
  storageBucket: "cha-antonella.firebasestorage.app",
  messagingSenderId: "190752086311",
  appId: "1:190752086311:web:c593243aee4ff616fdb102"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
