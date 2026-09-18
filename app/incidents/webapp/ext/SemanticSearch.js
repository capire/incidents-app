sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/routing/HashChanger",
  "sap/m/MessageBox"
], function (JSONModel, HashChanger, MessageBox) {
  "use strict";

  // Handler for the "Search by Meaning" custom action in the Incidents List Report.
  // It calls ProcessorService.searchIncidents(phrase) (from the embeddings xmpl) and shows
  // the ranked incidents — with their cosine-similarity relevance — in a dialog.
  // Registered as a plain custom-action handler, so `this` is the page's Fiori Elements
  // ExtensionAPI when onSearchByMeaning runs.

  var _pDialog; // built lazily, once — there is a single List Report page

  return {
    onSearchByMeaning: function () {
      var oExtensionAPI = this;

      if (!_pDialog) {
        // The dialog's own controls (search field, result rows) delegate back to this
        // controller; it closes over the ExtensionAPI and the dialog instance.
        var oController = {
          formatRelevance: function (fValue) {
            return (fValue == null) ? "" : Number(fValue).toFixed(3);
          },

          onSearchExecute: function (oEvent) {
            var sPhrase = (oEvent.getParameter("query") || "").trim();
            if (!sPhrase) { return; }

            var oDialog = oController._dialog;
            var oResults = oDialog.getModel("search");
            var sServiceUrl = oExtensionAPI.getModel().getServiceUrl();
            // OData string literal: escape single quotes by doubling, then URL-encode.
            var sLiteral = "'" + encodeURIComponent(sPhrase.replace(/'/g, "''")) + "'";

            oDialog.setBusy(true);
            fetch(sServiceUrl + "searchIncidents(phrase=" + sLiteral + ")", { headers: { "Accept": "application/json" } })
              .then(function (oResponse) {
                if (!oResponse.ok) { throw new Error(oResponse.status + " " + oResponse.statusText); }
                return oResponse.json();
              })
              .then(function (oData) {
                oResults.setProperty("/results", oData.value || []);
              })
              .catch(function (oError) {
                oResults.setProperty("/results", []);
                MessageBox.error(
                  "Semantic search is not available.\n\n" +
                  "Activate the embeddings example (uncomment its line in srv/xmpls.cds) and restart.\n\n(" +
                  oError.message + ")"
                );
              })
              .finally(function () { oDialog.setBusy(false); });
          },

          onResultPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext("search").getProperty("ID");
            oController._dialog.close();
            HashChanger.getInstance().setHash("Incidents(ID=" + sId + ",IsActiveEntity=true)");
          },

          onCloseSearch: function () {
            oController._dialog.close();
          }
        };

        _pDialog = oExtensionAPI.loadFragment({
          id: "semanticSearch",
          name: "ns.incidents.ext.SemanticSearchDialog",
          controller: oController
        }).then(function (oDialog) {
          oController._dialog = oDialog;
          oDialog.setModel(new JSONModel({ results: [] }), "search");
          return oDialog;
        });
      }

      _pDialog.then(function (oDialog) { oDialog.open(); });
    }
  };
});
