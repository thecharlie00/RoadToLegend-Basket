package com.caminoalaro.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Local, optional reminders. The game schedules at most a few when it goes to the background and cancels them
 * when it comes back. Inexact alarms only (no exact-alarm permission), no network, nothing leaves the device.
 * Pending reminders are kept in private preferences so they survive a reboot.
 */
public final class ReminderReceiver extends BroadcastReceiver {
    static final String CHANNEL = "reminders";
    private static final String PREFS = "caa.reminders";
    private static final String KEY = "pending";
    private static final String ACTION_FIRE = "com.caminoalaro.app.REMINDER";
    private static final int MAX = 3;

    @Override public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            reschedule(context);
            return;
        }
        if (!ACTION_FIRE.equals(action)) return;
        int slot = intent.getIntExtra("slot", 0);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        if (title == null || body == null) return;
        show(context, slot, title, body);
        forget(context, slot);
    }

    static boolean allowed(Context context) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        return nm != null && nm.areNotificationsEnabled();
    }

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, context.getString(R.string.reminders_channel), NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription(context.getString(R.string.reminders_channel_desc));
        nm.createNotificationChannel(ch);
    }

    private static void show(Context context, int slot, String title, String body) {
        if (!allowed(context)) return;
        ensureChannel(context);
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(context, 100 + slot, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, CHANNEL) : new Notification.Builder(context);
        b.setSmallIcon(R.drawable.ic_stat_ball).setContentTitle(title).setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body)).setAutoCancel(true).setContentIntent(tap);
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(200 + slot, b.build());
    }

    private static PendingIntent fireIntent(Context context, int slot, String title, String body) {
        Intent i = new Intent(context, ReminderReceiver.class).setAction(ACTION_FIRE).putExtra("slot", slot);
        if (title != null) i.putExtra("title", title).putExtra("body", body);
        return PendingIntent.getBroadcast(context, slot, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Replaces every pending reminder with the given JSON list of {at, title, body}. */
    static void schedule(Context context, String json) {
        cancelAll(context);
        JSONArray kept = new JSONArray();
        try {
            JSONArray list = new JSONArray(json);
            long now = System.currentTimeMillis();
            for (int i = 0; i < list.length() && kept.length() < MAX; i++) {
                JSONObject r = list.getJSONObject(i);
                long at = r.optLong("at", 0);
                String title = r.optString("title", ""), body = r.optString("body", "");
                if (at <= now || title.isEmpty() || body.isEmpty() || title.length() > 120 || body.length() > 300) continue;
                JSONObject k = new JSONObject().put("slot", kept.length()).put("at", at).put("title", title).put("body", body);
                kept.put(k);
            }
        } catch (Exception ignored) { /* malformed list: schedule nothing */ }
        prefs(context).edit().putString(KEY, kept.toString()).apply();
        arm(context, kept);
    }

    static void cancelAll(Context context) {
        AlarmManager am = context.getSystemService(AlarmManager.class);
        for (int slot = 0; slot < MAX; slot++) if (am != null) am.cancel(fireIntent(context, slot, null, null));
        prefs(context).edit().remove(KEY).apply();
    }

    private static void reschedule(Context context) {
        try { arm(context, new JSONArray(prefs(context).getString(KEY, "[]"))); } catch (Exception ignored) { }
    }

    private static void arm(Context context, JSONArray list) {
        AlarmManager am = context.getSystemService(AlarmManager.class);
        if (am == null) return;
        long now = System.currentTimeMillis();
        for (int i = 0; i < list.length(); i++) {
            JSONObject r = list.optJSONObject(i);
            if (r == null || r.optLong("at", 0) <= now) continue;
            int slot = r.optInt("slot", i);
            am.setAndAllowWhileIdle(AlarmManager.RTC, r.optLong("at"), fireIntent(context, slot, r.optString("title"), r.optString("body")));
        }
    }

    private static void forget(Context context, int slot) {
        try {
            JSONArray list = new JSONArray(prefs(context).getString(KEY, "[]")), rest = new JSONArray();
            for (int i = 0; i < list.length(); i++) if (list.getJSONObject(i).optInt("slot", -1) != slot) rest.put(list.getJSONObject(i));
            prefs(context).edit().putString(KEY, rest.toString()).apply();
        } catch (Exception ignored) { }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
