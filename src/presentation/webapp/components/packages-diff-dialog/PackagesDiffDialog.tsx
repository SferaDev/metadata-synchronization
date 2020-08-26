import { LinearProgress, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { useSnackbar } from "d2-ui-components";
import { ConfirmationDialog } from "d2-ui-components/confirmation-dialog/ConfirmationDialog";
import _ from "lodash";
import React from "react";
import { NamedRef } from "../../../../domain/common/entities/Ref";
import { Instance } from "../../../../domain/instance/entities/Instance";
import {
    MetadataPackageDiff,
    ModelDiff,
    ObjUpdate,
} from "../../../../domain/packages/entities/MetadataPackageDiff";
import i18n from "../../../../locales";
import { useAppContext } from "../../../common/contexts/AppContext";
import SyncSummary from "../sync-summary/SyncSummary";
import { getShortChange, getTitle, usePackageImporter } from "./utils";

export interface PackagesDiffDialogProps {
    onClose(): void;
    remoteInstance?: Instance;
    isStorePackage: boolean;
    remotePackage: NamedRef;
}

export type PackageToDiff = { id: string; name: string };

export const PackagesDiffDialog: React.FC<PackagesDiffDialogProps> = props => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [metadataDiff, setMetadataDiff] = React.useState<MetadataPackageDiff>();
    const { remotePackage, isStorePackage, remoteInstance, onClose } = props;

    React.useEffect(() => {
        compositionRoot.packages
            .diff(isStorePackage, remotePackage.id, remoteInstance)
            .then(res => {
                res.match({
                    error: msg => {
                        snackbar.error(i18n.t("Cannot get data from remote instance") + ": " + msg);
                        onClose();
                    },
                    success: setMetadataDiff,
                });
            });
    }, [compositionRoot, remotePackage, isStorePackage, remoteInstance, onClose, snackbar]);

    const hasChanges = metadataDiff && metadataDiff.hasChanges;
    const packageName = `${remotePackage.name} (${remoteInstance?.name ?? "Store"})`;
    const { importPackage, syncReport, closeSyncReport } = usePackageImporter(
        remoteInstance,
        packageName,
        metadataDiff,
        onClose
    );

    return (
        <React.Fragment>
            <ConfirmationDialog
                isOpen={true}
                title={getTitle(packageName, metadataDiff)}
                maxWidth="lg"
                fullWidth={true}
                onCancel={onClose}
                onSave={hasChanges ? importPackage : undefined}
                cancelText={i18n.t("Close")}
                saveText={i18n.t("Import")}
            >
                {metadataDiff ? (
                    <MetadataDiffTable metadataDiff={metadataDiff.changes} />
                ) : (
                    <LinearProgress />
                )}
            </ConfirmationDialog>

            {!!syncReport && <SyncSummary response={syncReport} onClose={closeSyncReport} />}
        </React.Fragment>
    );
};

export const MetadataDiffTable: React.FC<{
    metadataDiff: MetadataPackageDiff["changes"];
}> = props => {
    const { metadataDiff } = props;
    const classes = useStyles();

    return (
        <ul>
            {_.map(metadataDiff, (modelDiff, model) => (
                <li key={model}>
                    <h3 className={classes.modelTitle}>{model}</h3>: {modelDiff.total}{" "}
                    {i18n.t("objects")} ({i18n.t("Unmodified")}: {modelDiff.unmodified.length})
                    <ul>
                        <ModelDiffList modelDiff={modelDiff} />
                    </ul>
                </li>
            ))}
        </ul>
    );
};

export const ModelDiffList: React.FC<{ modelDiff: ModelDiff }> = props => {
    const { modelDiff: diff } = props;
    const classes = useStyles();

    return (
        <React.Fragment>
            {diff.created.length > 0 && (
                <li>
                    <span className={classes.added}>
                        {i18n.t("New")}: {diff.created.length}
                    </span>

                    <List
                        items={diff.created.map(obj => (
                            <li key={obj.id}>
                                [{obj.id}] {obj.name}
                            </li>
                        ))}
                    />
                </li>
            )}

            {diff.updates.length > 0 && (
                <li>
                    <span className={classes.updated}>
                        {i18n.t("Updated")}: {diff.updates.length}
                    </span>

                    <List
                        items={diff.updates.map(update => (
                            <ObjectInfo
                                key={update.obj.id}
                                update={update}
                                onViewMore={console.log}
                            />
                        ))}
                    />
                </li>
            )}
        </React.Fragment>
    );
};

interface ObjectInfoProps {
    update: ObjUpdate;
    onViewMore: (object: ObjUpdate) => void;
}

export const ObjectInfo: React.FC<ObjectInfoProps> = props => {
    const { update, onViewMore } = props;
    const showFullInfo = React.useCallback(() => {
        onViewMore(update);
    }, [onViewMore, update]);
    const { obj: object } = update;

    const items = update.fieldsUpdated.map(getShortChange);
    const isAnyTruncated = _(items).some(item => item.isTruncated);

    return (
        <React.Fragment>
            [{object.id}] {object.name}
            {isAnyTruncated && <Button onClick={showFullInfo}>{i18n.t("View more")}</Button>}
            <List items={items.map(item => item.message)} />
        </React.Fragment>
    );
};

export const List: React.FC<{ items: React.ReactNode[] }> = props => {
    const { items } = props;
    return (
        <ul>
            {items.map((item, idx) => (
                <li key={idx}>{item}</li>
            ))}
        </ul>
    );
};

const useStyles = makeStyles({
    modelTitle: { display: "inline" },
    added: { color: "green" },
    updated: { color: "orange" },
});
