import {
    DataImportParams,
    DataPeriodFilter,
    DataSynchronizationParams,
} from "../../aggregated/entities/DataSynchronizationParams";
import { Instance } from "../../instance/entities/Instance";
import { SynchronizationResult } from "../../reports/entities/SynchronizationResult";
import { TEIsPackage } from "../entities/TEIsPackage";
import { TrackedEntityInstance } from "../entities/TrackedEntityInstance";

export interface TEIRepositoryConstructor {
    new(instance: Instance): TEIRepository;
}

export interface TEIRepository {
    getTEIs(dataPeriodFilter: DataPeriodFilter, params: DataSynchronizationParams, program: string): Promise<TrackedEntityInstance[]>;
    getTEIsById(params: DataSynchronizationParams, ids: string[]): Promise<TrackedEntityInstance[]>;

    save(
        data: TEIsPackage,
        additionalParams: DataImportParams | undefined
    ): Promise<SynchronizationResult>;
}
