package com.king6code.towerdrive;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.OnUserEarnedRewardListener;
import com.google.android.gms.ads.rewarded.RewardItem;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

public class MainActivity extends Activity {
    private WebView webView;
    private RewardedAd rewardedAd;
    private boolean earned = false;

    /* IDs AdMob de production (compte KING6CODE) */
    private static final String AD_UNIT_REWARDED = "ca-app-pub-8086962907043995/3230517110";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new NativeAds(), "NativeAds");
        webView.addJavascriptInterface(new Billing(this, webView), "NativeBilling");
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
        MobileAds.initialize(this, null);
        loadRewarded();
    }

    private void loadRewarded() {
        RewardedAd.load(this, AD_UNIT_REWARDED, new AdRequest.Builder().build(),
            new RewardedAdLoadCallback() {
                @Override public void onAdLoaded(RewardedAd ad) { rewardedAd = ad; }
                @Override public void onAdFailedToLoad(LoadAdError err) { rewardedAd = null; }
            });
    }

    private void showRewarded() {
        if (rewardedAd == null) { adDone(false); loadRewarded(); return; }
        earned = false;
        rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() {
                rewardedAd = null; loadRewarded(); adDone(earned);
            }
            @Override public void onAdFailedToShowFullScreenContent(AdError e) {
                rewardedAd = null; loadRewarded(); adDone(false);
            }
        });
        rewardedAd.show(this, new OnUserEarnedRewardListener() {
            @Override public void onUserEarnedReward(RewardItem reward) { earned = true; }
        });
    }

    /* Renvoie le résultat au jeu : window.__adDone(true|false) */
    private void adDone(final boolean ok) {
        runOnUiThread(new Runnable() {
            @Override public void run() {
                if (webView != null) webView.evaluateJavascript(
                    "window.__adDone&&window.__adDone(" + (ok ? "true" : "false") + ")", null);
            }
        });
    }

    /* Bridge JS exposé sous window.NativeAds */
    class NativeAds {
        @JavascriptInterface public boolean isReady() { return rewardedAd != null; }
        @JavascriptInterface public void showRewarded() {
            runOnUiThread(new Runnable() {
                @Override public void run() { MainActivity.this.showRewarded(); }
            });
        }
        /* [NEW P3] notification locale quand une recherche de labo se termine */
        @JavascriptInterface public void notifyLab(final String title, final String text, final long atMs) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    android.app.AlarmManager am = (android.app.AlarmManager) getSystemService(ALARM_SERVICE);
                    if (am == null) return;
                    android.app.PendingIntent pi = LabAlarmReceiver.pending(MainActivity.this, title, text);
                    if (android.os.Build.VERSION.SDK_INT >= 33 &&
                        checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                            != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 7);
                    }
                    try { am.cancel(pi); } catch (Exception ignored) {}
                    am.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, atMs, pi);
                }
            });
        }
        @JavascriptInterface public void cancelLab() {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    android.app.AlarmManager am = (android.app.AlarmManager) getSystemService(ALARM_SERVICE);
                    if (am == null) return;
                    try { am.cancel(LabAlarmReceiver.pending(MainActivity.this, "", "")); } catch (Exception ignored) {}
                }
            });
        }
        /* [NEW P4] partage de la carte de fin de run */
        @JavascriptInterface public void shareImage(final String base64) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    try {
                        byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
                        java.io.File f = new java.io.File(getCacheDir(), "tower-drive-run.png");
                        java.io.FileOutputStream fo = new java.io.FileOutputStream(f);
                        fo.write(bytes); fo.close();
                        android.net.Uri uri = androidx.core.content.FileProvider.getUriForFile(
                            MainActivity.this, "com.king6code.towerdrive.fileprovider", f);
                        android.content.Intent it = new android.content.Intent(android.content.Intent.ACTION_SEND);
                        it.setType("image/png");
                        it.putExtra(android.content.Intent.EXTRA_STREAM, uri);
                        it.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(android.content.Intent.createChooser(it, "Partager la run"));
                    } catch (Exception ignored) {}
                }
            });
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
