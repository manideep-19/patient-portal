import { NextRequest, NextResponse } from "next/server";

export interface RoomPeer {
  peerId: string;
  role: "patient" | "doctor" | "guest";
  displayName: string;
  lastSeen: number;
  isVideoPausedForNetwork?: boolean;
  isMicMuted?: boolean;
  isCamOff?: boolean;
}

// In-memory room store (persists inside the running Next.js server process)
const globalRoomStore = global as unknown as {
  __telehealth_rooms?: Map<string, Map<string, RoomPeer>>;
};

if (!globalRoomStore.__telehealth_rooms) {
  globalRoomStore.__telehealth_rooms = new Map();
}

const rooms = globalRoomStore.__telehealth_rooms;

// Cleanup peers that haven't sent a heartbeat in over 35 seconds
function cleanupStalePeers(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const now = Date.now();
  for (const [peerId, peer] of room.entries()) {
    if (now - peer.lastSeen > 35000) {
      room.delete(peerId);
    }
  }
  if (room.size === 0) {
    rooms.delete(roomId);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  cleanupStalePeers(roomId);
  const room = rooms.get(roomId);
  const peerList = room ? Array.from(room.values()) : [];

  return NextResponse.json({
    roomId,
    count: peerList.length,
    peers: peerList,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, roomId, peerId, role, displayName, isVideoPausedForNetwork, isMicMuted, isCamOff } = body;

    if (!roomId || !peerId) {
      return NextResponse.json({ error: "Missing roomId or peerId" }, { status: 400 });
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const room = rooms.get(roomId)!;

    if (action === "join" || action === "heartbeat") {
      const existing = room.get(peerId);
      room.set(peerId, {
        peerId,
        role: role || existing?.role || "patient",
        displayName: displayName || existing?.displayName || "Participant",
        lastSeen: Date.now(),
        isVideoPausedForNetwork:
          isVideoPausedForNetwork !== undefined ? isVideoPausedForNetwork : existing?.isVideoPausedForNetwork,
        isMicMuted: isMicMuted !== undefined ? isMicMuted : existing?.isMicMuted,
        isCamOff: isCamOff !== undefined ? isCamOff : existing?.isCamOff,
      });

      cleanupStalePeers(roomId);

      // Return all other peers in the room (excluding the caller)
      const otherPeers = Array.from(room.values()).filter((p) => p.peerId !== peerId);

      return NextResponse.json({
        success: true,
        roomId,
        selfPeerId: peerId,
        totalInRoom: room.size,
        peers: otherPeers,
      });
    }

    if (action === "leave") {
      room.delete(peerId);
      cleanupStalePeers(roomId);
      return NextResponse.json({ success: true, remaining: room.size });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

