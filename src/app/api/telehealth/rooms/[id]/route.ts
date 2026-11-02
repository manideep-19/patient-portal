import { NextRequest, NextResponse } from "next/server";

export interface RoomPeer {
  peerId: string;
  displayName: string;
  role: "patient" | "doctor" | "family" | "coordinator";
  isMicMuted?: boolean;
  isCamOff?: boolean;
  lastSeen: number;
}

// In-memory room registry keyed by roomId -> (peerId -> RoomPeer)
const globalRooms = new Map<string, Map<string, RoomPeer>>();

// Cleanup stale peers (inactive for > 15 seconds)
function cleanStalePeers(roomId: string) {
  const room = globalRooms.get(roomId);
  if (!room) return;

  const now = Date.now();
  for (const [peerId, peer] of room.entries()) {
    if (now - peer.lastSeen > 15000) {
      room.delete(peerId);
    }
  }

  if (room.size === 0) {
    globalRooms.delete(roomId);
  }
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: roomId } = await params;
  cleanStalePeers(roomId);

  const room = globalRooms.get(roomId);
  const peers = room ? Array.from(room.values()) : [];

  return NextResponse.json({
    roomId,
    count: peers.length,
    peers,
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: roomId } = await params;
  cleanStalePeers(roomId);

  try {
    const body = await req.json();
    const { peerId, displayName, role = "patient", isMicMuted = false, isCamOff = false } = body;

    if (!peerId) {
      return NextResponse.json({ error: "Missing peerId" }, { status: 400 });
    }

    let room = globalRooms.get(roomId);
    if (!room) {
      room = new Map<string, RoomPeer>();
      globalRooms.set(roomId, room);
    }

    const peerData: RoomPeer = {
      peerId,
      displayName: displayName || (role === "doctor" ? "Doctor" : "Guest"),
      role,
      isMicMuted,
      isCamOff,
      lastSeen: Date.now(),
    };

    room.set(peerId, peerData);

    // Return all other active peers in room
    const otherPeers = Array.from(room.values()).filter((p) => p.peerId !== peerId);

    return NextResponse.json({
      success: true,
      roomId,
      self: peerData,
      peers: otherPeers,
      allPeers: Array.from(room.values()),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: roomId } = await params;

  try {
    const { searchParams } = new URL(req.url);
    let peerId = searchParams.get("peerId");

    if (!peerId) {
      try {
        const body = await req.json();
        peerId = body.peerId;
      } catch {
        // Body optional if query param provided
      }
    }

    if (!peerId) {
      return NextResponse.json({ error: "Missing peerId" }, { status: 400 });
    }

    const room = globalRooms.get(roomId);
    if (room) {
      room.delete(peerId);
      if (room.size === 0) {
        globalRooms.delete(roomId);
      }
    }

    return NextResponse.json({ success: true, removed: peerId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to leave" }, { status: 500 });
  }
}

