import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { serverInstance } from "bdsx/bds/server";
import { CANCEL } from "bdsx/common";
import { ipfilter } from "bdsx/core";
import { events } from "bdsx/event";
import { anticrasher, CrasherDetectedEvent } from "./event";

export class Counter {
    static readonly kickMessage = "§cKicked by trying Crasher";
    private static Banned = new Map<NetworkIdentifier, string>();

    constructor();
    constructor(delay_limit: number, max_warns: number);
    constructor(delay_limit?: number, max_warns?: number) {
        if (delay_limit != null && max_warns != null) {
            this.delay_limit = delay_limit;
            this.max_warns = max_warns;
        }
    }

    private delay_limit: number = 3;
    private max_warns: number = 3;
    private last_map: Map<NetworkIdentifier, number> = new Map();
    private count_map: Map<NetworkIdentifier, number> = new Map();

    reset(subject: NetworkIdentifier): void {
        this.count_map.set(subject, 0);
        this.last_map.set(subject, Date.now());
    }
    warn(subject: NetworkIdentifier): void {
        const old_counts = this.count_map.get(subject);

        this.last_map.set(subject, Date.now());
        this.count_map.set(subject, (old_counts ?? 0) + 1);
    }
    pass(subject: NetworkIdentifier) {
        this.reset(subject);
    }

    enter(subject: NetworkIdentifier, cause: anticrasher.Crashers = anticrasher.Crashers.Unknown, kickMessage?: string): CANCEL | void {
        const last = this.last_map.get(subject);
        const counts = this.count_map.get(subject);
        this.warn(subject);

        // 처음이 아니면
        if (last != null && counts != null) {
            // 시간 비교해서
            if (Date.now() - last < this.delay_limit) {
                // 여러 번 이면
                if (counts > this.max_warns) {
                    // 킥
                    this.addBanned(subject, cause, kickMessage);
                    this.reset(subject);
                    return CANCEL;
                }
                // 시간이 길면 값 초기화
            } else this.pass(subject);
        }
        // 처음이면 값 초기화
        else this.pass(subject);
    }

    addBanned(target: NetworkIdentifier, message?: string): void;
    addBanned(target: NetworkIdentifier, cause: anticrasher.Crashers, message?: string): void;
    addBanned(target: NetworkIdentifier, messageOrCause?: string | number, messageOpt?: string): void {
        if (Counter.Banned.has(target)) return;
        const ip = target.getAddress().split("|")[0];
        if (ip !== "10.10.10.10") Counter.Banned.set(target, ip);

        const event = new CrasherDetectedEvent(target.getActor()!, target, anticrasher.Crashers.Unknown);
        let message = "";

        if (typeof messageOrCause === "number") {
            event.crasherType = messageOrCause;
            message = messageOpt ?? Counter.kickMessage;
        } else {
            message = messageOrCause ?? Counter.kickMessage;
        }
        const canceled = anticrasher.crasherDetected.fire(event) === CANCEL;

        if (canceled) {
            return;
        }
        serverInstance.disconnectClient(target, message);
    }
}

events.networkDisconnected.on(async (ni) => {
    if ((Counter as any).Banned.has(ni)) {
        ipfilter.add((Counter as any).Banned.get(ni)!);
        (Counter as any).Banned.delete(ni);
    }
});
