# 🚀 Reporte de Liquidaciones — Multiusuario en Tiempo Real

Sistema de liquidaciones para 5+ usuarios simultáneos con sincronización en tiempo real vía WebSockets.

---

## ¿Cómo funciona?

- Cualquier cambio (nuevo registro, edición, comentario, maniobra, etc.) se sincroniza automáticamente a **todos los usuarios conectados en menos de 1 segundo**
- Los datos se guardan en una base de datos SQLite en el servidor
- El indicador 🟢 en la barra superior muestra si estás conectado
- El badge **👥 N en línea** muestra cuántos usuarios están activos

---

## Despliegue en Railway (GRATIS, 5 minutos)

### Paso 1 — Crea una cuenta en Railway
Ve a **https://railway.app** y regístrate con tu cuenta de GitHub (gratis).

### Paso 2 — Sube el proyecto
1. Crea un repositorio en GitHub y sube todos estos archivos
2. En Railway, haz clic en **"New Project" → "Deploy from GitHub repo"**
3. Selecciona tu repositorio
4. Railway detecta automáticamente que es Node.js y lo despliega

### Paso 3 — Agrega un volumen para la base de datos
1. En tu proyecto de Railway, ve a **"Add a Service" → "Volume"**
2. Configura el mount path como `/app/data`

### Paso 4 — Obtén tu URL
Railway te da una URL pública como:  
`https://liquidaciones-production-abc123.up.railway.app`

¡Comparte esa URL con tus 5 usuarios y listo!

---

## Alternativa: Render.com (también gratis)

1. Ve a **https://render.com** → New → Web Service
2. Conecta tu repositorio de GitHub
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Agrega un Persistent Disk en `/app/data`

---

## Estructura del proyecto

```
liquidaciones-app/
├── server.js          ← Servidor Node.js + WebSockets + SQLite
├── package.json       ← Dependencias
├── railway.toml       ← Configuración de Railway
└── public/
    └── index.html     ← Frontend completo (tu sistema)
```

---

## Variables de entorno (opcionales)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `DB_PATH` | Ruta de la base de datos | `/app/data/liquidaciones.db` |

---

## Soporte

El sistema soporta reconexión automática si se pierde la conexión.  
Los cambios hechos offline se sincronizan al reconectarse.
