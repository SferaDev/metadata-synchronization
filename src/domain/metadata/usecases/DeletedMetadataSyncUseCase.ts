import memoize from "nano-memoize";
import Instance from "../../../models/instance";
import { D2 } from "../../../types/d2";
import { D2Api } from "../../../types/d2-api";
import { SynchronizationBuilder } from "../../../types/synchronization";
import { Ref } from "../../common/entities/Ref";
import InstanceEntity from "../../instance/entities/Instance";
import InstanceRepository from "../../instance/repositories/InstanceRepository";
import {
    GenericSyncUseCase,
    SyncronizationPayload,
} from "../../synchronization/usecases/GenericSyncUseCase";
import { MetadataRepository } from "../repositories/MetadataRepository";

export class DeletedMetadataSyncUseCase extends GenericSyncUseCase {
    public readonly type = "deleted";

    constructor(
        d2: D2,
        api: D2Api,
        builder: SynchronizationBuilder,
        instance: InstanceRepository,
        private metadataRepository: MetadataRepository
    ) {
        super(d2, api, builder, instance);
    }

    public buildPayload = memoize(async () => {
        return {};
    });

    public async postPayload(instance: Instance, instanceEntity: InstanceEntity) {
        //TODO: remove instance from abstract method in base base class
        // when aggregated and events does not use
        console.log(instance.url);

        const { metadataIds, syncParams = {} } = this.builder;

        const payloadPackage = await this.metadataRepository.getMetadataFieldsByIds<Ref>(
            metadataIds,
            "id",
            instanceEntity
        );

        console.debug("Metadata package", payloadPackage);

        const syncResult = await this.metadataRepository.remove(
            payloadPackage,
            syncParams,
            instanceEntity
        );

        return [syncResult];
    }

    public async buildDataStats() {
        return undefined;
    }

    public async mapPayload(
        _instance: Instance,
        payload: SyncronizationPayload
    ): Promise<SyncronizationPayload> {
        return payload;
    }
}
