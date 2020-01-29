import React, { useState, useEffect } from "react";
import i18n from "../../locales";
import { Typography } from "@material-ui/core";

interface AuthorizationProps {
    authorize: () => Promise<boolean>;
}

const Authorization: React.FC<AuthorizationProps> = props => {
    const [isAuthorize, setIsAuthorize] = useState<boolean>(true);

    useEffect(() => {
        async function executeIsAuthorize() {
            const authorized = await props.authorize();

            setIsAuthorize(authorized);
        }

        executeIsAuthorize();
    }, [props]);

    if (isAuthorize) {
        return <React.Fragment>{props.children}</React.Fragment>;
    } else {
        return (
            <Typography variant="h6" component="h1">
                {i18n.t(
                    "Unauthorized - You do not have permission to view this page using credentials that you supplied."
                )}
            </Typography>
        );
    }
};

export default Authorization;
