import React, { ReactNode } from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import SpeedDial from "@material-ui/lab/SpeedDial/SpeedDial";
import SpeedDialIcon from "@material-ui/lab/SpeedDialIcon/SpeedDialIcon";
import SpeedDialAction from "@material-ui/lab/SpeedDialAction/SpeedDialAction";
import i18n from "d2-ui-components/locales";
import { Fab, Icon } from "@material-ui/core";

export interface ActionButtonProps {
    actions: ActionOption[];
    onClick(action: string): void;
}

export interface ActionOption {
    icon: ReactNode;
    name: string;
    text: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ onClick, actions }) => {
    const classes = useStyles();
    const [openDial, setOpenDial] = React.useState(false);

    const handleClose = () => {
        setOpenDial(false);
    };

    const handleOpen = () => {
        setOpenDial(true);
    };

    const handleClick = (action: ActionOption) => {
        if (onClick) onClick(action.name);
    };

    return (
        <React.Fragment>
            {actions.length > 1 ? (
                <SpeedDial
                    ariaLabel={i18n.t("Package actions")}
                    className={classes.root}
                    icon={<SpeedDialIcon icon={<Icon>build</Icon>} openIcon={<Icon>clear</Icon>} />}
                    onClose={handleClose}
                    onOpen={handleOpen}
                    open={openDial}
                    direction="up"
                >
                    {actions.map(action => (
                        <SpeedDialAction
                            key={action.name}
                            icon={action.icon}
                            tooltipTitle={action.text}
                            onClick={() => handleClick(action)}
                        />
                    ))}
                </SpeedDial>
            ) : (
                <Fab
                    color="primary"
                    className={classes.root}
                    size="large"
                    onClick={() => handleClick(actions[0])}
                    data-test="objects-table-action-button"
                >
                    <Icon>add</Icon>
                </Fab>
            )}
        </React.Fragment>
    );
};

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            position: "fixed",
            margin: theme.spacing(1),
            bottom: theme.spacing(5),
            right: theme.spacing(9),
        },
        exampleWrapper: {
            position: "relative",
            marginTop: theme.spacing(3),
            height: 380,
        },
        radioGroup: {
            margin: theme.spacing(1, 0),
        },
    })
);
