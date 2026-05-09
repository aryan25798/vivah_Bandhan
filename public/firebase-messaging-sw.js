importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBa9odG49K_jKKbS7LubcN1R_fCI2vr6bw",
  authDomain: "matrimonial-69101.firebaseapp.com",
  projectId: "matrimonial-69101",
  storageBucket: "matrimonial-69101.firebasestorage.app",
  messagingSenderId: "892823944518",
  appId: "1:892823944518:web:1786956c78e9d2d2067947"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/heart.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
