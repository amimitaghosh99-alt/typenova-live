@echo off
echo ============================================================
echo  TypeNova Git Helper: Stage & Commit (Excluding Studio)
echo ============================================================
echo.

echo [1/3] Staging all changes except src/pages/TypeNovaStudio.tsx...
git add -- . ":!src/pages/TypeNovaStudio.tsx"

echo.
echo [2/3] Checking staged changes:
git status --short

echo.
echo [3/3] Committing staged changes...
git commit -m "chore: platform updates (excluding studio)"

echo.
echo ============================================================
echo Status check:
git status -s
echo.
echo If TypeNovaStudio.tsx is listed with 'M', it remained safely uncommitted!
echo ============================================================
pause
