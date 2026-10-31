package com.caminoalaro.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Offline shell. Java/Gradle sources are prepared, not compiled or signed in this phase. */
public final class MainActivity extends ComponentActivity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String GAME_URL = ORIGIN + "/assets/game/index.html";
    private static final int OPEN_SAVE = 71;
    private static final int EXPORT_SAVE = 72;
    private static final int MAX_SAVE_CHARS = 8 * 1024 * 1024; // Pretty-printed export; imports still enforce the stricter game limit.
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingExport;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setGeolocationEnabled(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.setBackgroundColor(0xff0b1417);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClientCompat() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !GAME_URL.equals(request.getUrl().toString());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!ORIGIN.equals(request.getUrl().getScheme() + "://" + request.getUrl().getHost())) return blocked();
                WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                return response == null ? blocked() : response;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "application/octet-stream"});
                try { startActivityForResult(intent, OPEN_SAVE); } catch (Exception e) { finishFiles(null); }
                return true;
            }
        });
        // Only the bundled, navigations-restricted page can access this narrow export bridge.
        web.addJavascriptInterface(new SaveBridge(), "CAAAndroid");
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                web.evaluateJavascript("window.CAA_APP ? window.CAA_APP.handleBack() : false", value -> {
                    if (!"true".equals(value)) { setEnabled(false); getOnBackPressedDispatcher().onBackPressed(); }
                });
            }
        });
        web.loadUrl(GAME_URL);
    }
    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", null,
            new ByteArrayInputStream(new byte[0]));
    }
    private void finishFiles(Uri[] uris) {
        if (fileCallback != null) { fileCallback.onReceiveValue(uris); fileCallback = null; }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        Uri uri = data == null ? null : data.getData();
        if (request == OPEN_SAVE) { finishFiles(result == Activity.RESULT_OK && uri != null ? new Uri[]{uri} : null); return; }
        if (request == EXPORT_SAVE) {
            final String text = pendingExport; pendingExport = null;
            if (result != Activity.RESULT_OK || uri == null || text == null) return;
            new Thread(() -> {
                try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                    if (out == null) throw new Exception("No output stream");
                    out.write(text.getBytes(StandardCharsets.UTF_8));
                    runOnUiThread(() -> Toast.makeText(this, R.string.export_ok, Toast.LENGTH_SHORT).show());
                } catch (Exception e) {
                    runOnUiThread(() -> Toast.makeText(this, R.string.export_error, Toast.LENGTH_LONG).show());
                }
            }, "caa-save-export").start();
        }
    }
    public final class SaveBridge {
        @JavascriptInterface public void exportSave(String text) {
            if (text == null || text.length() > MAX_SAVE_CHARS) return;
            runOnUiThread(() -> {
                pendingExport = text;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/json").putExtra(Intent.EXTRA_TITLE, "baketball-road-to-legend.json");
                try { startActivityForResult(intent, EXPORT_SAVE); }
                catch (Exception e) { pendingExport = null; Toast.makeText(MainActivity.this, R.string.export_error, Toast.LENGTH_LONG).show(); }
            });
        }
    }
    @Override protected void onResume() {
        super.onResume(); web.onResume(); web.evaluateJavascript("window.dispatchEvent(new Event('caa:native-resume'))", null);
    }
    @Override protected void onPause() {
        web.evaluateJavascript("window.dispatchEvent(new Event('caa:native-pause'))", null);
        web.onPause(); super.onPause();
    }
    @Override protected void onDestroy() {
        finishFiles(null); pendingExport = null; web.removeJavascriptInterface("CAAAndroid"); web.destroy(); super.onDestroy();
    }
}
