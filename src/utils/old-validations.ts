import i18n from "@dhis2/d2-i18n";
import _ from "lodash";
import SyncRule from "../models/syncRule";
import { D2Api } from "../types/d2-api";

// TODO: This should be migrated to use the new ValidationError[]
export interface OldValidation {
    [key: string]: {
        key: string;
        namespace: object;
    }[];
}

// TODO: This should be migrated to use the new ValidationError[]
const translations: { [key: string]: (namespace: object) => string } = {
    cannot_be_blank: (namespace: object) => i18n.t("Field {{field}} cannot be blank", namespace),
    url_username_combo_already_exists: () =>
        i18n.t("This URL and username combination already exists"),
    cannot_be_empty: (namespace: object) =>
        i18n.t("You need to select at least one {{element}}", namespace),
    cron_expression_must_be_valid: (namespace: object) =>
        i18n.t("Cron expression {{expression}} must be valid", namespace),
    cannot_enable_without_valid: (namespace: object) =>
        i18n.t("To enable a rule you need to enter a valid {{expression}}", namespace),
    invalid_period: () => i18n.t("Start and end dates are not a valid period"),
};

// TODO: This should be migrated to use the new ValidationError[]
export async function getValidationMessages(
    _api: D2Api,
    model: SyncRule,
    validationKeys: string[] | null = null
) {
    const validationObj = await model.validate();

    return _(validationObj)
        .at(validationKeys || _.keys(validationObj))
        .flatten()
        .compact()
        .map(error => {
            const translation = translations[error.key];
            if (translation) {
                return i18n.t(translation(error.namespace));
            } else {
                return `Missing translations: ${error.key}`;
            }
        })
        .value();
}
