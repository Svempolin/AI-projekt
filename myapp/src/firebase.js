import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            "AIzaSyBFzGutHRaLScD5Kt9_btoxvhQEd1ADkXQ",
  authDomain:        "mydatabase-5f0c7.firebaseapp.com",
  projectId:         "mydatabase-5f0c7",
  storageBucket:     "mydatabase-5f0c7.firebasestorage.app",
  messagingSenderId: "192402122863",
  appId:             "1:192402122863:web:bd7c67e417926f6d47c59a",
  measurementId:     "G-XJ6J6F1PYM"
}

const app     = initializeApp(firebaseConfig)
export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const storage = getStorage(app)
