import { Divider } from "@material-ui/core";
import { DatePicker, OrgUnitsSelector } from "d2-ui-components";
import _ from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import i18n from "../../../../../locales";
import { Dictionary } from "../../../../../types/utils";
import { useAppContext } from "../../../core/contexts/AppContext";

export interface NamedDate {
    date: Date | null;
}

export interface OrgUnitDateSelectorProps {
    projectMinimumDates: Dictionary<NamedDate>;
    onChange(projectMinimumDates: Dictionary<NamedDate>): void;
}

export const OrgUnitDateSelector: React.FC<OrgUnitDateSelectorProps> = React.memo(props => {
    const { projectMinimumDates, onChange: updateProjectMinimumDates } = props;
    const { api, compositionRoot } = useAppContext();

    const [orgUnitRootIds, setOrgUnitRootIds] = useState<string[] | undefined>();
    const [selectedOrgUnitPaths, updateSelectedOrgUnitPaths] = useState<string[]>([]);

    const addProjectMinimumDate = useCallback(
        async (project: string, date: Date | null) => {
            if (!date && !selectedOrgUnitPaths.includes(project)) {
                updateProjectMinimumDates(_.omit(projectMinimumDates, [project]));
            } else {
                updateProjectMinimumDates({ ...projectMinimumDates, [project]: { date } });
            }
        },
        [selectedOrgUnitPaths, projectMinimumDates, updateProjectMinimumDates]
    );

    const selectOrgUnit = useCallback(
        async (paths: string[]) => {
            updateSelectedOrgUnitPaths(paths);
            if (paths.length === 0) return;

            const items = _.omitBy(projectMinimumDates, item => item.date === null);
            updateProjectMinimumDates({ [paths[0]]: { date: null }, ...items });
        },
        [projectMinimumDates, updateProjectMinimumDates]
    );

    useEffect(() => {
        compositionRoot.instances
            .getOrgUnitRoots()
            .then(roots => roots.map(({ id }) => id))
            .then(setOrgUnitRootIds);
    }, [compositionRoot]);

    return (
        <Wrapper>
            <FlexBox>
                <Container>
                    <OrgUnitsSelector
                        api={api}
                        fullWidth={false}
                        onChange={selectOrgUnit}
                        selected={selectedOrgUnitPaths}
                        rootIds={orgUnitRootIds}
                        withElevation={false}
                        singleSelection={true}
                        typeInput={"radio"}
                        hideMemberCount={true}
                        selectableLevels={[4]}
                        controls={{
                            filterByLevel: false,
                            filterByGroup: false,
                            filterByProgram: false,
                            selectAll: false,
                        }}
                    />
                </Container>
                <Divider orientation={"vertical"} flexItem={true} />
                <Container>
                    <FlexBox orientation={"vertical"}>
                        {selectedOrgUnitPaths.map(orgUnitPath => (
                            <React.Fragment key={`date-${orgUnitPath}`}>
                                <Picker
                                    label={i18n.t("Minimum date")}
                                    value={projectMinimumDates[orgUnitPath]?.date ?? null}
                                    onChange={(date: Date | null) =>
                                        addProjectMinimumDate(orgUnitPath, date)
                                    }
                                />
                            </React.Fragment>
                        ))}
                    </FlexBox>
                </Container>
            </FlexBox>
        </Wrapper>
    );
});

const Wrapper = styled.div`
    margin: 25px 0;
`;

const FlexBox = styled.div<{ orientation?: "horizontal" | "vertical" }>`
    display: flex;
    flex: 1;
    flex-direction: ${props => (props.orientation === "vertical" ? "column" : "row")};
`;

const Container = styled.div`
    width: 50%;
    margin: 0 25px;
`;

const Picker = styled(DatePicker)`
    margin: 0;
`;
