import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { Player } from "bdsx/bds/player";
import { CANCEL } from "bdsx/common";
import { Event } from "bdsx/eventtarget";

export class CrasherDetectedEvent {
    constructor(public crasher: Player, public networkIdentifier: NetworkIdentifier, public crasherType: anticrasher.Crashers) {}
}

export namespace anticrasher {
    export const crasherDetected = new Event<(event: CrasherDetectedEvent) => void | CANCEL>();

    export enum Crashers {
        Unknown,
        IllegalPositions,
        InvalidSounds,
        FoodSpammer,
    }
}
