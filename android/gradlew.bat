@rem Gradle startup script for Windows
@if "%DEBUG%" == "" @echo off
set APP_HOME=%~dp0
set CLASSPATH=%APP_HOME%gradle\wrapper\gradle-wrapper.jar
set JAVA_EXE=java.exe
%JAVA_EXE% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
