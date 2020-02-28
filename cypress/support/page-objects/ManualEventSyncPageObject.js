import { dataTest } from "../utils";
import ManualSyncPageObject from "./common/ManualSyncPageObject";

class ManualEventSyncPageObject extends ManualSyncPageObject {
    constructor(cy) {
        super(cy, "events");
    }

    open() {
        super.open("/#/sync/events");
        return this;
    }

    expandOrgUnit(orgUnit) {
        this.cy
            .get(dataTest("DialogContent-events-synchronization"))
            .contains(orgUnit)
            .parent()
            .parent()
            .contains("▸")
            .click();
        return this;
    }

    selectEvent(event) {
        this.cy
            .get(dataTest("DialogContent-events-synchronization"))
            .contains(event)
            .parent()
            .click();
        return this;
    }

    synchronize() {
        this.cy
            .route({
                method: "POST",
                url: "/api/events*",
            })
            .as("postEvent");

        this.syncButton.click();
        this.cy.wait("@postEvent");
        return this;
    }
}

export default ManualEventSyncPageObject;
