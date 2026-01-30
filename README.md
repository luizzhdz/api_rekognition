# Backend (Node) - AWS Rekognition

Backend en Node/Express para que tu Flutter Web mande imágenes y el servidor llame a AWS Rekognition sin exponer llaves en el navegador.

## Requisitos

- Node.js 18+ (recomendado 20+)
- Credenciales AWS en la VPS (recomendado: IAM Role si es EC2; si no, variables de entorno)

## Configuración

1) Copia variables de entorno:

```bash
cd server
cp .env.example .env
```

2) Edita `.env`:

- `AWS_REGION`
- `REKOGNITION_COLLECTION_ID`
- `CORS_ORIGINS` (tu dominio web)
- Opcional: `API_KEY`

3) Instala dependencias:

```bash
cd server
npm i
```

4) Ejecuta:

```bash
npm start
```

Health check:

- `GET /health`

## Endpoints

### Crear/verificar colección

- `POST /rekognition/ensure-collection`
  - Body JSON opcional: `{ "collectionId": "..." }`

### Indexar rostro (registrar empleado)

- `POST /rekognition/index-face`
  - `multipart/form-data`
  - Fields:
    - `externalId` (string) **requerido**
    - `image` (archivo jpeg/png) **requerido**
    - `collectionId` (opcional)

Alternativa base64:

- `POST /rekognition/index-face-base64`
  - JSON: `{ "externalId": "user_001", "imageBase64": "...", "collectionId": "..." }`

### Buscar rostro (asistencia)

- `POST /rekognition/search-face`
  - `multipart/form-data`
  - Fields:
    - `image` (archivo) **requerido**
    - `threshold` (opcional, default 80)
    - `collectionId` (opcional)

Alternativa base64:

- `POST /rekognition/search-face-base64`
  - JSON: `{ "imageBase64": "...", "threshold": 80 }`

### Comparar 1:1

- `POST /rekognition/compare-faces`
  - JSON: `{ "sourceImageBase64": "...", "targetImageBase64": "...", "threshold": 80 }`

### Eliminar rostro

- `POST /rekognition/delete-face`
  - JSON: `{ "faceId": "...", "collectionId": "..." }`

## Seguridad

- Si defines `API_KEY` en `.env`, el cliente debe enviar `x-api-key: <API_KEY>`.
- CORS se controla con `CORS_ORIGINS`.

## Despliegue en VPS (rápido)

### Opción PM2

```bash
# en la VPS
cd /ruta/al/proyecto/server
npm ci
npm start
# recomendado:
npm i -g pm2
pm2 start src/index.js --name constructora-backend
pm2 save
pm2 startup
```

### Nginx (opcional)

Proxy a `http://127.0.0.1:8080` y habilita HTTPS (Let’s Encrypt).

## Notas

- Este backend usa el AWS SDK v3 y la cadena de credenciales por defecto.
- Para producción, lo ideal es que la VPS tenga credenciales por rol/instancia o variables de entorno, nunca en el cliente.
