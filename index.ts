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

events.packetSend(MinecraftPacketIds.LevelSoundEvent).on((pkt, ni) => {
    const sound = pkt.sound;
    (async () => {
        if (sound === 0) {
            serverInstance.disconnectClient(ni);
            return CANCEL;
        }
    })();
});

events.packetBefore(MinecraftPacketIds.PlayerAuthInput).on((pkt, ni) => {
    switch (true) {
        case pkt.moveX > 1073741824:
        case pkt.moveZ > 1073741824:
        case pkt.pos.x > 1073741824:
        case pkt.pos.y > 1073741824:
        case pkt.pos.z > 1073741824:
            serverInstance.disconnectClient(ni);
            return CANCEL;
        default:
    }
});
