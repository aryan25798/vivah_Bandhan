// Scripts for Firebase Cloud Messaging (FCM)
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebase";

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined") return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted" && app) {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
      });
      console.log("FCM Token:", token);
      return token;
    }
  } catch (error) {
    console.error("Notification permission error:", error);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!app) return resolve(null);
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

// Backend helper (to be used in API routes/Server Actions)
export const sendPushNotification = async (fcmToken: string, title: string, body: string) => {
  // This would typically call the Firebase Admin SDK on the server
  console.log(`Sending notification to ${fcmToken}: ${title} - ${body}`);
  // Implementation would use admin.messaging().send()
};
