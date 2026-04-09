#!/usr/bin/env bash
# EAS build hook — Gradle runs after this script.
# Creates an init script that adds Maven mirrors so Maven Central rate-limiting (HTTP 429) is avoided.
set -euo pipefail

mkdir -p ~/.gradle/init.d

cat > ~/.gradle/init.d/maven-mirror.gradle << 'GRADLE_EOF'
// Runs before settings.gradle so pluginManagement repositories are configured early.
beforeSettings { settings ->
    settings.pluginManagement {
        repositories {
            maven { url "https://cache-redirector.jetbrains.com/plugins.gradle.org/m2" }
            maven { url "https://cache-redirector.jetbrains.com/repo1.maven.org/maven2" }
            gradlePluginPortal()
            google()
            mavenCentral()
        }
    }
}

allprojects {
    buildscript {
        repositories {
            maven { url "https://cache-redirector.jetbrains.com/repo1.maven.org/maven2" }
            google()
            mavenCentral()
        }
    }
    repositories {
        maven { url "https://cache-redirector.jetbrains.com/repo1.maven.org/maven2" }
        google()
        mavenCentral()
    }
}
GRADLE_EOF

echo "✓ Gradle Maven mirror init script created at ~/.gradle/init.d/maven-mirror.gradle"
