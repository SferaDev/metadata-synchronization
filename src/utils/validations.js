import _ from "lodash";
import i18n from "@dhis2/d2-i18n";

const translations = {
    cannot_be_blank: namespace => i18n.t("Field {{field}} cannot be blank", namespace),
    url_username_combo_already_exists: () =>
        i18n.t("This URL and username combination already exists"),
    cannot_be_empty: () => i18n.t("You need to select at least one element"),
};

export async function getValidationMessages(d2, model, validationKeys) {
    const validationObj = await model.validate(d2);

    return _(validationObj)
        .at(validationKeys)
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
