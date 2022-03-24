import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { Player } from "bdsx/bds/player";
import { CANCEL } from "bdsx/common";
import { Event } from "bdsx/eventtarget";

export class CrasherDetectedEvent {
    constructor(public crasher: Player, public networkIdentifier: NetworkIdentifier) {}
}

export namespace anticrasher {
    export const crasherDetected = new Event<(event: CrasherDetectedEvent) => CANCEL>();
}
