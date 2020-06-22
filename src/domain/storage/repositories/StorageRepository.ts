import _ from "lodash";
import { Ref } from "../../common/entities/Ref";

export abstract class StorageRepository {
    // Object operations
    public abstract getObject<T extends object>(key: string): Promise<T | undefined>;
    public abstract getOrCreateObject<T extends object>(key: string, defaultValue: T): Promise<T>;
    public abstract saveObject<T extends object>(key: string, value: T): Promise<void>;
    public abstract removeObject(key: string): Promise<void>;

    public async listObjectsInCollection<T extends Ref>(key: string): Promise<T[]> {
        return (await this.getObject<T[]>(key)) ?? [];
    }

    public async getObjectInCollection<T extends Ref>(
        key: string,
        id: string
    ): Promise<T | undefined> {
        const rawData = (await this.getObject<T[]>(key)) ?? [];
        const baseElement = _.find(rawData, element => element.id === id);
        if (!baseElement) return undefined;

        const advancedElement = this.getObject(`${key}-${id}`) ?? {};
        return { ...baseElement, ...advancedElement } as T;
    }

    public async saveObjectInCollection<T extends Ref>(
        key: string,
        element: T,
        advancedProperties: Array<keyof T> = []
    ): Promise<void> {
        const oldData: Ref[] = (await this.getObject(key)) ?? [];
        const cleanData = oldData.filter(item => item.id !== element.id);

        // Save base element directly into collection: model
        const baseElement = _.omit(element, advancedProperties);
        await this.saveObject(key, [...cleanData, baseElement]);

        // Save advanced properties to its own key: model-id
        if (advancedProperties.length > 0) {
            const advancedElement = _.pick(element, advancedProperties);
            await this.saveObject(`${key}-${element.id}`, advancedElement);
        }
    }

    public async removeObjectInCollection(key: string, id: string): Promise<void> {
        const oldData: Ref[] = (await this.getObject(key)) ?? [];
        const newData = _.reject(oldData, { id });
        await this.saveObject(key, newData);
        await this.removeObject(`${key}-${id}`);
    }
}
