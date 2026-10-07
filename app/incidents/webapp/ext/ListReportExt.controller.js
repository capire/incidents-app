sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
  "use strict";

  // Fiori Elements for OData V4 renders manifest custom actions as text-only sap.m.Buttons
  // and ignores any "icon" in the action config. To match SAP's AI-button design — a leading
  // AI/sparkle glyph before the label (sap-icon://ai) — set the icon on the generated button
  // once it exists. The guard keeps this idempotent across the repeated onAfterRendering calls.
  var AI_ACTION_ID = "fe::table::Incidents::LineItem::CustomAction::SemanticSearch";
  var AI_ICON = "sap-icon://ai";

  return ControllerExtension.extend("ns.incidents.ext.ListReportExt", {
    override: {
      onAfterRendering: function () {
        var oButton = this.base.byId(AI_ACTION_ID);
        if (oButton && oButton.setIcon && oButton.getIcon() !== AI_ICON) {
          oButton.setIcon(AI_ICON);
        }
      }
    }
  });
});
