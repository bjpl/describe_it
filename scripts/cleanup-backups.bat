@echo off
REM Cleanup Backup Files Script (Windows)
REM Purpose: Remove unnecessary backup files from the repository
REM Created: 2025-10-03
REM Safety: Creates final backup before deletion

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "TIMESTAMP=%date:~-4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=!TIMESTAMP: =0!"
set "LOG_FILE=%PROJECT_ROOT%\docs\cleanup\cleanup-!TIMESTAMP!.log"

REM Ensure log directory exists
if not exist "%PROJECT_ROOT%\docs\cleanup" mkdir "%PROJECT_ROOT%\docs\cleanup"

echo === Backup File Cleanup Script ===
echo Project Root: %PROJECT_ROOT%
echo Log File: %LOG_FILE%
echo.

REM Create log file
echo Cleanup started at %date% %time% > "%LOG_FILE%"

REM Create final backup directory
set "BACKUP_DIR=%PROJECT_ROOT%\docs\cleanup\final-backup-!TIMESTAMP!"
mkdir "%BACKUP_DIR%"

echo Creating final backup archive...
echo Creating final backup archive... >> "%LOG_FILE%"

REM Copy backup files to final backup
set BACKUP_COUNT=0
for /r "%PROJECT_ROOT%" %%f in (*.backup *.fixed *.old *.bak *.tmp) do (
    if exist "%%f" (
        set "rel_path=%%f"
        set "rel_path=!rel_path:%PROJECT_ROOT%\=!"

        REM Create directory structure
        for %%d in ("%%~dpf") do (
            set "target_dir=!BACKUP_DIR!\!rel_path!"
            set "target_dir=!target_dir:%%~nxf=!"
            if not exist "!target_dir!" mkdir "!target_dir!"
        )

        REM Copy file
        copy "%%f" "!BACKUP_DIR!\!rel_path!" >nul 2>&1
        if !errorlevel! equ 0 (
            echo Backed up: !rel_path!
            echo Backed up: !rel_path! >> "%LOG_FILE%"
            set /a BACKUP_COUNT+=1
        )
    )
)

echo.
echo Created final backup with %BACKUP_COUNT% files
echo Created final backup with %BACKUP_COUNT% files >> "%LOG_FILE%"
echo.

REM Display files to be deleted
echo The following backup files will be deleted:
echo.
echo Files to be deleted: >> "%LOG_FILE%"

set DELETE_COUNT=0
for /r "%PROJECT_ROOT%" %%f in (*.backup *.fixed *.old *.bak *.tmp) do (
    if exist "%%f" (
        set "rel_path=%%f"
        set "rel_path=!rel_path:%PROJECT_ROOT%\=!"
        echo   - !rel_path!
        echo   Will delete: !rel_path! >> "%LOG_FILE%"
        set /a DELETE_COUNT+=1
    )
)

echo.
echo Total files to delete: %DELETE_COUNT%
echo Total files to delete: %DELETE_COUNT% >> "%LOG_FILE%"
echo.

if %DELETE_COUNT% equ 0 (
    echo No backup files found. Nothing to clean up.
    echo No backup files found. >> "%LOG_FILE%"
    goto :end
)

REM Ask for confirmation
echo WARNING: This will permanently delete these files from the working directory.
echo A final backup has been created in docs\cleanup\
echo.
set /p "confirmation=Do you want to proceed with deletion? (yes/no): "

if /i not "!confirmation!"=="yes" (
    echo Cleanup cancelled by user.
    echo Cleanup cancelled by user. >> "%LOG_FILE%"
    goto :end
)

REM Perform deletion
echo.
echo Starting deletion of backup files...
echo Starting deletion... >> "%LOG_FILE%"

set DELETED_COUNT=0
set FAILED_COUNT=0

for /r "%PROJECT_ROOT%" %%f in (*.backup *.fixed *.old *.bak *.tmp) do (
    if exist "%%f" (
        set "rel_path=%%f"
        set "rel_path=!rel_path:%PROJECT_ROOT%\=!"

        del "%%f" >nul 2>&1
        if !errorlevel! equ 0 (
            echo [OK] Deleted: !rel_path!
            echo [OK] Deleted: !rel_path! >> "%LOG_FILE%"
            set /a DELETED_COUNT+=1
        ) else (
            echo [FAIL] Failed to delete: !rel_path!
            echo [FAIL] Failed to delete: !rel_path! >> "%LOG_FILE%"
            set /a FAILED_COUNT+=1
        )
    )
)

echo.
echo Deletion complete!
echo   Deleted: %DELETED_COUNT% files
echo   Failed: %FAILED_COUNT% files
echo.
echo Deletion summary: %DELETED_COUNT% deleted, %FAILED_COUNT% failed >> "%LOG_FILE%"

REM Run verification if available
if exist "%SCRIPT_DIR%verify-cleanup.bat" (
    echo Running verification...
    call "%SCRIPT_DIR%verify-cleanup.bat"
) else (
    echo Verification script not found. Skipping.
)

:end
echo.
echo Cleanup complete! Log saved to:
echo %LOG_FILE%
echo Cleanup completed at %date% %time% >> "%LOG_FILE%"

endlocal
pause
