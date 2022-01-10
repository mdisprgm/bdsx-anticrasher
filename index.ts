import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { serverInstance } from "bdsx/bds/server";
import { CANCEL } from "bdsx/common";
import { ipfilter } from "bdsx/core";
import { events } from "bdsx/event";

console.log("[plugin:Anticrasher] allocated");

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

events.packetSend(MinecraftPacketIds.PlayerAuthInput).on((pkt, ni) => {
    const mX = pkt.moveX;
    const mZ = pkt.moveZ;
    const x = pkt.pos.x;
    const y = pkt.pos.y;
    const z = pkt.pos.z;
    switch (true) {
        case mX > 1073741824:
        case mZ > 1073741824:
        case x > 1073741824:
        case y > 1073741824:
        case z > 1073741824:
            serverInstance.disconnectClient(ni);
            return CANCEL;
        default:
    }
});
