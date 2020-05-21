import { MetadataRepository } from "../../../domain/synchronization/MetadataRepositoriy";
import {
    MetadataImportResponse,
    MetadataImportParams
} from "../../../domain/synchronization/MetadataEntities";

import { AxiosError } from "axios";
import Instance from "../../../domain/instance/Instance";
import { mapPackageToD2Version } from "../mappers/D2VersionPackageMapper";
import { metadataTransformationsToDhis2 } from "../mappers/PackageTransformations";
import { D2Api } from "../../../types/d2-api"
import { MetadataPackage, MetadataFieldsPackage } from "../../../domain/metadata/entities";
import _ from "lodash";

class MetadataD2ApiRepository implements MetadataRepository {
    private currentD2Api: D2Api;

    constructor(d2Api: D2Api) {
        //TODO: composition root - when we have composition root I think may has sense
        // that dependency should be currentInstance instead of d2Api because so
        // all necessary instance data (url, usr, pwd, version) for current server is loaded once to start app.
        // For the moment I have not make this change becuase we should realize a request to current server
        // for every metadata sync execution where this class is created to retrieve current version
        this.currentD2Api = d2Api;
    }

    /**
     * Return specific fields of metadata dhis2 models according to ids filter
     * @param ids metadata ids to retrieve
     */
    async getMetadataFieldsByIds<T>(ids: string[], fields: string): Promise<MetadataFieldsPackage<T>> {
        return this.getMetadata(ids, fields);
    }

    /**
     * Return metadata entitites according to ids filter
     * @param ids metadata ids to retrieve
     */
    async getMetadataByIds(ids: string[]): Promise<MetadataPackage> {
        const metadata = await this.getMetadata(ids);

        //Apply transformations

        return metadata;
    }

    async save(metadata: MetadataPackage,
        additionalParams?: MetadataImportParams,
        targetInstance?: Instance): Promise<MetadataImportResponse> {

        try {
            const params = {
                importMode: "COMMIT",
                identifier: "UID",
                importReportMode: "FULL",
                importStrategy: "CREATE_AND_UPDATE",
                mergeMode: "MERGE",
                atomicMode: "ALL",
                ...additionalParams,
            };

            const apiVersion = await this.getVersion(targetInstance);
            const versionedPayloadPackage = mapPackageToD2Version(apiVersion, metadata, metadataTransformationsToDhis2);

            console.debug("Versioned metadata package", versionedPayloadPackage);

            const response = await this.getApi(targetInstance)
                .post("/metadata", params, versionedPayloadPackage).getData();

            return response as MetadataImportResponse;
        } catch (error) {
            return this.buildResponseError(error);
        }
    }

    private getApi(targetInstance?: Instance): D2Api {
        return targetInstance ? new D2Api({
            baseUrl: targetInstance.url,
            auth: { username: targetInstance.username, password: targetInstance.password }
        }) : this.currentD2Api;
    }

    private async getVersion(targetInstance?: Instance): Promise<number> {
        if (!targetInstance) {
            const version = await this.currentD2Api.getVersion();
            return +version.split(".")[1];
        } else if (targetInstance.apiVersion) {
            return targetInstance.apiVersion;
        } else {
            throw Error("Necessary api version to apply transformations to package is undefined");
        }
    }

    private buildResponseError(error: AxiosError): MetadataImportResponse {
        if (error.response && error.response.data) {
            const {
                httpStatus = "Unknown",
                httpStatusCode = 400,
                message = "Request failed unexpectedly",
            } = error.response.data;
            return {
                ...error.response.data,
                message: `Error ${httpStatusCode} (${httpStatus}): ${message}`,
            };
        } else if (error.response) {
            const { status, statusText } = error.response;
            console.error(status, statusText, error);
            return { status: "ERROR", message: `Unknown error: ${status} ${statusText}` };
        } else {
            console.error(error);
            return { status: "NETWORK ERROR" };
        }
    }

    private async getMetadata(
        elements: string[],
        fields = ":all"
    ): Promise<MetadataPackage> {
        const promises = [];
        for (let i = 0; i < elements.length; i += 100) {
            const requestElements = elements.slice(i, i + 100).toString();
            promises.push(
                this.currentD2Api
                    .get("/metadata", {
                        fields,
                        filter: "id:in:[" + requestElements + "]",
                        defaults: "EXCLUDE",
                    })
                    .getData()
            );
        }
        const response = await Promise.all(promises);
        const results = _.deepMerge({}, ...response);
        if (results.system) delete results.system;
        return results;
    }

}

export default MetadataD2ApiRepository;