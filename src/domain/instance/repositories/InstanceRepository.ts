import { D2Api } from "../../../types/d2-api";
import { ConfigRepository } from "../../config/repositories/ConfigRepository";
import { OrganisationUnit } from "../../metadata/entities/MetadataEntities";
import { Instance } from "../entities/Instance";
import { InstanceMessage } from "../entities/Message";
import { User } from "../entities/User";

export interface InstanceRepositoryConstructor {
    new(configRepository: ConfigRepository, instance: Instance, encryptionKey: string): InstanceRepository;
}

export interface InstanceRepository {
    getById(id: string): Promise<Instance | undefined>
    getApi(): D2Api;
    getBaseUrl(): string;
    getUser(): Promise<User>;
    getVersion(): Promise<string>;
    getOrgUnitRoots(): Promise<Pick<OrganisationUnit, "id" | "name" | "displayName" | "path">[]>;
    sendMessage(message: InstanceMessage): Promise<void>;
}
