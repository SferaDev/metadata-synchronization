import { dataTest } from "../../utils";
import PageObject from "./PageObject";

export default class SyncRuleDetailPageObject extends PageObject {
    constructor(cy, key) {
        super(cy);
        this.key = key;
    }

    assertName(assert) {
        assert(this.cy.get(dataTest("name")));
        return this;
    }

    assertCode(assert) {
        assert(this.cy.get(dataTest("code")));
        return this;
    }

    assertDescription(assert) {
        assert(this.cy.get(dataTest("description")));
        return this;
    }

    typeName(text) {
        this.cy
            .get(dataTest("name"))
            .type(text)
            .blur();
        return this;
    }

    typeCode(text) {
        this.cy
            .get(dataTest("code"))
            .type(text)
            .blur();
        return this;
    }

    typeDescription(text) {
        this.cy
            .get(dataTest("description"))
            .type(text)
            .blur();
        return this;
    }

    selectRow(text) {
        this.cy.selectRowInTableByText(text);
        return this;
    }

    next() {
        this.cy.get('[data-test="Button-next-→"]').click();
        return this;
    }

    selectReceiverInstance(instance) {
        this.cy.selectInMultiSelector(dataTest(`Paper`), instance);
        return this;
    }

    assertSelectedInstances(assert) {
        assert(this.cy.get("select:last"));
        return this;
    }

    save() {
        this.cy
            .route({
                method: "PUT",
                url: "/api/dataStore/metadata-synchronization/rules",
            })
            .as("save");

        this.cy.contains("Save").click();

        return this;
    }

    assertSave() {
        this.cy.wait("@save").then(xhr => {
            debugger;
            assert.equal(xhr.response.body.httpStatusCode, 200);
        });

        return this;
    }
}
