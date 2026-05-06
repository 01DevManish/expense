import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseDb } from "@/lib/firebaseAdmin";

function getTargetTokens(): string[] {
  const direct = process.env.FCM_TARGET_TOKEN?.trim();
  if (direct) return [direct];
  return [];
}

export async function sendTxnNotification(title: string, body: string) {
  const tokens = getTargetTokens();
  if (tokens.length === 0) return;

  const app = getFirebaseDb().app;
  const messaging = getMessaging(app);

  await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: {
      title,
      body,
      type: "token_transaction"
    }
  });
}

