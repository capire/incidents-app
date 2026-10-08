using { sap.capire.incidents as my } from '../db/schema';

service AnalyticsService {

  type EmbeddingPoint {
    ID         : UUID;
    title      : String;
    status     : String;
    urgency    : String;
    summary    : String;
    x          : Double;
    y          : Double;
  }

  function getEmbeddingProjection() returns array of EmbeddingPoint;
}
