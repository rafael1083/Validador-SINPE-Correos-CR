# GEMINI.md - Contexto del Proyecto: validador-sinpesXcorreos

## 📋 Descripción General

Sistema Node.js/TypeScript que valida transacciones SINPE Móvil del banco BCR escuchando correos en tiempo real. Procesa dos proyectos simultáneamente: **Etelgive** y **Multichunches**, guardando datos en CSV para auditoría y análisis.

### 🎯 Funcionalidades Clave:
- **IMAP IDLE:** Escucha correos en tiempo real con conexión persistente
- **Parseo BCR:** Filtra correos de `elmensajero@bancobcr.com` con asunto "SINPEMOVIL" o "BN"
- **Almacenamiento CSV:** Transacciones validadas en `data/sinpes_etelgive.csv` y `data/sinpes_multichunches.csv`
- **Deduplicación:** Evita procesar doble por número de referencia
- **API REST:** 12 endpoints para lectura, escritura, descarga y pruebas QA
- **WebSocket (Socket.IO):** Actualización en tiempo real a clientes
- **Sincronización automática:** Rescanea correos del mes si CSV vacío

## 🛠️ Stack Técnico
- **Runtime:** Node.js
- **Lenguaje:** TypeScript
- **Librerías principales:**
  - `imapflow`: Cliente IMAP moderno con soporte IDLE
  - `mailparser`: Parseo robusto de cuerpos y adjuntos
  - `csv-writer`: Gestión eficiente de CSV
  - `express`: Framework HTTP
  - `socket.io`: WebSocket en tiempo real

## 📁 Estructura de Directorios
```text
validador-sinpesXcorreos/
├── src/
│   ├── index.ts          # Servidor Express, IMAP listener, API endpoints
│   ├── config.ts         # Carga credenciales (imap.txt) + remitentes
│   ├── parser.ts         # Parseo regex de emails BCR/BN
│   └── csv-handler.ts    # Lectura/escritura CSV con locking
├── data/
│   ├── sinpes_etelgive.csv
│   ├── sinpes_multichunches.csv
│   └── sinpes.csv        # Histórico (fallback)
├── tests/
│   ├── sinpe-qa.spec.ts              # Suite principal QA (12 tests)
│   ├── realtime.spec.ts              # Tests Socket.IO Multichunches
│   ├── etelgive-realtime.spec.ts      # Tests Socket.IO Etelgive
│   ├── etelgive-validation.spec.ts    # Validación Etelgive (BCR)
│   └── ui.spec.ts                     # Tests UI/Frontend
├── imap.txt              # Credenciales (NO commitar)
├── remitentes.txt        # Configuración remitentes
├── CLAUDE.md             # Documentación técnica completa
└── package.json
```

## 🚀 Instalación y Ejecución
1. **Credenciales:** Crear `imap.txt` formato: `email,app_password,id`
   - Línea 1 → Etelgive
   - Línea 2 → Multichunches
2. **Instalar:** `npm install`
3. **Desarrollo (Hot-Reload):** `npm run dev`
4. **Tests:** `npm test` (Playwright)
5. **Flujo de Despliegue:**
   - **Desarrollo:** Usar `publicarDesarrollo.bat` para versionar (merge de `dev` y `main`) y subir a GitHub.
   - **Producción:** Usar `iniciarProduccion.bat` para levantar el servidor de forma segura (con limpieza de puertos y persistencia).

## 📊 Cambios Técnicos Recientes

### Febrero-Abril 2026
- **IMAP Search Fix:** Corregido error crítico donde secuencias se trataban como UIDs. Ahora `client.search` devuelve secuencias directas para `fetchOne`.
- **BN Search & Parser Update:** Filtro IMAP extendido a asunto "BN". Parser flexible para cualquier motivo (no solo "alquiler"), soporta símbolo "¢".
- **CSV Fallback & Deduplication:** Lectura combinada `sinpes.csv` + archivos por proyecto. Deduplicación por número de referencia.
- **Graceful Shutdown:** Manejadores `SIGINT` y `SIGTERM` para cierre seguro HTTP + IMAP.
- **Hot-Reload:** Configuración nodemon en `npm run dev`.
- **IMAP Locking:** `getMailboxLock` en todas operaciones para evitar corrupción.
- **Robust Parsing:** Regex mejorado en `src/parser.ts` (montos, nombres, entidades).
- **Case-Insensitivity:** Comparaciones remitente/asunto insensibles a mayúsculas.

### Abril 30, 2026 (Sesión Gemini CLI - Diagnóstico y Fix)
- **BN Parser Softened:** Se restauró el soporte para el formato "BN informa" siempre que sea un "Credito". La restricción previa de requerir estrictamente "BN SINPE MOVIL" estaba causando que se ignoraran transacciones válidas.
- **Sync Data Loss Fix:** Corregido error en `syncAndCreateCSV` donde se perdían registros si la columna `proyecto` estaba vacía. Ahora se infiere el proyecto desde el nombre del archivo si falta en la línea.
- **IMAP Connection Monitoring:** Identificados errores `ECONNRESET` frecuentes. El sistema reconecta automáticamente y realiza un `scanRecent` para recuperar correos perdidos durante la desconexión.
- **Improved Logging:** Las transacciones ahora marcan si vienen de "BN Informa - Crédito" para mejor trazabilidad.

### Abril 21, 2026 (Sesión Claude Code)
- **API REST Completa:** 12 endpoints (lectura, escritura, pruebas QA, CSV)
- **WebSocket Tiempo Real:** Socket.IO para actualización instantánea
- **Tests Playwright:** Suite QA con 30+ casos de prueba
- **Limpieza Automática de QA:** Hook `test.afterAll()` en 3 test files
  - Busca patrones: `1234.56`, `5678.90`, `TEST`, `Prueba QA`, `Test Usuario`
  - Elimina registros automáticamente de CSV después de cada ejecución
  - Garantiza CSV limpio para producción
- **Documentación:** CLAUDE.md actualizado con toda funcionalidad

## 🔌 API REST - Endpoints Implementados

### Lectura
| Método | Ruta | Parámetro | Descripción |
|--------|------|-----------|-------------|
| GET | `/api/transactions` | `?project=Etelgive\|Multichunches` | Todas transacciones |
| GET | `/api/transactions/week` | `?project=...` | Transacciones última semana |
| GET | `/api/transactions/month` | `?project=...` | Transacciones este mes |
| GET | `/api/transactions/week/csv` | `?project=...` | Descarga CSV (semana) |
| GET | `/api/transactions/month/csv` | `?project=...` | Descarga CSV (mes) |
| GET | `/api/sync-csv` | — | Sincroniza CSV, rescanea correos |

### Pruebas QA
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/test/create-sinpe` | Crea transacción ficticia Multichunches |
| POST | `/api/test/create-sinpe-etelgive` | Crea transacción ficticia Etelgive |
| DELETE | `/api/test/delete-sinpe/:referencia` | Elimina transacción por referencia |

### WebSocket
- Evento: `new-transaction` → Emitido cuando llega correo nuevo
- Conexión: Socket.IO en `http://localhost:3001`

## 📋 Mandato de Documentación
- **Actualización Continua:** GEMINI.md se actualiza tras cambios significativos en lógica/arquitectura
- **Idioma & Workflow:** Agente piensa y trabaja **exclusivamente en español**
- **Referencia:** Ver CLAUDE.md para documentación técnica completa

## 🛡️ Guías de Desarrollo
- **Parser Updates:** Si BCR cambia formato email → actualizar regex en `src/parser.ts`
- **Security:** ❌ NO commitar `imap.txt` ni `data/sinpes*.csv`
- **Gmail Setup:** Requiere "Contraseñas de aplicación" + IMAP habilitado
- **Tests:** Ejecutar `npm test` antes de cambios en parsing/CSV
  - Limpieza automática se ejecuta al final
  - CSV garantizado limpio post-ejecución
  - Agregar patrones QA a `qaPatternsToRemove` si se usan nuevos montos/nombres
- **Locking:** Mantener `getMailboxLock` en todas operaciones IMAP
- **Deduplicación:** Validar por número de referencia siempre
- **Test Files con Limpieza:** `sinpe-qa.spec.ts`, `realtime.spec.ts`, `etelgive-realtime.spec.ts`
