using { sap.capire.incidents as my } from '../db/schema';
using { ProcessorService } from './processor-service';

// AI overlay: adds local semantic search over incidents (title + conversation),
// powered by @cap-js/ai's local ONNX embeddings on SQLite. Kept separate from the
// base model so the AI feature is opt-in and the sample stays untouched.

extend my.Incidents with {
  // Text to embed (title + all conversation messages), maintained by a handler in
  // processor-service.js. The embedding is a stored calculated element: the database
  // recomputes it automatically whenever `summary` changes. @cds.api.ignore keeps both
  // out of the OData API. The model name is ignored on SQLite and honored on SAP HANA.
  @cds.api.ignore summary   : String;
  @cds.api.ignore embedding : Vector(384) = vector_embedding( // dim of all-MiniLM-L6-v2
    summary, 'DOCUMENT', 'SAP_GXY.20250407'
  ) stored;
}

extend service ProcessorService with {
  // Ranks incidents by semantic similarity of the phrase to their embedded content.
  function searchIncidents(phrase : String) returns array of {
    ID        : UUID;
    title     : String;
    relevance : Double;
  };
}
