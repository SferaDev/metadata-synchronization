import { Future, FutureData } from "../../domain/common/entities/Future";
import { Lane, StageItem } from "../../domain/staged-rollout/entities/Lane";
import { StagedRolloutRepository } from "../../domain/staged-rollout/repositories/StagedRolloutRepository";

export class StagedRolloutD2ApiRepository implements StagedRolloutRepository {
    getLanes(): FutureData<Lane[]> {
        return Future.success([
            {
                id: "1",
                name: "Standard process",
                visible: true,
                stages: [
                    {
                        id: "1",
                        name: "DEV",
                        instances: ["DEV", "DEV-CONT"],
                    },
                    {
                        id: "2",
                        name: "PREPROD",
                        instances: ["PREPROD", "PREPROD-CONT"],
                    },
                    {
                        id: "3",
                        name: "PROD",
                        instances: ["PROD", "TRAINING"],
                    },
                ],
            },
            {
                id: "5",
                name: "Fast-track process",
                visible: true,
                stages: [
                    {
                        id: "6",
                        name: "DEV",
                        instances: ["DEV", "DEV-CONT"],
                    },
                    {
                        id: "7",
                        name: "PROD",
                        instances: ["PREPROD", "PREPROD-CONT", "PROD", "TRAINING"],
                    },
                ],
            },
        ]);
    }

    getItems(): FutureData<StageItem[]> {
        return Future.success([
            {
                id: "4",
                name: "MAL Migration 01/11/21",
                content: `{ "dataSets": [] }`,
                stage: "1",
                audits: [],
            },
        ]);
    }
}
