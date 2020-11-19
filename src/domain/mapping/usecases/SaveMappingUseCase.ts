import { Either } from "../../common/entities/Either";
import { UseCase } from "../../common/entities/UseCase";
import { Instance, InstanceData } from "../../instance/entities/Instance";
import { Namespace } from "../../storage/Namespaces";
import { StorageRepository } from "../../storage/repositories/StorageRepository";
import { DataSourceMapping } from "../entities/DataSourceMapping";
import { isMappingOwnerStore } from "../entities/MappingOwner";

export type SaveMappingError = "UNEXPECTED_ERROR" | "INSTANCE_NOT_FOUND";

export class SaveMappingUseCase implements UseCase {
    constructor(private storageRepository: StorageRepository, private localInstance: Instance) { }

    public async execute(mapping: DataSourceMapping): Promise<Either<SaveMappingError, void>> {
        if (isMappingOwnerStore(mapping.owner)) {
            await this.storageRepository.saveObjectInCollection(
                Namespace.MAPPINGS,
                mapping.toObject()
            );

            return Either.success(undefined);
        } else {

            const instanceResult = await this.getInstance(mapping.owner.id);

            return await instanceResult.match({
                error: async (error) => Either.error(error),
                success: async instance => {
                    const updatedInstance = instance.update({
                        metadataMapping: mapping.mappingDictionary,
                    });

                    await this.storageRepository.saveObjectInCollection(
                        Namespace.INSTANCES,
                        updatedInstance.toObject()
                    );

                    return Either.success(undefined);
                }
            });
        }
    }

    private async getInstance(id: string): Promise<Either<"INSTANCE_NOT_FOUND", Instance>> {
        if (id == "LOCAL") {
            return Either.success(this.localInstance);
        } else {
            const rawInstance = await this.storageRepository.getObjectInCollection<InstanceData>(
                Namespace.INSTANCES,
                id
            );

            if (!rawInstance) {
                return Either.error("INSTANCE_NOT_FOUND");
            } else {
                return Either.success(Instance.build({ ...rawInstance }));
            }
        }
    }
}
