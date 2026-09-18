sap.ui.define(
    ["sap/fe/core/AppComponent", "sap/ui/model/json/JSONModel"],
    function (Component, JSONModel) {
        "use strict";

        return Component.extend("ns.incidents.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this, arguments);

                // Expose optional-feature availability to the UI. Semantic search is an
                // opt-in overlay (xmpls/embeddings.cds): its searchIncidents function only
                // appears in the service metadata when the overlay is active. The
                // "Search by Meaning" toolbar action binds its visibility to this flag.
                var oFeatures = new JSONModel({ semanticSearch: false });
                this.setModel(oFeatures, "features");
                this.getModel().getMetaModel()
                    .requestObject("/searchIncidents")
                    .then(function (oFunction) {
                        oFeatures.setProperty("/semanticSearch", !!oFunction);
                    })
                    .catch(function () { /* function not exposed → stays hidden */ });
            }
        });
    }
);
