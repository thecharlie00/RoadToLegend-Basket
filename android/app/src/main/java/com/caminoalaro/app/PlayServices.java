package com.caminoalaro.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.ump.ConsentForm;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.json.JSONObject;

/**
 * Google Play services for the shell (parity with the football game), kept out of MainActivity:
 *  - AdMob interstitials only at safe transitions (never during a match), after UMP consent,
 *    at most one every 5 minutes. Without a production ad unit, release builds show no ads.
 *  - Privacy options form when UMP requires it.
 *  - New-version check through Google Play (no own server).
 *  - Google Play Games achievements, only when a project id and the achievement map exist.
 * The game page itself stays offline; only these native SDKs use the network.
 */
final class PlayServices {
    private static final String TAG = "CaaPlay";
    private static final String TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";
    private static final long MIN_INTERVAL_MS = 5L * 60L * 1000L;
    private static final long FIRST_RETRY_MS = 30L * 1000L, MAX_RETRY_MS = 5L * 60L * 1000L;
    private static final long UPDATE_CHECK_MS = 10L * 60L * 1000L;
    static final int PGS_UI = 9003;

    private final Activity activity;
    private final Consumer<String> js;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable retry = this::requestInterstitial;
    private ConsentInformation consent;
    private volatile boolean adsAllowed, privacyRequired, formShowing, adShowing;
    private boolean adsStarted, adsReady, loading;
    private int failures;
    private InterstitialAd ad;
    private long lastShown;
    private volatile int updateCode;
    private long lastUpdateCheck;
    private final AtomicBoolean updateRunning = new AtomicBoolean(false);
    private volatile boolean pgsOn, pgsSigned;
    private JSONObject pgsMap = new JSONObject();

    PlayServices(Activity activity, Consumer<String> js) { this.activity = activity; this.js = js; }

    void start() {
        try { initPlayGames(); } catch (Throwable e) { Log.w(TAG, "Play Games unavailable", e); }
        try { requestConsent(); } catch (Throwable e) { Log.w(TAG, "Consent unavailable", e); }
        checkUpdate();
    }
    void destroy() { handler.removeCallbacksAndMessages(null); ad = null; }

    private void ui(Runnable r) { activity.runOnUiThread(() -> { try { if (!activity.isFinishing()) r.run(); } catch (Throwable ignored) { } }); }
    private String adUnit() {
        String prod = BuildConfig.ADMOB_INTERSTITIAL_ID == null ? "" : BuildConfig.ADMOB_INTERSTITIAL_ID.trim();
        if (BuildConfig.DEBUG) return TEST_INTERSTITIAL_ID;
        return prod; // empty: no ads in a release build without its own ad unit
    }

    // ---------- Consent (UMP) ----------
    private void requestConsent() {
        consent = UserMessagingPlatform.getConsentInformation(activity);
        consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(), () -> {
            refreshPrivacy();
            formShowing = true;
            try {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, error -> { formShowing = false; updateAdPermission(); });
            } catch (Throwable e) { formShowing = false; updateAdPermission(); }
        }, error -> updateAdPermission());
        updateAdPermission(); // reuse a previous valid choice right away
    }
    private void refreshPrivacy() {
        try { privacyRequired = consent != null && consent.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED; }
        catch (Throwable e) { privacyRequired = false; }
    }
    private void updateAdPermission() {
        try {
            adsAllowed = consent != null && consent.canRequestAds() && !adUnit().isEmpty();
            refreshPrivacy();
            if (adsAllowed) { initAds(); if (adsReady) requestInterstitial(); }
            else { handler.removeCallbacks(retry); ad = null; }
        } catch (Throwable e) { adsAllowed = false; ad = null; }
    }
    boolean privacyOptionsRequired() { return privacyRequired; }
    void showPrivacyOptions() {
        ui(() -> {
            if (consent == null) return;
            formShowing = true;
            try { UserMessagingPlatform.showPrivacyOptionsForm(activity, (ConsentForm.OnConsentFormDismissedListener) error -> { formShowing = false; updateAdPermission(); }); }
            catch (Throwable e) { formShowing = false; }
        });
    }

    // ---------- Interstitials ----------
    private void initAds() {
        if (!adsAllowed || adsStarted) return;
        adsStarted = true;
        try { MobileAds.initialize(activity, status -> ui(() -> { adsReady = true; if (adsAllowed) requestInterstitial(); })); }
        catch (Throwable e) { adsStarted = false; Log.e(TAG, "Ads init failed", e); }
    }
    private void requestInterstitial() {
        if (!adsAllowed || !adsReady || formShowing || loading || ad != null || activity.isFinishing()) return;
        handler.removeCallbacks(retry);
        loading = true;
        try {
            InterstitialAd.load(activity, adUnit(), new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
                @Override public void onAdLoaded(InterstitialAd loaded) { loading = false; failures = 0; if (adsAllowed) ad = loaded; }
                @Override public void onAdFailedToLoad(LoadAdError error) { loading = false; ad = null; failures = Math.min(failures + 1, 10); scheduleRetry(); }
            });
        } catch (Throwable e) { loading = false; failures = Math.min(failures + 1, 10); scheduleRetry(); }
    }
    private void scheduleRetry() {
        if (!adsAllowed || !adsReady) return;
        long delay = Math.min(MAX_RETRY_MS, FIRST_RETRY_MS << Math.min(Math.max(failures - 1, 0), 4));
        handler.removeCallbacks(retry); handler.postDelayed(retry, delay);
    }
    static boolean allowedPlacement(String where) {
        return "menu".equals(where) || "career_start".equals(where) || "match_start".equals(where) || "season_end".equals(where) || "retire".equals(where);
    }
    boolean fullScreenShowing() { return adShowing || formShowing; }
    void showAd(String where) {
        if (!allowedPlacement(where)) return;
        ui(() -> {
            if (!adsAllowed || consent == null || !consent.canRequestAds() || formShowing) return;
            if (ad == null) { requestInterstitial(); return; }
            long now = System.currentTimeMillis();
            if (lastShown > 0 && now - lastShown < MIN_INTERVAL_MS) return;
            final InterstitialAd show = ad; ad = null;
            show.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override public void onAdShowedFullScreenContent() { adShowing = true; lastShown = System.currentTimeMillis(); }
                @Override public void onAdDismissedFullScreenContent() { adShowing = false; requestInterstitial(); }
                @Override public void onAdFailedToShowFullScreenContent(AdError error) { adShowing = false; requestInterstitial(); }
            });
            try { show.show(activity); } catch (Throwable e) { adShowing = false; requestInterstitial(); }
        });
    }

    // ---------- New version on Google Play ----------
    void checkUpdate() {
        long now = System.currentTimeMillis();
        if (now - lastUpdateCheck < UPDATE_CHECK_MS || !updateRunning.compareAndSet(false, true)) return;
        lastUpdateCheck = now;
        try {
            AppUpdateManagerFactory.create(activity).getAppUpdateInfo()
                .addOnSuccessListener(info -> {
                    int code = info.availableVersionCode();
                    updateCode = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE && code > installedVersion() ? code : 0;
                    updateRunning.set(false);
                    if (updateCode > 0) js.accept("window.dispatchEvent(new CustomEvent('caa:update',{detail:" + updateCode + "}))");
                })
                .addOnFailureListener(e -> updateRunning.set(false));
        } catch (Throwable e) { updateRunning.set(false); }
    }
    int updateAvailable() { return updateCode; }
    int installedVersion() {
        try { return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionCode; } catch (Throwable e) { return 0; }
    }
    void openStore() {
        ui(() -> {
            String pkg = activity.getPackageName();
            try {
                activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg)).setPackage("com.android.vending").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (Throwable e) {
                try { activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + pkg)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Throwable ignored) { }
            }
        });
    }

    // ---------- Google Play Games ----------
    private void initPlayGames() throws Exception {
        String project = activity.getString(R.string.game_services_project_id).trim();
        if (project.isEmpty()) return;
        try (InputStream in = activity.getResources().openRawResource(R.raw.pgs_achievements)) {
            ByteArrayOutputStream buf = new ByteArrayOutputStream(); byte[] chunk = new byte[8192];
            for (int n; (n = in.read(chunk)) > 0; ) buf.write(chunk, 0, n);
            pgsMap = new JSONObject(new String(buf.toByteArray(), StandardCharsets.UTF_8));
        }
        if (pgsMap.length() == 0) return;
        PlayGamesSdk.initialize(activity);
        pgsOn = true;
        PlayGames.getGamesSignInClient(activity).isAuthenticated().addOnCompleteListener(task -> {
            pgsSigned = task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
        });
    }
    String pgsState() { return !pgsOn ? "off" : pgsSigned ? "in" : "out"; }
    boolean pgsUnlock(String key) {
        if (!pgsOn || !pgsSigned || key == null) return false;
        final String id = pgsMap.optString(key, "");
        if (id.isEmpty()) return false;
        ui(() -> PlayGames.getAchievementsClient(activity).unlock(id));
        return true;
    }
    void pgsShow() {
        if (!pgsOn) return;
        ui(() -> {
            if (pgsSigned) { openAchievements(); return; }
            PlayGames.getGamesSignInClient(activity).signIn().addOnCompleteListener(task -> {
                pgsSigned = task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
                if (pgsSigned) openAchievements();
            });
        });
    }
    private void openAchievements() {
        PlayGames.getAchievementsClient(activity).getAchievementsIntent().addOnSuccessListener(intent -> {
            try { activity.startActivityForResult(intent, PGS_UI); } catch (Throwable ignored) { }
        });
    }
}
