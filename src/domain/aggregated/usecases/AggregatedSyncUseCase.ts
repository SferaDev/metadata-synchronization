import _ from "lodash";
import memoize from "nano-memoize";
import { aggregatedTransformationsToDhis2 } from "../../../data/transformations/PackageTransformations";
import { promiseMap } from "../../../utils/common";
import { mapCategoryOptionCombo, mapOptionValue } from "../../../utils/synchronization";
import { Instance } from "../../instance/entities/Instance";
import { MetadataMappingDictionary } from "../../instance/entities/MetadataMapping";
import {
    CategoryOptionCombo,
    DataElement,
    DataElementGroup,
    DataElementGroupSet,
    DataSet,
    Indicator,
} from "../../metadata/entities/MetadataEntities";
import { GenericSyncUseCase } from "../../synchronization/usecases/GenericSyncUseCase";
import {
    buildMetadataDictionary,
    cleanObjectDefault,
    cleanOrgUnitPath,
} from "../../synchronization/utils";
import { AggregatedPackage } from "../entities/AggregatedPackage";
import { DataValue } from "../entities/DataValue";

export class AggregatedSyncUseCase extends GenericSyncUseCase {
    public readonly type = "aggregated";
    public readonly fields =
        "id,dataElements[id,name],dataSetElements[:all,dataElement[id,name]],dataElementGroups[id,dataElements[id,name]],name";

    public buildPayload = memoize(async () => {
        const { dataParams: { enableAggregation = false } = {} } = this.builder;

        if (enableAggregation) {
            return this.buildAnalyticsPayload();
        } else {
            return this.buildNormalPayload();
        }
    });

    private buildNormalPayload = async () => {
        const { dataParams = {}, excludedIds = [] } = this.builder;

        const { dataSets = [] } = await this.extractMetadata<DataSet>();
        const { dataElementGroups = [] } = await this.extractMetadata<DataElementGroup>();
        const { dataElementGroupSets = [] } = await this.extractMetadata<DataElementGroupSet>();
        const { dataElements = [] } = await this.extractMetadata<DataElement>();

        const dataSetIds = dataSets.map(({ id }) => id);
        const dataElementGroupIds = dataElementGroups.map(({ id }) => id);
        const dataElementGroupSetIds = dataElementGroupSets.map(({ dataElementGroups }) =>
            dataElementGroups.map(({ id }) => id)
        );

        // Retrieve direct data values from dataSets and dataElementGroups
        const {
            dataValues: directDataValues = [],
        } = await this.getAggregatedRepository().getAggregated(
            dataParams,
            dataSetIds,
            _([...dataElementGroupIds, ...dataElementGroupSetIds])
                .flatten()
                .uniq()
                .value()
        );

        // Retrieve candidate data values from dataElements
        const {
            dataValues: candidateDataValues = [],
        } = await this.getAggregatedRepository().getAggregated(
            dataParams,
            dataElements.flatMap(de => de.dataSetElements.map(({ dataSet }) => dataSet?.id)),
            dataElements.flatMap(de => de.dataElementGroups.map(({ id }) => id))
        );

        // Retrieve indirect data values from dataElements
        const indirectDataValues = _.filter(
            candidateDataValues,
            ({ dataElement }) => !!_.find(dataElements, { id: dataElement })
        );

        const dataValues = _([...directDataValues, ...indirectDataValues])
            .uniqWith(_.isEqual)
            .reject(({ dataElement }) => excludedIds.includes(dataElement))
            .value();

        return { dataValues };
    };

    private buildAnalyticsPayload = async () => {
        const { dataParams = {}, excludedIds = [] } = this.builder;

        const { dataSets = [] } = await this.extractMetadata<DataSet>();
        const { dataElementGroups = [] } = await this.extractMetadata<DataElementGroup>();
        const { dataElementGroupSets = [] } = await this.extractMetadata<DataElementGroupSet>();
        const { dataElements = [] } = await this.extractMetadata<DataElement>();
        const { indicators = [] } = await this.extractMetadata<Indicator>();

        const dataElementIds = dataElements.map(({ id }) => id);
        const indicatorIds = indicators.map(({ id }) => id);
        const dataSetIds = _.flatten(
            dataSets.map(({ dataSetElements }) =>
                dataSetElements.map(({ dataElement }) => dataElement.id)
            )
        );
        const dataElementGroupIds = _.flatten(
            dataElementGroups.map(({ dataElements }) => dataElements.map(({ id }) => id))
        );
        const dataElementGroupSetIds = _.flatten(
            dataElementGroupSets.map(({ dataElementGroups }) =>
                _.flatten(
                    dataElementGroups.map(({ dataElements }) => dataElements.map(({ id }) => id))
                )
            )
        );

        const {
            dataValues: dataElementValues = [],
        } = await this.getAggregatedRepository().getAnalytics({
            dataParams,
            dimensionIds: [
                ...dataElementIds,
                ...dataSetIds,
                ...dataElementGroupIds,
                ...dataElementGroupSetIds,
            ],
            includeCategories: true,
        });

        const {
            dataValues: indicatorValues = [],
        } = await this.getAggregatedRepository().getAnalytics({
            dataParams,
            dimensionIds: indicatorIds,
            includeCategories: false,
        });

        const dataValues = _.reject([...dataElementValues, ...indicatorValues], ({ dataElement }) =>
            excludedIds.includes(dataElement)
        );

        return { dataValues };
    };

    public async postPayload(instance: Instance) {
        const { dataParams = {} } = this.builder;

        const payloadPackage = await this.buildPayload();
        const mappedPayloadPackage = await this.mapPayload(instance, payloadPackage);

        if (!instance.apiVersion) {
            throw new Error(
                "Necessary api version of receiver instance to apply transformations to package is undefined"
            );
        }

        const versionedPayloadPackage = this.getTransformationRepository().mapPackageTo(
            instance.apiVersion,
            mappedPayloadPackage,
            aggregatedTransformationsToDhis2
        );
        console.debug("Aggregated package", {
            payloadPackage,
            mappedPayloadPackage,
            versionedPayloadPackage,
        });

        const syncResult = await this.getAggregatedRepository().save(
            versionedPayloadPackage,
            dataParams,
            instance
        );
        return [syncResult];
    }

    public async buildDataStats() {
        const metadataPackage = await this.extractMetadata();
        const dictionary = buildMetadataDictionary(metadataPackage);
        const { dataValues } = await this.buildPayload();

        return _(dataValues)
            .groupBy("dataElement")
            .mapValues((array, dataElement) => ({
                dataElement: dictionary[dataElement]?.name ?? dataElement,
                count: array.length,
            }))
            .values()
            .value();
    }

    public async mapPayload(
        instance: Instance,
        payload: AggregatedPackage
    ): Promise<AggregatedPackage> {
        const { dataValues: oldDataValues } = payload;
        const { metadataMapping: mapping } = instance;

        const defaultIds = await this.getInstanceRepository().getDefaultIds();
        const originCategoryOptionCombos = await this.getInstanceRepository().getCategoryOptionCombos();
        const destinationCategoryOptionCombos = await this.getInstanceRepository(
            instance
        ).getCategoryOptionCombos();
        const instanceAggregatedValues = await this.buildInstanceAggregation(
            mapping,
            destinationCategoryOptionCombos
        );

        const dataValues = _([...instanceAggregatedValues, ...oldDataValues])
            .map(dataValue =>
                this.buildMappedDataValue(
                    dataValue,
                    mapping,
                    originCategoryOptionCombos,
                    destinationCategoryOptionCombos
                )
            )
            .map(dataValue => cleanObjectDefault(dataValue, defaultIds))
            .filter(this.isDisabledDataValue)
            .uniqBy(({ orgUnit, period, dataElement, categoryOptionCombo }) =>
                [orgUnit, period, dataElement, categoryOptionCombo].join("-")
            )
            .value();

        return { dataValues };
    }

    private buildMappedDataValue(
        {
            orgUnit,
            dataElement,
            categoryOptionCombo,
            attributeOptionCombo,
            value,
            comment,
            ...rest
        }: DataValue,
        globalMapping: MetadataMappingDictionary,
        originCategoryOptionCombos: Partial<CategoryOptionCombo>[],
        destinationCategoryOptionCombos: Partial<CategoryOptionCombo>[]
    ): DataValue {
        const { organisationUnits = {}, aggregatedDataElements = {} } = globalMapping;
        const { mapping: innerMapping = {} } = aggregatedDataElements[dataElement] ?? {};

        const mappedOrgUnit = organisationUnits[orgUnit]?.mappedId ?? orgUnit;
        const mappedDataElement = aggregatedDataElements[dataElement]?.mappedId ?? dataElement;
        const mappedValue = mapOptionValue(value, [innerMapping, globalMapping]);
        const mappedComment = mapOptionValue(comment, [innerMapping, globalMapping]);
        const mappedCategory =
            mapCategoryOptionCombo(
                categoryOptionCombo,
                [innerMapping, globalMapping],
                originCategoryOptionCombos,
                destinationCategoryOptionCombos
            ) ?? categoryOptionCombo;
        const mappedAttribute = mapCategoryOptionCombo(
            attributeOptionCombo,
            [innerMapping, globalMapping],
            originCategoryOptionCombos,
            destinationCategoryOptionCombos
        );

        return {
            orgUnit: cleanOrgUnitPath(mappedOrgUnit),
            dataElement: mappedDataElement,
            categoryOptionCombo: mappedCategory,
            attributeOptionCombo: mappedAttribute,
            value: mappedValue,
            comment: comment ? mappedComment : undefined,
            ...rest,
        };
    }

    private isDisabledDataValue(dataValue: DataValue): boolean {
        return !_(dataValue)
            .pick([
                "orgUnit",
                "dataElement",
                "categoryOptionCombo",
                "attributeOptionCombo",
                "value",
            ])
            .values()
            .includes("DISABLED");
    }

    private async buildInstanceAggregation(
        mapping: MetadataMappingDictionary,
        categoryOptionCombos: Partial<CategoryOptionCombo>[]
    ): Promise<DataValue[]> {
        const { dataParams = {} } = this.builder;
        const { enableAggregation = false } = dataParams;
        if (!enableAggregation) return [];

        const result = await promiseMap(
            await this.getAggregatedRepository().getOptions(mapping, categoryOptionCombos),
            async ({ dataElement, categoryOptions, category, mappedOptionCombo }) => {
                const { dataValues } = await this.getAggregatedRepository().getAnalytics({
                    dataParams,
                    dimensionIds: [dataElement],
                    includeCategories: false,
                    filter: [`${category}:${categoryOptions.join(";")}`],
                });

                return dataValues.map(dataValue => ({
                    ...dataValue,
                    categoryOptionCombo: mappedOptionCombo,
                }));
            }
        );

        return _.flatten(result);
    }
}
