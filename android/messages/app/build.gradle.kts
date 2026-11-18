// « Messages », MemoCat's chat as an Android app apart: a Trusted Web Activity
// that opens https://<messagesHost>/messages full screen in Chrome (shared
// sign-in with MemoCat, notifications delegated). Built and signed by
// .github/workflows/android-messages.yml; see deploy/README.md.
plugins {
    id("com.android.application")
}

val host = (findProperty("messagesHost") as String?)?.trim().orEmpty().ifEmpty { "memocat.example" }
require(Regex("^[a-z0-9.-]+$").matches(host)) { "messagesHost : un nom de domaine, sans https:// ni chemin" }
val launchUrl = "https://$host/messages"
val keystore = System.getenv("ANDROID_KEYSTORE_PATH")

android {
    namespace = "com.memocat.messages"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.memocat.messages"
        minSdk = 26
        targetSdk = 34
        versionCode = (findProperty("versionCode") as String?)?.toIntOrNull() ?: 1
        versionName = "1.${versionCode}"
        manifestPlaceholders["hostName"] = host
        resValue("string", "launchUrl", launchUrl)
        resValue("string", "assetStatements", """[{ "relation": ["delegate_permission/common.handle_all_urls"], "target": { "namespace": "web", "site": "https://$host" } }]""")
    }

    signingConfigs {
        if (keystore != null) {
            create("release") {
                storeFile = file(keystore)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystore != null) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
}
