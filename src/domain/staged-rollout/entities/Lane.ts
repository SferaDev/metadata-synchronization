export interface Lane {
    id: string;
    name: string;
    visible: boolean;
    stages: Stage[];
}

export interface Stage {
    id: string;
    name: string;
    instances: string[];
}

export interface StageItem {
    id: string;
    name: string;
    content: string;
    stage: string;
    audits: StageAudit[];
}

export interface StageAudit {
    type: "rollout" | "rollback";
    stage: string;
    date: string;
    comment: string;
}
