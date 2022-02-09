import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { serverInstance } from "bdsx/bds/server";
import { CANCEL } from "bdsx/common";
import { ipfilter } from "bdsx/core";
import { events } from "bdsx/event";

console.log("[Anticrasher] allocated", " - mdisprgm".blue);

events.serverOpen.on(() => {
    console.log("[ANTICRASHER] launching", " - mdisprgm".blue);
});

events.serverClose.on(() => {
    console.log("[ANTICRASHER] closed", " - mdisprgm".blue);
});

ipfilter.setTrafficLimit(1024 * 1024);
ipfilter.setTrafficLimitPeriod(3600);

const LAST = new Map<NetworkIdentifier, number>(); //TIME between last and second last chat
const COUNT = new Map<NetworkIdentifier, number>(); //warning COUNT

const Banned = new Map<NetworkIdentifier, string>();

const SOUNDS_DELAY = 3;

events.packetAfter(MinecraftPacketIds.Login).on(async (pkt, ni) => {
    LAST.set(ni, 0);
    COUNT.set(ni, 0);

    Banned.set(ni, ni.getAddress().split("|")[0]);
});
events.networkDisconnected.on(async (ni) => {
    LAST.delete(ni);
    COUNT.delete(ni);

    if (Banned.has(ni)) {
        ipfilter.add(Banned.get(ni)!);
        Banned.delete(ni);
    }
});

events.packetBefore(MinecraftPacketIds.LevelSoundEvent).on((pkt, ni) => {
    if ([12, 26, 35, 42].includes(pkt.sound)) return;

    if (Date.now() - LAST.get(ni)! < SOUNDS_DELAY) {
        const next = COUNT.get(ni)!;
        COUNT.set(ni, next + 1);

        if (next > 4) {
            const ip = ni.getAddress().split("|")[0];
            if (ip !== "10.10.10.10") {
                Banned.set(ni, ip);
            }
            serverInstance.disconnectClient(ni, "§cKicked by trying Crasher");
        }
        return CANCEL;
    }
    COUNT.set(ni, 0);
    LAST.set(ni, Date.now());
});
events.packetBefore(MinecraftPacketIds.PlayerAuthInput).on((pkt, ni) => {
    switch (true) {
        case pkt.moveX > 1073741823:
        case pkt.moveZ > 1073741823:
        case pkt.pos.x > 1073741823:
        case pkt.pos.y > 1073741823:
        case pkt.pos.z > 1073741823:
            const ip = ni.getAddress().split("|")[0];
            ipfilter.add(ip, 1073741823);
            serverInstance.disconnectClient(ni);
            return CANCEL;
        default:
    }
});
