import { Future, FutureData } from "../../common/entities/Future";
import { UseCase } from "../../common/entities/UseCase";
import { RepositoryFactory } from "../../common/factories/RepositoryFactory";
import { Instance } from "../../instance/entities/Instance";
import { Lane, StageItem } from "../entities/Lane";

export class GetStagedRolloutsUseCase implements UseCase {
    constructor(private repositoryFactory: RepositoryFactory, private localInstance: Instance) {}

    public execute(): FutureData<{ lanes: Lane[]; items: StageItem[] }> {
        const repository = this.repositoryFactory.stagedRolloutRepository(this.localInstance);

        return Future.joinObj({
            lanes: repository.getLanes(),
            items: repository.getItems(),
        });
    }
}
