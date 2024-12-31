// src/config/firebaseAdmin.js
import admin from 'firebase-admin';
import { initializeApp, cert } from 'firebase-admin/app';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const adminDb = admin.firestore();

export { adminDb, admin };
