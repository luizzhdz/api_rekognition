const express = require('express');
const multer = require('multer');

const { config } = require('../config');
const {
  makeClient,
  ensureCollection,
  indexFace,
  searchFaceByImage,
  compareFaces,
  deleteFace,
} = require('../rekognition');

function parseBase64Image(input) {
  if (!input || typeof input !== 'string') return null;

  // Accept raw base64 or data URL (data:image/jpeg;base64,....)
  const dataUrlMatch = input.match(/^data:(.*?);base64,(.*)$/);
  const base64 = dataUrlMatch ? dataUrlMatch[2] : input;

  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

function validateImageBuffer(buf, maxBytes) {
  if (!buf || !Buffer.isBuffer(buf)) {
    const err = new Error('Imagen requerida');
    err.statusCode = 400;
    err.code = 'bad_request';
    throw err;
  }
  if (buf.length === 0) {
    const err = new Error('Imagen vacia');
    err.statusCode = 400;
    err.code = 'bad_request';
    throw err;
  }
  if (buf.length > maxBytes) {
    const err = new Error(`Imagen demasiado grande (max ${maxBytes} bytes)`);
    err.statusCode = 413;
    err.code = 'payload_too_large';
    throw err;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxImageBytes,
  },
});

const router = express.Router();

// Shared client (ok for Node; AWS SDK v3 client is lightweight)
const client = makeClient({ region: config.awsRegion });

router.post('/ensure-collection', async (req, res, next) => {
  try {
    const collectionId = req.body?.collectionId || config.collectionId;
    const result = await ensureCollection({ client, collectionId });
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// multipart/form-data: fields: externalId, image
router.post('/index-face', upload.single('image'), async (req, res, next) => {
  try {
    const externalId = req.body?.externalId;
    if (!externalId) {
      const err = new Error('externalId requerido');
      err.statusCode = 400;
      err.code = 'bad_request';
      throw err;
    }

    const collectionId = req.body?.collectionId || config.collectionId;
    const imageBytes = req.file?.buffer;
    validateImageBuffer(imageBytes, config.maxImageBytes);

    await ensureCollection({ client, collectionId });

    const result = await indexFace({
      client,
      collectionId,
      imageBytes,
      externalId,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// multipart/form-data: fields: threshold?, image
router.post('/search-face', upload.single('image'), async (req, res, next) => {
  try {
    const collectionId = req.body?.collectionId || config.collectionId;
    const threshold = req.body?.threshold ? Number(req.body.threshold) : 80;

    const imageBytes = req.file?.buffer;
    validateImageBuffer(imageBytes, config.maxImageBytes);

    await ensureCollection({ client, collectionId });

    const result = await searchFaceByImage({
      client,
      collectionId,
      imageBytes,
      threshold,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// JSON: { sourceImageBase64, targetImageBase64, threshold? }
router.post('/compare-faces', async (req, res, next) => {
  try {
    const threshold = req.body?.threshold ? Number(req.body.threshold) : 80;

    const sourceBytes = parseBase64Image(req.body?.sourceImageBase64);
    const targetBytes = parseBase64Image(req.body?.targetImageBase64);
    validateImageBuffer(sourceBytes, config.maxImageBytes);
    validateImageBuffer(targetBytes, config.maxImageBytes);

    const result = await compareFaces({
      client,
      sourceBytes,
      targetBytes,
      threshold,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// JSON: { faceId }
router.post('/delete-face', async (req, res, next) => {
  try {
    const faceId = req.body?.faceId;
    if (!faceId) {
      const err = new Error('faceId requerido');
      err.statusCode = 400;
      err.code = 'bad_request';
      throw err;
    }

    const collectionId = req.body?.collectionId || config.collectionId;

    const result = await deleteFace({ client, collectionId, faceId });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// JSON alternative: { imageBase64, externalId, threshold, collectionId }
router.post('/search-face-base64', async (req, res, next) => {
  try {
    const collectionId = req.body?.collectionId || config.collectionId;
    const threshold = req.body?.threshold ? Number(req.body.threshold) : 80;

    const imageBytes = parseBase64Image(req.body?.imageBase64);
    validateImageBuffer(imageBytes, config.maxImageBytes);

    await ensureCollection({ client, collectionId });

    const result = await searchFaceByImage({
      client,
      collectionId,
      imageBytes,
      threshold,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/index-face-base64', async (req, res, next) => {
  try {
    const externalId = req.body?.externalId;
    if (!externalId) {
      const err = new Error('externalId requerido');
      err.statusCode = 400;
      err.code = 'bad_request';
      throw err;
    }

    const collectionId = req.body?.collectionId || config.collectionId;
    const imageBytes = parseBase64Image(req.body?.imageBase64);
    validateImageBuffer(imageBytes, config.maxImageBytes);

    await ensureCollection({ client, collectionId });

    const result = await indexFace({
      client,
      collectionId,
      imageBytes,
      externalId,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = { rekognitionRouter: router };
