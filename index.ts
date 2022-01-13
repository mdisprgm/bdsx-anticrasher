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

const Sounds = new Map<NetworkIdentifier, NodeJS.Timeout>();
const SOUNDS_DELAY = 16;
events.packetBefore(MinecraftPacketIds.LevelSoundEvent).on((pkt, ni) => {
    if (pkt.sound !== 0) return;
    if (Sounds.has(ni)) {
        clearTimeout(Sounds.get(ni)!);
        Sounds.set(
            ni,
            setTimeout(() => {
                Sounds.delete(ni);
            }, SOUNDS_DELAY)
        );
        serverInstance.disconnectClient(ni);
        const ip = ni.getAddress().split("|")[0];
        ipfilter.add(ip, 1073741824);
        return CANCEL;
    } else {
        Sounds.set(
            ni,
            setTimeout(() => {
                Sounds.delete(ni);
            }, SOUNDS_DELAY)
        );
    }
});

events.packetBefore(MinecraftPacketIds.PlayerAuthInput).on((pkt, ni) => {
    switch (true) {
        case pkt.moveX > 1073741824:
        case pkt.moveZ > 1073741824:
        case pkt.pos.x > 1073741824:
        case pkt.pos.y > 1073741824:
        case pkt.pos.z > 1073741824:
            const ip = ni.getAddress().split("|")[0];
            ipfilter.add(ip, 1073741824);
            serverInstance.disconnectClient(ni);
            return CANCEL;
        default:
    }
});
