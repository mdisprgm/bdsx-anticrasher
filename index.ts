import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { ActorEventPacket } from "bdsx/bds/packets";
import { serverInstance } from "bdsx/bds/server";
import { CANCEL } from "bdsx/common";
import { ipfilter } from "bdsx/core";
import { events } from "bdsx/event";

console.log("[ANTICRASHER] allocated", " - mdisprgm".blue);

events.serverOpen.on(() => {
    console.log("[ANTICRASHER] launching", " - mdisprgm".blue);
});

events.serverClose.on(() => {
    console.log("[ANTICRASHER] closed", " - mdisprgm".blue);
});

ipfilter.setTrafficLimit(1024 * 1024);
ipfilter.setTrafficLimitPeriod(3600);
const DELAY_LIMIT = 3;

const LAST = new Map<NetworkIdentifier, number>(); //TIME between last and second last chat
const COUNT = new Map<NetworkIdentifier, number>(); //warning COUNT

const Banned = new Map<NetworkIdentifier, string>();

/**
 * Ban client but for the session
 */
function addBanned(target: NetworkIdentifier) {
    if (Banned.has(target)) return;

    const ip = target.getAddress().split("|")[0];
    if (ip !== "10.10.10.10") Banned.set(target, ip);

    serverInstance.disconnectClient(target, "§cKicked by trying Crasher");
}

events.packetAfter(MinecraftPacketIds.Login).on(async (pkt, ni) => {
    LAST.set(ni, 0);
    COUNT.set(ni, 0);
});

events.networkDisconnected.on(async (ni) => {
    LAST.delete(ni);
    COUNT.delete(ni);

    if (Banned.has(ni)) {
        ipfilter.add(Banned.get(ni)!);
        Banned.delete(ni);
    }
});

// invalid sound events
{
    events.packetBefore(MinecraftPacketIds.LevelSoundEvent).on((pkt, ni) => {
        if ([12, 26, 35, 42].includes(pkt.sound)) return;

        if (Date.now() - LAST.get(ni)! < DELAY_LIMIT) {
            const next = COUNT.get(ni)!;
            COUNT.set(ni, next + 1);
            if (next > 3) {
                addBanned(ni);
            }

            return CANCEL;
        }
        COUNT.set(ni, 0);
        LAST.set(ni, Date.now());
    });
}

// invalid eating food
{
    const FOOD_LAST = new Map<NetworkIdentifier, number>(); //TIME between last and second last chat
    const FOOD_COUNT = new Map<NetworkIdentifier, number>(); //warning COUNT

    events.packetBefore(MinecraftPacketIds.ActorEvent).on((pkt, ni) => {
        const action = pkt.event;
        if (action !== ActorEventPacket.Events.EatingItem) return;

        if (Date.now() - FOOD_LAST.get(ni)! < DELAY_LIMIT) {
            const next = FOOD_COUNT.get(ni)!;
            FOOD_COUNT.set(ni, next + 1);
            if (next > 3) {
                addBanned(ni);
            }

            return CANCEL;
        }
        FOOD_COUNT.set(ni, 0);
        FOOD_LAST.set(ni, Date.now());
    });
}

// invalid positions
{
    events.packetBefore(MinecraftPacketIds.PlayerAuthInput).on((pkt, ni) => {
        switch (true) {
            case pkt.moveX > 1073741823:
            case pkt.moveZ > 1073741823:
            case pkt.pos.x > 1073741823:
            case pkt.pos.y > 1073741823:
            case pkt.pos.z > 1073741823:
                addBanned(ni);
                return CANCEL;
            default:
        }
    });
}
try {
    require("bdsx/../../example_and_test/vulnerabilities");
} catch {
    console.log("[ANTICRASHER] Can't found example_and_test/vulnerabilities".red);
}
