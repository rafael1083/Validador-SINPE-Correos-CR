# CLAUDE.md - Validador SINPE × Correos

## 📋 Descripción General

Sistema Node.js/TypeScript que valida transacciones SINPE Móvil del banco BCR escuchando correos en tiempo real. Procesa dos proyectos simultáneamente: **Etelgive** y **Multichunches**, guardando datos en CSV para auditoría y análisis.

---

## 🎯 Funcionalidades Principales

### 1. **Listener IMAP (IDLE)**
- Conecta a Gmail usando IMAP con protocolo IDLE
- Escucha correos en tiempo real de dos cuentas (Etelgive, Multichunches)
- Procesa automáticamente correos de BCR (elmensajero@bancobcr.com)
- Reconexión automática cada 30 segundos si cae conexión

### 2. **Parseo de Emails**
- **Etelgive**: Busca asunto `RV: SINPEMOVIL` de BCR
  - Extrae: referencia, teléfono, nombre cliente, entidad, monto, motivo
- **Multichunches**: Busca correos que contengan estrictamente `BN SINPE MOVIL` en el cuerpo
  - Soporta formato Banco Nacional (BN) y BCR con referencia real
  - Valida que sea acreditación (no débito)
  - Ignora notificaciones genéricas "BN informa" para evitar duplicados
- Limpieza inteligente de montos (soporta múltiples formatos numéricos)
- Normalización de nombres (title case, sin caracteres especiales)

### 3. **Almacenamiento CSV**
- Guarda transacciones en `data/sinpes_etelgive.csv` y `data/sinpes_multichunches.csv`
- Campos: FECHA, NUMERO_REFERENCIA, TELEFONO_ORIGEN, NOMBRE_CLIENTE_ORIGEN, ENTIDAD_ORIGEN, MONTO, MOTIVO, PROYECTO, ESTADO
- **Deduplicación automática**: por número de referencia
- **Fallback**: lee también `sinpes.csv` (archivo histórico general)
- **Locking**: evita corrupción con escrituras simultáneas

### 4. **API REST (Express)**

#### Endpoints de Lectura
| Método | Ruta | Parámetro | Respuesta |
|--------|------|-----------|-----------|
| GET | `/api/transactions` | `?project=Etelgive\|Multichunches` | Array de transacciones |
| GET | `/api/transactions/week` | `?project=...` | Transacciones última semana |
| GET | `/api/transactions/month` | `?project=...` | Transacciones este mes |
| GET | `/api/transactions/week/csv` | `?project=...` | CSV descargable (semana) |
| GET | `/api/transactions/month/csv` | `?project=...` | CSV descargable (mes) |
| GET | `/api/sync-csv` | — | Sincroniza CSV y rescanea correos |

#### Endpoints de Prueba QA
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/test/create-sinpe` | Crea transacción ficticia Multichunches |
| POST | `/api/test/create-sinpe-etelgive` | Crea transacción ficticia Etelgive |
| DELETE | `/api/test/delete-sinpe/:referencia` | Elimina transacción por referencia |

### 5. **WebSocket (Socket.IO)**
- Emite eventos `new-transaction` cuando llega correo nuevo
- Permite actualización en tiempo real en clientes conectados

### 6. **Sincronización CSV**
- Endpoint `/api/sync-csv` rescanea correos desde inicio de mes actual
- Recupera datos si CSV está vacío
- Mantiene historial combinado de múltiples fuentes

---

## 🏗️ Arquitectura

```
src/
├── index.ts          # Servidor Express + IMAP listener + API endpoints
├── config.ts         # Carga credenciales (imap.txt) + remitentes
├── parser.ts         # Parseo regex de emails BCR/BN
└── csv-handler.ts    # Lectura/escritura CSV con locking

data/
├── sinpes_etelgive.csv
├── sinpes_multichunches.csv
└── sinpes.csv        # Histórico (fallback)

tests/
├── sinpe-qa.spec.ts              # Suite principal QA (12 tests)
├── realtime.spec.ts              # Tests Socket.IO tiempo real
├── etelgive-realtime.spec.ts      # Tests Etelgive multi-proyecto
├── etelgive-validation.spec.ts    # Validación Etelgive
└── ui.spec.ts                     # Tests UI/Frontend
```

---

## ⚙️ Configuración

### Archivos Requeridos

**`imap.txt`** (NO commitar):
```
email1@gmail.com,app_password_1,id
email2@gmail.com,app_password_2,id
```
Línea 1 → Etelgive
Línea 2 → Multichunches

**`remitentes.txt`** (opcional):
```
elmensajero@bancobcr.com,SINPEMOVIL
```

### Variables de Entorno
- `PORT`: Puerto del servidor (default: 3001)

---

## 🚀 Comandos

| Comando | Uso |
|---------|-----|
| `npm install` | Instalar dependencias |
| `npm start` | Producción (ts-node) |
| `npm run dev` | Desarrollo con hot-reload (nodemon) |
| `npm test` | Tests Playwright |
| `npm run test:ui` | Tests con UI interactiva |
| `npm run test:debug` | Tests en modo debug |

---

## 🔄 Flujo de Despliegue (CI/CD Local)

### 1. Desarrollo (Windows 11)
- Usa `publicarDesarrollo.bat` tras hacer cambios.
- Este script pasa los tests (`npm test`), crea versiones (`commit`) tanto en `dev` como en `main` conservando el historial (usando `merge`), y sube a GitHub.

### 2. Producción (Windows 10)
- Usa `actualizar_servidor.bat` para descargar los últimos cambios de `main`.
- Usa `iniciarProduccion.bat` para limpiar puertos, instalar dependencias y levantar el servidor.

---

## 📊 Flujo de Datos

1. **IMAP Listener** escucha correos
2. **Parser** extrae datos del email
3. **Deduplicación** verifica si referencia existe
4. **CSV Handler** escribe en archivo + cache en memoria
5. **Socket.IO** emite evento a clientes
6. **API** devuelve datos a través de HTTP

---

## 🧪 Tests QA

### Suite de Tests Playwright

| Archivo | Descripción | Tests |
|---------|-------------|-------|
| `sinpe-qa.spec.ts` | Suite principal validación API | 12 tests |
| `realtime.spec.ts` | Socket.IO tiempo real (Multichunches) | 2 tests |
| `etelgive-realtime.spec.ts` | Socket.IO tiempo real (Etelgive) + multi-proyecto | 3 tests |
| `etelgive-validation.spec.ts` | Validación Etelgive (BCR) | 7 tests |
| `ui.spec.ts` | UI/Frontend tests | 6 tests |

### Funcionalidad de Limpieza Automática

**Nuevo (Abril 2026):** Todos los test files limpian automáticamente registros QA después de ejecutarse.

**Mecanismo:**
- Hook `test.afterAll()` revisa `data/sinpes_*.csv` después de todos los tests
- Busca y elimina registros con patrones QA:
  - Montos: `1234.56` (Multichunches), `5678.90` (Etelgive)
  - Palabras clave: `TEST`, `Prueba QA`, `Test Usuario`
- Reporta cantidad de registros eliminados
- CSV garantizado limpio para producción

**Archivos con limpieza:**
- `sinpe-qa.spec.ts`
- `realtime.spec.ts`
- `etelgive-realtime.spec.ts`

**Ejecutar**: 
- `npm test` - Corre todos (30+ tests)
- `npm test -- sinpe-qa.spec.ts` - Solo suite principal
- `npm run test:ui` - Modo interactivo
- `npm run test:debug` - Debug mode

---

## 🔒 Seguridad

- ❌ NO commitar `imap.txt` (credenciales Gmail)
- ❌ NO commitar `data/sinpes*.csv` (datos sensibles)
- ✅ Locking en escrituras para evitar corrupción
- ✅ Validación de entrada en parseo (regex seguro)
- ✅ Graceful shutdown (SIGINT, SIGTERM)

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| `ECONNREFUSED` al conectar IMAP | Verificar credenciales en `imap.txt` |
| CSV corrupto | Ejecutar `GET /api/sync-csv` |
| Correos no procesados | Verificar asunto (debe contener SINPE o BN) |
| Datos no actualizan en tiempo real | Verificar Socket.IO conectado en cliente |

---

## 📝 Notas Desarrollo

- **Hot-reload**: Use `npm run dev` para cambios automáticos
- **Lenguaje**: TypeScript compilado a JS en runtime
- **Framework**: Express 5.2+, Socket.IO 4.8+
- **Parseo**: Regex flexible para soportar múltiples formatos de BCR
- **Deuda técnica**: Considerar migrar CSV a SQLite en futuro

---

## 👨‍💻 Convenciones Código

- Funciones async/await
- Logs con prefijo `[COMPONENTE]`: `[IMAP][proyecto]`, `[CSV]`, `[PARSER]`
- Manejo de errores con try/catch
- Consultar `GEMINI.md` para contexto técnico detallado

---

**Última actualización**: 2026-04-29 (Corrección de duplicados BN - Multichunches)
**Estado**: Operativo | Tests con limpieza automática activa | 30+ casos de prueba
