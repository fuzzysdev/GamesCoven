import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCQDw5mJcZz0L8m2cEuuDbx_9Z6KG71GcE',
  authDomain: 'grimoire-games.firebaseapp.com',
  projectId: 'grimoire-games',
  storageBucket: 'grimoire-games.firebasestorage.app',
  messagingSenderId: '584208536810',
  appId: '1:584208536810:web:a8456dbf6230ce05c47393',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
