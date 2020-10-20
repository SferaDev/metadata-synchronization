import { useSnackbar } from "d2-ui-components";
import _ from "lodash";
import React, { ReactNode, useEffect, useState } from "react";
import { ListPackage } from "../../../../../domain/packages/entities/Package";
import i18n from "../../../../../locales";
import { isGlobalAdmin } from "../../../../../utils/permissions";
import { useAppContext } from "../../../contexts/AppContext";
import { PackageImportWizardProps } from "../PackageImportWizard";

export const SummaryStep: React.FC<PackageImportWizardProps> = ({ packageImportRule }) => {
    const { api, compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const packageList = compositionRoot.packages.list;

    const [globalAdmin, setGlobalAdmin] = useState(false);
    const [instancePackages, setInstancePackages] = useState<ListPackage[]>([]);
    //const [storePackages, setStorePackages] = useState<ListPackage[]>([]);

    useEffect(() => {
        isGlobalAdmin(api).then(setGlobalAdmin);
    }, [api]);

    useEffect(() => {
        packageList(globalAdmin, packageImportRule.instance)
            .then(setInstancePackages)
            .catch((error: Error) => {
                snackbar.error(error.message);
                setInstancePackages([]);
            });
    }, [packageList, packageImportRule, globalAdmin, snackbar]);

    return (
        <React.Fragment>
            <ul>
                <LiEntry label={i18n.t("Instance")} value={packageImportRule.instance.name} />
                <LiEntry label={i18n.t("Packages")}>
                    <ul>
                        {packageImportRule.packageIds.map(id => {
                            const instancePackage = instancePackages.find(pkg => pkg.id === id);
                            return <LiEntry key={id} label={`${instancePackage?.name} (${id})`} />;
                        })}
                    </ul>
                </LiEntry>
            </ul>
        </React.Fragment>
    );
};

interface Entry {
    label: string;
    value?: string | number;
    children?: ReactNode;
    hide?: boolean;
}

const LiEntry = ({ label, value, children, hide = false }: Entry) => {
    if (hide) return null;

    return (
        <li key={label}>
            {_.compact([label, value]).join(": ")}
            {children}
        </li>
    );
};
