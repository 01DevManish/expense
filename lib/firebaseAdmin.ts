import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Database, getDatabase } from "firebase-admin/database";

let app: App;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function getFirebaseApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId = required("FIREBASE_PROJECT_ID");
  const clientEmail = required("FIREBASE_CLIENT_EMAIL");
  const privateKey = required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
  const databaseURL = required("NEXT_PUBLIC_FIREBASE_DATABASE_URL");

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL
  });

  return app;
}

export function getFirebaseDb(): Database {
  return getDatabase(getFirebaseApp());
}