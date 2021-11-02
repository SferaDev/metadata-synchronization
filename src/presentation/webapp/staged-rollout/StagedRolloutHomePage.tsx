import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useEffect, useState } from "react";
import { Lane, StageItem } from "../../../domain/staged-rollout/entities/Lane";
import i18n from "../../../types/i18n";
import PageHeader from "../../react/core/components/page-header/PageHeader";
import { useAppContext } from "../../react/core/contexts/AppContext";

export const StagedRolloutHomePage: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [lanes, setLanes] = useState<Lane[]>([]);
    const [items, setItems] = useState<StageItem[]>([]);

    useEffect(() => {
        compositionRoot.stagedRollouts.get().run(
            ({ lanes, items }) => {
                setLanes(lanes);
                setItems(items);
            },
            error => snackbar.error(error)
        );
    }, [compositionRoot, snackbar]);

    console.log(lanes, items);

    return (
        <React.Fragment>
            <PageHeader title={i18n.t("MDSync Staged Rollout")} />
        </React.Fragment>
    );
};
