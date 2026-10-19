@echo off
rem Builds the app with the published data in public\ and serves it as Vercel does,
rem at http://localhost:4173, opening the browser. Ctrl+C stops the server.
cd /d "%~dp0"

rem pnpm comes from Corepack (packageManager in package.json) when it is not on PATH.
set "PNPM=pnpm"
where pnpm >nul 2>nul || set "PNPM=corepack pnpm"
set "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"

if not exist node_modules (
  echo Instalando dependencias...
  call %PNPM% install --frozen-lockfile || goto :fail
)

echo Gerando o build...
call %PNPM% exec vite build || goto :fail

echo Abrindo http://localhost:4173 (Ctrl+C para parar)
call %PNPM% exec vite preview --port 4173 --strictPort --open || goto :fail
goto :eof

:fail
echo.
echo Falhou. Veja o erro acima.
pause
exit /b 1
