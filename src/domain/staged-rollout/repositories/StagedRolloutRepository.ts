import { FutureData } from "../../common/entities/Future";
import { ConfigRepository } from "../../config/repositories/ConfigRepository";
import { Instance } from "../../instance/entities/Instance";
import { Lane, StageItem } from "../entities/Lane";

export interface StagedRolloutRepositoryConstructor {
    new (configRepository: ConfigRepository, localInstance: Instance): StagedRolloutRepository;
}

export interface StagedRolloutRepository {
    getLanes(): FutureData<Lane[]>;
    getItems(): FutureData<StageItem[]>;
}
