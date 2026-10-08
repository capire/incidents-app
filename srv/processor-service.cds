using {
  sap.capire.incidents as my,
} from '../db/schema';

service ProcessorService {
  entity Incidents as projection on my.Incidents excluding { embedding };
  entity SimilarIncidents as projection on my.SimilarIncidents;
  annotate my.Customers with @cds.autoexpose;
}
