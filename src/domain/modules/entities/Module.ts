import { generateUid } from "d2/uid";
import _ from "lodash";
import { SynchronizationBuilder } from "../../../types/synchronization";
import { NamedRef, Ref, SharedRef } from "../../common/entities/Ref";
import { SharingSetting } from "../../common/entities/SharingSetting";
import { ModelValidation, validateModel, ValidationError } from "../../common/entities/Validations";
import { MetadataModule } from "./MetadataModule";

export type Module = MetadataModule;
export type ModuleType = "metadata";

export interface BaseModule extends SharedRef {
    description: string;
    department: NamedRef;
    type: ModuleType;
    instance: string;
    lastPackageVersion: string;
}

export abstract class GenericModule implements BaseModule {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly department: NamedRef;
    public readonly publicAccess: string;
    public readonly userAccesses: SharingSetting[];
    public readonly userGroupAccesses: SharingSetting[];
    public readonly user: NamedRef;
    public readonly created: Date;
    public readonly lastUpdated: Date;
    public readonly lastUpdatedBy: NamedRef;
    public readonly instance: string;
    public readonly lastPackageVersion: string;
    public abstract readonly type: ModuleType;

    constructor(data: Pick<GenericModule, keyof BaseModule>) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.department = data.department;
        this.instance = data.instance;
        this.lastPackageVersion = data.lastPackageVersion;
        this.publicAccess = data.publicAccess;
        this.userAccesses = data.userAccesses;
        this.userGroupAccesses = data.userGroupAccesses;
        this.user = data.user;
        this.created = data.created;
        this.lastUpdated = data.lastUpdated;
        this.lastUpdatedBy = data.lastUpdatedBy;
    }

    public validate(filter?: string[]): ValidationError[] {
        return validateModel<GenericModule>(this, this.moduleValidations()).filter(
            ({ property }) => filter?.includes(property) ?? true
        );
    }

    public replicate(): GenericModule {
        return this.update({ name: `Copy of ${this.name}`, id: generateUid() });
    }

    public abstract update(data?: Partial<Pick<GenericModule, keyof BaseModule>>): GenericModule;
    public abstract toSyncBuilder(): Omit<
        SynchronizationBuilder,
        "originInstance" | "targetInstances"
    >;

    public hasPermissions(permission: "read" | "write", userId: string, userGroups: Ref[]) {
        const { publicAccess = "--------", userAccesses = [], userGroupAccesses = [] } = this;
        const token = permission === "read" ? "r" : "w";

        const isUserOwner = this.user.id === userId;
        const isPublic = publicAccess.substring(0, 2).includes(token);

        const hasDepartmentAccess = !!_.find(userGroups, ({ id }) => id === this.department.id);

        const hasUserAccess = !!_(userAccesses)
            .filter(({ access }) => access.substring(0, 2).includes(token))
            .find(({ id }) => id === userId);

        const hasGroupAccess =
            _(userGroupAccesses)
                .filter(({ access }) => access.substring(0, 2).includes(token))
                .intersectionBy(userGroups, "id")
                .value().length > 0;

        return isUserOwner || isPublic || hasDepartmentAccess || hasUserAccess || hasGroupAccess;
    }

    protected abstract moduleValidations: () => ModelValidation[];

    protected static buildDefaultValues = (): Pick<GenericModule, keyof BaseModule> => {
        return {
            id: generateUid(),
            name: "",
            description: "",
            department: {
                id: "",
                name: "",
            },
            type: "metadata",
            instance: "",
            lastPackageVersion: "",
            publicAccess: "rw------",
            userAccesses: [],
            userGroupAccesses: [],
            user: {
                id: "",
                name: "",
            },
            created: new Date(),
            lastUpdated: new Date(),
            lastUpdatedBy: {
                id: "",
                name: "",
            },
        };
    };
}
