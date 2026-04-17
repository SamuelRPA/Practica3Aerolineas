@echo off
echo ====================================================
echo    Iniciando Sistema Distribuido Aerolineas Pabón
echo ====================================================

echo [1] Levantando Bases de Datos en Docker...
docker-compose up -d

echo [2] Esperando unos segundos para levantar la base de datos...
timeout /t 5 /nobreak > NUL

echo [3] Arrancando Nodos Distribuidos (Backend) y Frontend...
start "Practica 3 - Aerolineas" cmd /c "npm run dev"

echo.
echo Todo esta corriendo.
echo - La interfaz estara en: http://localhost:3000
echo - El backend estará en puerto: 3001
echo.
pause
