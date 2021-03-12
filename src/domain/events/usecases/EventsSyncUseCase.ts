import { generateUid } from "d2/uid";
import _ from "lodash";
import memoize from "nano-memoize";
import { D2Program } from "../../../types/d2-api";
import { debug } from "../../../utils/debug";
import {
    mapCategoryOptionCombo,
    mapOptionValue,
    mapProgramDataElement,
} from "../../../utils/synchronization";
import { DataValue } from "../../aggregated/entities/DataValue";
import { AggregatedSyncUseCase } from "../../aggregated/usecases/AggregatedSyncUseCase";
import { Instance } from "../../instance/entities/Instance";
import { MetadataMappingDictionary } from "../../mapping/entities/MetadataMapping";
import { CategoryOptionCombo, Program } from "../../metadata/entities/MetadataEntities";
import { SynchronizationResult } from "../../reports/entities/SynchronizationResult";
import { SynchronizationPayload } from "../../synchronization/entities/SynchronizationPayload";
import { GenericSyncUseCase } from "../../synchronization/usecases/GenericSyncUseCase";
import { buildMetadataDictionary, cleanOrgUnitPath } from "../../synchronization/utils";
import { TrackedEntityInstance } from "../../tracked-entity-instances/entities/TrackedEntityInstance";
import { EventsPackage } from "../entities/EventsPackage";
import { ProgramEvent } from "../entities/ProgramEvent";
import { ProgramEventDataValue } from "../entities/ProgramEventDataValue";

export class EventsSyncUseCase extends GenericSyncUseCase {
    public readonly type = "events";
    public readonly fields =
        "id,name,programType,programStages[id,displayFormName,programStageDataElements[dataElement[id,displayFormName,name]]],programIndicators[id,name],program";

    public buildPayload = memoize(async () => {
        const { dataParams = {}, excludedIds = [] } = this.builder;
        const { enableAggregation = false } = dataParams;
        const eventsRepository = await this.getEventsRepository();
        const aggregatedRepository = await this.getAggregatedRepository();
        const teisRepository = await this.getTeisRepository();

        const {
            programs = [],
            programIndicators = [],
            programStages = [],
        } = await this.extractMetadata();

        const stageIdsFromPrograms = programs
            ? (programs as Program[])
                  .map(program => program.programStages.map(({ id }) => id))
                  .flat()
            : [];

        const progamStageIds = [...programStages.map(({ id }) => id), ...stageIdsFromPrograms];

        const events = (
            await eventsRepository.getEvents(dataParams, [...new Set(progamStageIds)])
        ).map(event => {
            return dataParams.generateNewUid ? { ...event, event: generateUid() } : event;
        });

        const trackedEntityInstances = dataParams.teis
            ? await teisRepository.getTEIsById(dataParams, dataParams.teis)
            : [];

        const directIndicators = programIndicators.map(({ id }) => id);
        const indicatorsByProgram = _.flatten(
            programs?.map(
                ({ programIndicators }: Partial<D2Program>) =>
                    programIndicators?.map(({ id }) => id) ?? []
            )
        );

        const { dataValues: candidateDataValues = [] } = enableAggregation
            ? await aggregatedRepository.getAnalytics({
                  dataParams,
                  dimensionIds: [...directIndicators, ...indicatorsByProgram],
                  includeCategories: false,
              })
            : {};

        const dataValues = _.reject(candidateDataValues, ({ dataElement }) =>
            excludedIds.includes(dataElement)
        );

        return { events, dataValues, trackedEntityInstances };
    });

    public async postPayload(instance: Instance): Promise<SynchronizationResult[]> {
        const { events, dataValues, trackedEntityInstances } = await this.buildPayload();

        const teisResponse =
            trackedEntityInstances && trackedEntityInstances.length > 0
                ? await this.postTEIsPayload(instance, trackedEntityInstances)
                : undefined;

        const eventsResponse = await this.postEventsPayload(instance, events);
        const indicatorsResponse = await this.postIndicatorPayload(instance, dataValues);

        return _.compact([eventsResponse, indicatorsResponse, teisResponse]);
    }

    private async postEventsPayload(
        instance: Instance,
        events: ProgramEvent[]
    ): Promise<SynchronizationResult> {
        const { dataParams = {} } = this.builder;

        const payload = await this.mapPayload(instance, { events });
        debug("Events package", { events, payload });

        const eventsRepository = await this.getEventsRepository(instance);
        const syncResult = await eventsRepository.save(payload, dataParams);
        const origin = await this.getOriginInstance();

        return { ...syncResult, origin: origin.toPublicObject(), payload };
    }

    private async postTEIsPayload(
        instance: Instance,
        trackedEntityInstances: TrackedEntityInstance[]
    ): Promise<SynchronizationResult> {
        const { dataParams = {} } = this.builder;
        const { excludeTeiRelationships = false } = dataParams;

        const teis = excludeTeiRelationships
            ? trackedEntityInstances.map(tei => ({ ...tei, relationships: [] }))
            : trackedEntityInstances;

        const payload = { trackedEntityInstances: teis }; //await this.mapPayload(instance, { events });
        debug("TEIS package", { trackedEntityInstances }); //, payload });

        const teisRepository = await this.getTeisRepository(instance);
        const syncResult = await teisRepository.save(payload, dataParams);
        const origin = await this.getOriginInstance();

        return { ...syncResult, origin: origin.toPublicObject(), payload };
    }

    private async postIndicatorPayload(
        instance: Instance,
        dataValues: DataValue[]
    ): Promise<SynchronizationResult | undefined> {
        const { dataParams = {} } = this.builder;
        const { enableAggregation } = dataParams;
        if (!enableAggregation) return undefined;

        // TODO: This is an external action and should be called by user
        const aggregatedSync = new AggregatedSyncUseCase(
            this.builder,
            this.repositoryFactory,
            this.localInstance,
            this.encryptionKey
        );

        const mappedPayload = await aggregatedSync.mapPayload(instance, { dataValues });

        const existingPayload = dataParams.ignoreDuplicateExistingValues
            ? await aggregatedSync.mapPayload(instance, await aggregatedSync.buildPayload(instance))
            : { dataValues: [] };

        const payload = aggregatedSync.filterPayload(mappedPayload, existingPayload);
        debug("Program indicator package", {
            originalPayload: { dataValues },
            mappedPayload,
            existingPayload,
            payload,
        });

        const aggregatedRepository = await this.getAggregatedRepository(instance);
        const syncResult = await aggregatedRepository.save(payload, dataParams);
        const origin = await this.getOriginInstance();

        return { ...syncResult, origin: origin.toPublicObject(), payload };
    }

    public async buildDataStats() {
        const metadataPackage = await this.extractMetadata();
        const dictionary = buildMetadataDictionary(metadataPackage);
        const { events } = (await this.buildPayload()) as EventsPackage;

        return _(events)
            .groupBy("program")
            .mapValues((array, program) => ({
                program: dictionary[program]?.name ?? program,
                count: array.length,
                orgUnits: _.uniq(array.map(({ orgUnit, orgUnitName }) => orgUnitName ?? orgUnit)),
            }))
            .values()
            .value();
    }

    public async mapPayload(
        instance: Instance,
        { events: oldEvents }: EventsPackage
    ): Promise<SynchronizationPayload> {
        const metadataRepository = await this.getMetadataRepository();
        const remoteMetadataRepository = await this.getMetadataRepository(instance);

        const originCategoryOptionCombos = await metadataRepository.getCategoryOptionCombos();
        const destinationCategoryOptionCombos = await remoteMetadataRepository.getCategoryOptionCombos();
        const defaultCategoryOptionCombos = await metadataRepository.getDefaultIds(
            "categoryOptionCombos"
        );

        const mapping = await this.getMapping(instance);
        const events = oldEvents
            .map(dataValue =>
                this.buildMappedDataValue(
                    dataValue,
                    mapping,
                    originCategoryOptionCombos,
                    destinationCategoryOptionCombos,
                    defaultCategoryOptionCombos[0]
                )
            )
            .filter(this.isDisabledEvent);

        return { events };
    }

    private buildMappedDataValue(
        { orgUnit, program, programStage, dataValues, attributeOptionCombo, ...rest }: ProgramEvent,
        globalMapping: MetadataMappingDictionary,
        originCategoryOptionCombos: Partial<CategoryOptionCombo>[],
        destinationCategoryOptionCombos: Partial<CategoryOptionCombo>[],
        defaultCategoryOptionCombo: string
    ): ProgramEvent {
        const { organisationUnits = {}, eventPrograms = {} } = globalMapping;
        const { mappedId: mappedProgram = program, mapping: innerMapping = {} } =
            eventPrograms[program] ?? {};
        const { programStages = {} } = innerMapping;
        const mappedOrgUnit = organisationUnits[orgUnit]?.mappedId ?? orgUnit;
        const mappedProgramStage = programStages[programStage]?.mappedId ?? programStage;
        const mappedCategory = mapCategoryOptionCombo(
            attributeOptionCombo ?? defaultCategoryOptionCombo,
            [innerMapping, globalMapping],
            originCategoryOptionCombos,
            destinationCategoryOptionCombos
        );

        return _.omit(
            {
                orgUnit: cleanOrgUnitPath(mappedOrgUnit),
                program: mappedProgram,
                programStage: mappedProgramStage,
                attributeOptionCombo: mappedCategory,
                dataValues: dataValues
                    .map(({ dataElement, value, ...rest }) => {
                        const {
                            mappedId: mappedDataElement = dataElement,
                            mapping: dataElementMapping = {},
                        } = mapProgramDataElement(
                            program,
                            programStage,
                            dataElement,
                            globalMapping
                        );

                        const mappedValue = mapOptionValue(value, [
                            dataElementMapping,
                            globalMapping,
                        ]);

                        return {
                            dataElement: mappedDataElement,
                            value: mappedValue,
                            ...rest,
                        };
                    })
                    .filter(this.isDisabledEvent),
                ...rest,
            },
            ["orgUnitName", "attributeCategoryOptions"]
        );
    }

    private isDisabledEvent(event: ProgramEvent | ProgramEventDataValue): boolean {
        return !_(event)
            .pick(["orgUnit", "attributeOptionCombo", "dataElement", "value"])
            .values()
            .includes("DISABLED");
    }
}
