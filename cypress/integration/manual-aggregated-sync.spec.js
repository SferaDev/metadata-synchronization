import ManualAggregateSyncPageObject from "../pageobjects/ManualAggregateSyncPageObject";

/**
 * Database: d2-docker-eyeseetea-2-30-datasync-sender
 */
context("Manual aggregated sync", function() {
    const page = new ManualAggregateSyncPageObject(cy);

    const inputs = {
        orgUnit: "Ghana",
        instance: "Y5QsHDoD4I0",
        dataSet: "Malaria annual data",
    };

    beforeEach(() => {
        page.open();
    });

    it("should have the correct title", function() {
        page.title.contains("Aggregated Data Synchronization");
    });

    it("should syncs correctly malaria annual data", function() {
        page.search(inputs.dataSet)
            .selectRow(inputs.dataSet)
            .openSyncDialog()

            .selectOrgUnit(inputs.orgUnit)
            .next()

            .selectAllPeriods()
            .next()

            .selectAllAttributesCategoryOptions()
            .next()

            .selectReceiverInstance(inputs.instance)
            .synchronize()

            .syncResults.contains("Success");

        page.closeSyncResultsDialog();
    });

    it("should show the org unit step error if user try click on next without selecting the org unit", function() {
        page.search(inputs.dataSet)
            .selectRow(inputs.dataSet)
            .openSyncDialog()
            .next()

            .error.contains("You need to select at least one organisation unit");
    });

    it("should show the instance selection step error if user try click on next without selecting an instance", function() {
        page.search(inputs.dataSet)
            .selectRow(inputs.dataSet)
            .openSyncDialog()

            .selectOrgUnit(inputs.orgUnit)
            .next()

            .selectAllPeriods()
            .next()

            .selectAllAttributesCategoryOptions()
            .next()

            .next()

            .error.contains("You need to select at least one instance");
    });

    it("should have synchronize button disabled to open sync dialog", function() {
        page.search(inputs.dataSet)
            .selectRow(inputs.dataSet)
            .openSyncDialog()
            .syncButton.should("be.disabled");
    });

    it("should have synchronize button disabled if only contains org unit", function() {
        page.search(inputs.dataSet)
            .selectRow(inputs.dataSet)
            .openSyncDialog()

            .selectOrgUnit(inputs.orgUnit)
            .next()

            .syncButton.should("be.disabled");
    });

    it("should have synchronize button disabled if only contains org unit and periods", function() {
        page.search(inputs.dataSet)
            .selectRow(inputs.dataSet)
            .openSyncDialog()

            .selectOrgUnit(inputs.orgUnit)
            .next()

            .selectAllPeriods()
            .next()

            .syncButton.should("be.disabled");
    });

    it("should have synchronize button disabled if only contains org unit, periods and category options", function() {
        page.search(inputs.dataSet)
            .selectRow(inputs.dataSet)
            .openSyncDialog()

            .selectOrgUnit(inputs.orgUnit)
            .next()

            .selectAllPeriods()
            .next()

            .selectAllAttributesCategoryOptions()
            .next()

            .syncButton.should("be.disabled");
    });

    it("should have synchronize button enabled if contains org unit, periods, category options and one instance", function() {
        page.search(inputs.dataSet)
            .selectRow(inputs.dataSet)
            .openSyncDialog()

            .selectOrgUnit(inputs.orgUnit)
            .next()

            .selectAllPeriods()
            .next()

            .selectAllAttributesCategoryOptions()
            .next()

            .selectReceiverInstance(inputs.instance)
            .syncButton.should("not.be.disabled");
    });
});
