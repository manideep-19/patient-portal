import { NextRequest, NextResponse } from "next/server";

/**
 * Room presence registry for the telehealth mesh.
 *
 * Clients POST a heartbeat every ~3s and get back everyone else in the room.
 * A peer that misses heartbeats for STALE_MS is dropped. Leaving is either a
 * DELETE (normal hang-up) or a POST with { action: "leave" } (sendBeacon on tab
 * close, which can only POST).
 *
 * NOTE: in-memory, so it only works with a single server process. For a
 * multi-instance / serverless deployment move this to Redis or a database.
 */

export interface RoomPeer {
  peerId: string;
  displayName: string;
  role: "patient" | "doctor" | "family" | "coordinator" | "guest";
  isMicMuted?: boolean;
  isCamOff?: boolean;
  joinedAt: number;
  lastSeen: number;
}

const STALE_MS = 10000;
/** Keep in sync with MAX_PARTICIPANTS in src/lib/use-webrtc.ts */
const MAX_PARTICIPANTS = 4;

// Survive dev hot-reloads / route module re-evaluation
const store = globalThis as unknown as {
  __smrkoTelehealthRooms?: Map<string, Map<string, RoomPeer>>;
};
const globalRooms: Map<string, Map<string, RoomPeer>> = (store.__smrkoTelehealthRooms ??= new Map<string, Map<string, RoomPeer>>());

function cleanStalePeers(roomId: string) {
  const room = globalRooms.get(roomId);
  if (!room) return;
  const now = Date.now();
  for (const [peerId, peer] of room.entries()) {
    if (now - peer.lastSeen > STALE_MS) room.delete(peerId);
  }
  if (room.size === 0) globalRooms.delete(roomId);
}

function removePeer(roomId: string, peerId: string) {
  const room = globalRooms.get(roomId);
  if (!room) return;
  room.delete(peerId);
  if (room.size === 0) globalRooms.delete(roomId);
}

function listPeers(roomId: string): RoomPeer[] {
  const room = globalRooms.get(roomId);
  return room ? Array.from(room.values()).sort((a, b) => a.joinedAt - b.joinedAt) : [];
}

const noStore = { "Cache-Control": "no-store" };

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id: roomId } = await params;
  cleanStalePeers(roomId);
  const peers = listPeers(roomId);
  return NextResponse.json({ roomId, count: peers.length, peers }, { headers: noStore });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: roomId } = await params;
  cleanStalePeers(roomId);

  try {
    const body = await req.json();
    const {
      peerId,
      displayName,
      role = "patient",
      isMicMuted = false,
      isCamOff = false,
      action,
    } = body ?? {};

    if (!peerId || typeof peerId !== "string") {
      return NextResponse.json({ error: "Missing peerId" }, { status: 400 });
    }

    if (action === "leave") {
      removePeer(roomId, peerId);
      return NextResponse.json({ success: true, removed: peerId }, { headers: noStore });
    }

    let room = globalRooms.get(roomId);
    if (!room) {
      room = new Map<string, RoomPeer>();
      globalRooms.set(roomId, room);
    }

    const now = Date.now();
    const existing = room.get(peerId);
    if (!existing && room.size >= MAX_PARTICIPANTS) {
      return NextResponse.json(
        { error: "room_full", max: MAX_PARTICIPANTS },
        { status: 409, headers: noStore }
      );
    }
    const peerData: RoomPeer = {
      peerId,
      displayName: String(displayName || (role === "doctor" ? "Doctor" : "Guest")).slice(0, 80),
      role,
      isMicMuted,
      isCamOff,
      joinedAt: existing?.joinedAt ?? now,
      lastSeen: now,
    };
    room.set(peerId, peerData);

    const allPeers = listPeers(roomId);
    return NextResponse.json(
      {
        success: true,
        roomId,
        self: peerData,
        peers: allPeers.filter((p) => p.peerId !== peerId),
        allPeers,
      },
      { headers: noStore }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: roomId } = await params;
  const peerId = new URL(req.url).searchParams.get("peerId");
  if (!peerId) {
    return NextResponse.json({ error: "Missing peerId" }, { status: 400 });
  }
  removePeer(roomId, peerId);
  return NextResponse.json({ success: true, removed: peerId }, { headers: noStore });
}
