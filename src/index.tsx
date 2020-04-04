//@ts-ignore
import { Provider } from "@dhis2/app-runtime";
import axios from "axios";
import React from "react";
import ReactDOM from "react-dom";
import { AuthBoundary, AuthConfig } from "./components/auth/AuthBoundary";
import "./locales";
import App from "./pages/app/App";

const apiVersion = "30";

async function buildConfig(): Promise<AuthConfig> {
    try {
        const { data: manifest } = await axios.get("manifest.webapp");
        return { baseUrl: manifest.activities.dhis.href, apiVersion, production: true };
    } catch (error) {
        const url = process.env.REACT_APP_DHIS2_BASE_URL ?? "http://localhost:8080";
        return { baseUrl: url.replace(/\/*$/, ""), apiVersion, production: false };
    }
}

async function main() {
    try {
        const config = await buildConfig();

        ReactDOM.render(
            <AuthBoundary config={config}>
                <Provider config={config}>
                    <App />
                </Provider>
            </AuthBoundary>,
            document.getElementById("root")
        );
    } catch (err) {
        console.error(err);
        ReactDOM.render(<div>{err.toString()}</div>, document.getElementById("root"));
    }
}

main();
