import admin from 'firebase-admin';
import { createAdminClient } from '../supabase/server';

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';

const initFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  if (!clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials missing. Push notifications will be logged only.');
    return null;
  }

  // Format private key properly if it contains escaped newline characters
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
};

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  const firebaseAdmin = initFirebaseAdmin();
  const supabase = createAdminClient();

  // 1. Fetch user's registered FCM tokens
  const { data: tokenRecords, error } = await supabase
    .from('fcm_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching FCM tokens for push notification:', error);
    return { success: false, error: error.message };
  }

  if (!tokenRecords || tokenRecords.length === 0) {
    console.log(`No active FCM tokens found for user ${userId}. Skipping push notification.`);
    return { success: true, count: 0 };
  }

  const tokens = tokenRecords.map((r) => r.token);

  if (!firebaseAdmin) {
    console.log('[LOG NOTIFICATION (Admin SDK Uninitialized)]:', {
      userId,
      tokens,
      title,
      body,
      data,
    });
    return { success: true, count: tokens.length, uninitialized: true };
  }

  // 2. Send multicast message
  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: '/logo.png', // Add icon reference
          badge: '/logo.png',
          tag: 'server-alert',
          renotify: true,
        },
      },
    });

    // 3. Clean up invalid/expired tokens (e.g. users who cleared browser data or revoked permission)
    const tokensToRemove: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success && res.error) {
        const code = res.error.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(tokens[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await supabase
        .from('fcm_tokens')
        .delete()
        .in('token', tokensToRemove);
      console.log(`Cleaned up ${tokensToRemove.length} inactive FCM tokens.`);
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.error('Error sending multicast FCM notification:', error);
    return { success: false, error: error.message || error };
  }
};
