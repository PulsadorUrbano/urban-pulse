import { IncidentContext } from "./incident.js";

export abstract class IncidentState {
    protected context: IncidentContext;

    public setContext(context: IncidentContext) {
        this.context = context;
    }

    public abstract handleNext(): void;
    public abstract handleFail(): void;
}