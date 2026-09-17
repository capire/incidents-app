# CAP Plugins

Plugins can be activated and added to a CAP application easily.
For convenience, we have prepared samples for adding theses plugins to incidents management.
Run the commands below from the root folder of the `incidents-app` project or simply drag and drop the files and install the dependency.

## Change Tracking

Install the dependency and copy the file `change-tracking.cds` to the `srv` folder of incidents-app.

```sh
npm add @cap-js/change-tracking
cp xmpls/change-tracking.cds ./srv
```

## Telemetry

Install the dependency.

```sh
npm add @cap-js/telemetry
```

## Attachments

Install the dependency and copy the file `attachments.cds` to the `srv` folder of incidents-app.

```sh
npm add @cap-js/attachments 
cp xmpls/attachments.cds ./srv
```

## Alert Notifications

Install the dependency and copy the files `alert-notifications.js` and `notification-types.json` to the `srv` folder of incidents-app.

```sh
npm add @cap-js/notifications
cp xmpls/alert-notifications.js ./srv
cp xmpls/notification-types.json ./srv
```

## Audit Log

Install the dependency and copy the file `data-privacy.cds` to the `srv` folder of incidents-app.

```sh
npm add @cap-js/audit-logging
cp xmpls/data-privacy.cds ./srv
```

## Semantic Search

Local similarity search over incidents (title + conversation) via `@cap-js/ai`'s ONNX
embeddings — runs fully offline on SQLite, no SAP AI Core needed. Install the dependencies,
then activate by uncommenting the `embeddings` line in `srv/xmpls.cds`:

```sh
npm add @cap-js/ai @huggingface/hub@^2.15.0 @huggingface/tokenizers@0.1.3 onnxruntime-node@1.20.1
```

```cds
// srv/xmpls.cds
using from '../xmpls/embeddings';   // uncomment this line
```

The first `cds watch` downloads the embedding model (~90 MB) into `.cds/models`. Then call
`GET /odata/v4/processor/searchIncidents(phrase='inverter problem')`. See `test/embeddings.http`.

# Other Examples

## Remote Service Consumption

Copy all files from the `remote-service` folder into the main project.
Overwrite existing files.

## Messaging

Copy all files from the `messaging` folder into the main project.
Overwrite existing files.