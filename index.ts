import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { ActorEventPacket } from "bdsx/bds/packets";
import { CANCEL } from "bdsx/common";
import { ipfilter } from "bdsx/core";
import { events } from "bdsx/event";
import { Counter } from "./counter";
import { anticrasher } from "./event";

{
    console.log("[ANTICRASHER] allocated", " - mdisprgm".blue);
    events.serverOpen.on(() => {
        console.log("[ANTICRASHER] launching", " - mdisprgm".blue);
    });
    events.serverClose.on(() => {
        console.log("[ANTICRASHER] closed", " - mdisprgm".blue);
    });
}

ipfilter.setTrafficLimit(1024 * 1024);
ipfilter.setTrafficLimitPeriod(3600);

const InvalidSoundsCounter = new Counter(3, 3);
const FoodSpammerCounter = new Counter(3, 3);
const IllegalPositionsCounter = new Counter(3, 0);

// invalid sound events
{
    events.packetBefore(MinecraftPacketIds.LevelSoundEvent).on((pkt, ni) => {
        if ([12, 26, 35, 42].includes(pkt.sound)) return;
        return InvalidSoundsCounter.enter(ni, anticrasher.Crashers.InvalidSounds);
    });
}

// invalid eating food
{
    events.packetBefore(MinecraftPacketIds.ActorEvent).on((pkt, ni) => {
        const action = pkt.event;
        if (action !== ActorEventPacket.Events.EatingItem) return;
        return FoodSpammerCounter.enter(ni, anticrasher.Crashers.FoodSpammer);
    });
}

// invalid positions
{
    events.packetBefore(MinecraftPacketIds.PlayerAuthInput).on((pkt, ni) => {
        switch (true) {
            case pkt.moveX > 0x3fffffff:
            case pkt.moveZ > 0x3fffffff:
            case pkt.pos.x > 0x3fffffff:
            case pkt.pos.y > 0x3fffffff:
            case pkt.pos.z > 0x3fffffff:
                IllegalPositionsCounter.addBanned(ni, anticrasher.Crashers.IllegalPositions);
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

export { anticrasher, Counter };
