import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2m2GrYwB8OWMZ-KqPPz26QIUT35Iz1Cs",
  authDomain: "investment-review-db29f.firebaseapp.com",
  projectId: "investment-review-db29f",
  storageBucket: "investment-review-db29f.firebasestorage.app",
  messagingSenderId: "411803669742",
  appId: "1:411803669742:web:0ade4d6077889b83ae8fff",
  measurementId: "G-LQNG2PT906"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
