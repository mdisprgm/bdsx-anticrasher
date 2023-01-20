import { NetworkConnection, NetworkHandler } from "bdsx/bds/networkidentifier";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { ActorEventPacket } from "bdsx/bds/packets";
import { CANCEL } from "bdsx/common";
import { ipfilter, VoidPointer } from "bdsx/core";
import { events } from "bdsx/event";
import { int32_t, void_t } from "bdsx/nativetype";
import { CxxStringWrapper } from "bdsx/pointer";
import { procHacker } from "bdsx/prochacker";
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

{
    const WrongSkinBlocker = new Counter(70, 2);
    events.packetRaw(MinecraftPacketIds.PlayerSkin).on((ptr, size, ni, id) => {
        if (size < 0x400) {
            WrongSkinBlocker.enter(ni, anticrasher.Crashers.InvalidSkin);
            return CANCEL;
        }
    });
}

(function blockEmptyData(): void {
    const disconnectConnection = procHacker.js("?disconnect@NetworkConnection@@QEAAXXZ", void_t, null, NetworkConnection);
    const receivePacket = procHacker.hooking(
        "?receivePacket@NetworkConnection@@QEAA?AW4DataStatus@NetworkPeer@@AEAV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEAVNetworkHandler@@AEBV?$shared_ptr@V?$time_point@Usteady_clock@chrono@std@@V?$duration@_JU?$ratio@$00$0DLJKMKAA@@std@@@23@@chrono@std@@@5@@Z",
        int32_t, // DataStatus
        null,
        NetworkConnection,
        CxxStringWrapper,
        NetworkHandler,
        VoidPointer, // std::shared_ptr<std::chrono::time_point>
    )((conn, stream, networkHandler, time_point) => {
        if (!stream.length) {
            disconnectConnection(conn);
            return 1;
        }
        return receivePacket(conn, stream, networkHandler, time_point);
    });
})();

{
    //
    // example_and_test/vulnerabilities.ts
    //

    events.packetRaw(MinecraftPacketIds.ClientCacheBlobStatus).on((ptr, size, netId) => {
        if (ptr.readVarUint() >= 0xfff || ptr.readVarUint() >= 0xfff) {
            console.log(("DOS (ClientCacheBlobStatus) detected from " + netId).red);
            return CANCEL;
        }
    });
    events.packetBefore(MinecraftPacketIds.Disconnect).on((pkt, ni) => {
        if (ni.getActor() == null) return CANCEL;
    });
}

export { anticrasher, Counter };
