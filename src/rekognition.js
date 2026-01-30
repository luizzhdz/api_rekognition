const {
  RekognitionClient,
  CreateCollectionCommand,
  ListCollectionsCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  CompareFacesCommand,
  DeleteFacesCommand,
} = require('@aws-sdk/client-rekognition');

function makeClient({ region }) {
  // Uses default credential provider chain:
  // - env vars (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)
  // - instance role (EC2)
  // - other supported providers
  return new RekognitionClient({ region });
}

async function ensureCollection({ client, collectionId }) {
  try {
    const list = await client.send(new ListCollectionsCommand({}));
    const existing = list.CollectionIds || [];
    if (existing.includes(collectionId)) {
      return { created: false, collectionId };
    }
  } catch (err) {
    // If ListCollections is not allowed, we can still attempt CreateCollection.
  }

  try {
    await client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
    return { created: true, collectionId };
  } catch (err) {
    // If it already exists, AWS returns ResourceAlreadyExistsException
    if (err && (err.name === 'ResourceAlreadyExistsException' || err.Code === 'ResourceAlreadyExistsException')) {
      return { created: false, collectionId };
    }
    throw err;
  }
}

async function indexFace({ client, collectionId, imageBytes, externalId, maxFaces = 1, qualityFilter = 'AUTO' }) {
  const cmd = new IndexFacesCommand({
    CollectionId: collectionId,
    Image: { Bytes: imageBytes },
    ExternalImageId: externalId,
    DetectionAttributes: ['ALL'],
    MaxFaces: maxFaces,
    QualityFilter: qualityFilter,
  });

  const data = await client.send(cmd);
  const records = data.FaceRecords || [];

  if (!records.length) {
    return {
      success: false,
      errorMessage: 'No se detecto ningun rostro en la imagen',
    };
  }

  const face = records[0].Face;
  return {
    success: true,
    faceId: face?.FaceId || null,
    externalImageId: face?.ExternalImageId || externalId,
    confidence: face?.Confidence ?? null,
  };
}

async function searchFaceByImage({ client, collectionId, imageBytes, threshold = 80, maxFaces = 1 }) {
  const cmd = new SearchFacesByImageCommand({
    CollectionId: collectionId,
    Image: { Bytes: imageBytes },
    FaceMatchThreshold: threshold,
    MaxFaces: maxFaces,
  });

  const data = await client.send(cmd);
  const matches = data.FaceMatches || [];

  if (!matches.length) {
    return {
      success: true,
      faceFound: false,
      errorMessage: 'No se encontro coincidencia',
    };
  }

  const match = matches[0];
  const face = match.Face;

  return {
    success: true,
    faceFound: true,
    matchedUserId: face?.ExternalImageId || null,
    similarity: match.Similarity ?? null,
    faceId: face?.FaceId || null,
  };
}

async function compareFaces({ client, sourceBytes, targetBytes, threshold = 80 }) {
  const cmd = new CompareFacesCommand({
    SourceImage: { Bytes: sourceBytes },
    TargetImage: { Bytes: targetBytes },
    SimilarityThreshold: threshold,
  });

  const data = await client.send(cmd);
  const matches = data.FaceMatches || [];

  if (!matches.length) {
    return { success: true, match: false, similarity: 0 };
  }

  const similarity = matches[0].Similarity ?? 0;
  return { success: true, match: similarity >= threshold, similarity };
}

async function deleteFace({ client, collectionId, faceId }) {
  const cmd = new DeleteFacesCommand({
    CollectionId: collectionId,
    FaceIds: [faceId],
  });

  await client.send(cmd);
  return { success: true };
}

module.exports = {
  makeClient,
  ensureCollection,
  indexFace,
  searchFaceByImage,
  compareFaces,
  deleteFace,
};
