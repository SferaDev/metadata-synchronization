import { DataPeriodFilter, DataSynchronizationParams } from "../../aggregated/entities/DataSynchronizationParams";
import { UseCase } from "../../common/entities/UseCase";
import { RepositoryFactory } from "../../common/factories/RepositoryFactory";
import { Instance } from "../../instance/entities/Instance";
import { TrackedEntityInstance } from "../entities/TrackedEntityInstance";

export class ListTEIsUseCase implements UseCase {
    constructor(private repositoryFactory: RepositoryFactory, protected localInstance: Instance) { }

    public async execute(
        dataPeriodFilter: DataPeriodFilter,
        params: DataSynchronizationParams,
        programs: string,
        instance: Instance
    ): Promise<TrackedEntityInstance[]> {
        return this.repositoryFactory.teisRepository(instance).getTEIs(dataPeriodFilter, params, programs);
    }
}
