import i18n from "@dhis2/d2-i18n";
import { useD2Api } from "d2-api";
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import MappingTable from "../../components/mapping-table/MappingTable";
import PageHeader from "../../components/page-header/PageHeader";
import {
    AggregatedDataElementModel,
    OrganisationUnitModel,
    ProgramDataElementModel,
} from "../../models/d2Model";
import Instance, { MetadataMappingDictionary } from "../../models/instance";

export type MappingType = "aggregated" | "tracker" | "orgUnit";

const config = {
    aggregated: {
        title: i18n.t("Aggregated metadata mapping"),
        models: [AggregatedDataElementModel],
    },
    tracker: {
        title: i18n.t("Tracker metadata mapping"),
        models: [ProgramDataElementModel],
    },
    orgUnit: {
        title: i18n.t("Organisation unit metadata mapping"),
        models: [OrganisationUnitModel],
    },
};

interface InstanceMappingParams {
    id: string;
    section: MappingType;
}

export default function InstanceMappingPage() {
    const history = useHistory();
    const api = useD2Api();

    const { id, section } = useParams() as InstanceMappingParams;
    const { models, title } = config[section];

    const [instance, setInstance] = useState<Instance>();

    useEffect(() => {
        Instance.get(api, id).then(setInstance);
    }, [api, id]);

    const backHome = () => {
        history.push(`/instances/mapping/${id}`);
    };

    const onChangeMapping = async (mapping: MetadataMappingDictionary) => {
        if (!instance) return;

        const newInstance = instance.setMetadataMapping(mapping);
        await newInstance.save(api);
        setInstance(newInstance);
    };

    return (
        <React.Fragment>
            <PageHeader title={title} onBackClick={backHome} />

            {!!instance && (
                <MappingTable
                    models={models}
                    instance={instance}
                    mapping={instance.metadataMapping}
                    onChangeMapping={onChangeMapping}
                />
            )}
        </React.Fragment>
    );
}
