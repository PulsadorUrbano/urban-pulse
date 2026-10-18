import { IncidentState } from "./incident-state.js";

export class IncidentContext {
    private state: IncidentState;

    constructor(state: IncidentState) {
        this.transitionTo(state);
    }

    public transitionTo(state: IncidentState): void {
        this.state = state;
        this.state.setContext(this);
    }

    public performNext(): void {
        this.state.handleNext();
    }

    public performFail(): void {
        this.state.handleFail();
    }
}