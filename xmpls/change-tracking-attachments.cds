//use this file, if you want to test change-tracking with the attachemnts plugin enabled
using { ProcessorService.Incidents } from './processor-service';

annotate Incidents.attachments with @changelog: [filename, uploadedBy, uploadedAt] {
  filename   @changelog @Common.Label: 'File Name';
  uploadedBy @changelog @Common.Label: 'Uploaded By';
  uploadedAt @changelog @Common.Label: 'Uploaded At';
}
