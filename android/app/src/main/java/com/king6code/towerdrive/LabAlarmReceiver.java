package com.king6code.towerdrive;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class LabAlarmReceiver extends BroadcastReceiver {
    private static final String CH = "towerdrive_lab";
    @Override public void onReceive(Context ctx, Intent intent) {
        String title = intent.getStringExtra("t");
        String text = intent.getStringExtra("x");
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CH, "Laboratoire", NotificationManager.IMPORTANCE_DEFAULT);
            nm.createNotificationChannel(ch);
        }
        android.app.Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) b = new android.app.Notification.Builder(ctx, CH);
        else b = new android.app.Notification.Builder(ctx);
        b.setSmallIcon(android.R.drawable.ic_popup_reminder)
         .setContentTitle(title)
         .setContentText(text)
         .setAutoCancel(true);
        nm.notify(1001, b.build());
    }

    public static PendingIntent pending(Context ctx, String title, String text) {
        Intent i = new Intent(ctx, LabAlarmReceiver.class);
        i.putExtra("t", title);
        i.putExtra("x", text);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, 1001, i, flags);
    }
}
