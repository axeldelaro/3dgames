#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const androidRoot = path.resolve('android');
const manifestPath = path.join(androidRoot, 'app/src/main/AndroidManifest.xml');
const stylesPath = path.join(androidRoot, 'app/src/main/res/values/styles.xml');
const mainActivityPath = path.join(
  androidRoot,
  'app/src/main/java/com/axeldelaro/games3d/MainActivity.java'
);

if (!fs.existsSync(manifestPath)) {
  console.error(`[configure-android] AndroidManifest.xml not found at ${manifestPath}. Run "npx cap add android" first.`);
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

// 1. Ensure required permissions (INTERNET, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, VIBRATE, ACCESS_NETWORK_STATE)
const requiredPermissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.VIBRATE'
];

const permissionBlock = requiredPermissions
  .filter((perm) => !manifest.includes(perm))
  .map((perm) => `    <uses-permission android:name="${perm}" />`)
  .join('\n');

if (permissionBlock.length > 0) {
  if (manifest.includes('<application')) {
    manifest = manifest.replace('<application', `${permissionBlock}\n\n    <application`);
  } else {
    manifest = manifest.replace('</manifest>', `${permissionBlock}\n</manifest>`);
  }
}

// Optional hardware features so tablets/Chromebooks without GPS still install APK cleanly
if (!manifest.includes('android.hardware.location.gps')) {
  const featureBlock = [
    '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />',
    '    <uses-feature android:glEsVersion="0x00030000" android:required="true" />'
  ].join('\n');
  manifest = manifest.replace('<application', `${featureBlock}\n\n    <application`);
}

// 2. Inject hardwareAccelerated="true", largeHeap="true", usesCleartextTraffic="true" on <application>
manifest = manifest.replace(/<application\b([^>]*)>/, (_match, attrs) => {
  let updated = attrs;
  if (!/android:hardwareAccelerated=/.test(updated)) {
    updated += '\n        android:hardwareAccelerated="true"';
  } else {
    updated = updated.replace(/android:hardwareAccelerated="[^"]*"/, 'android:hardwareAccelerated="true"');
  }
  if (!/android:largeHeap=/.test(updated)) {
    updated += '\n        android:largeHeap="true"';
  } else {
    updated = updated.replace(/android:largeHeap="[^"]*"/, 'android:largeHeap="true"');
  }
  if (!/android:usesCleartextTraffic=/.test(updated)) {
    updated += '\n        android:usesCleartextTraffic="true"';
  }
  return `<application${updated}>`;
});

// 3. Configure MainActivity for sensorLandscape
manifest = manifest.replace(/<activity\b([^>]*)>/, (match, attrs) => {
  if (!attrs.includes('MainActivity')) return match;
  let updated = attrs;
  if (!/android:screenOrientation=/.test(updated)) {
    updated += '\n            android:screenOrientation="sensorLandscape"';
  } else {
    updated = updated.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="sensorLandscape"');
  }
  return `<activity${updated}>`;
});

fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('[configure-android] Updated AndroidManifest.xml with permissions, hardwareAccelerated, largeHeap & sensorLandscape.');

// 4. Configure API-23-safe fullscreen styles without status bar
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, 'utf8');
  if (!styles.includes('android:windowFullscreen')) {
    styles = styles.replace(
      /<style name="AppTheme\.NoActionBar"[^>]*>([\s\S]*?)<\/style>/,
      (full, inner) => {
        const extra = [
          '        <item name="android:windowFullscreen">true</item>',
          '        <item name="android:windowContentOverlay">@null</item>'
        ].join('\n');
        return full.replace(inner, `${inner}\n${extra}\n    `);
      }
    );
    fs.writeFileSync(stylesPath, styles, 'utf8');
    console.log('[configure-android] Configured fullscreen theme in res/values/styles.xml.');
  }
}

// 5. Upgrade MainActivity.java to enforce sticky immersive mode + API 28+ display cutout edge-to-edge
if (fs.existsSync(mainActivityPath)) {
  const immersiveActivity = `package com.axeldelaro.games3d;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        enableImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveMode();
        }
    }

    private void enableImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
    }
}
`;
  fs.writeFileSync(mainActivityPath, immersiveActivity, 'utf8');
  console.log('[configure-android] Configured sticky immersive fullscreen & cutout mode in MainActivity.java.');
}
