import * as THREE from 'three';
import { joinRoom, type Room } from 'trystero';
import Peer, { type DataConnection } from 'peerjs';
import type {
  AvatarAnimState,
  ConnectedPeerSummary,
  EquippedToolType,
  INetworkManager,
  MinimapMarker,
  NetPlayerPacket,
  NetVehiclePacket,
  NetWorldEventPacket,
  WorldId
} from '../types';
import { PlayerAvatar } from './PlayerAvatar';

type WirePlayerPayload = {
  msgId: string;
  peerId: string;
  name: string;
  color: string;
  worldId: WorldId;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  anim: AvatarAnimState;
  tool: EquippedToolType;
  vehicleId: string | null;
  seatIndex: number;
  joinedAt: number;
  ts: number;
};

type WireVehiclePayload = {
  msgId: string;
  vehicleId: string;
  kind: NetVehiclePacket['kind'];
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  steering: number;
  wheelSpin: number;
  extra: number;
  ts: number;
};

type WireEventPayload = {
  msgId: string;
  type: NetWorldEventPacket['type'];
  senderId: string;
  worldId: WorldId;
  payloadJson: string;
  ts: number;
};

type WireControlPayload = {
  msgId: string;
  kind: 'hello' | 'ping' | 'pong' | 'bye';
  senderId: string;
  targetId: string | null;
  name: string;
  color: string;
  worldId: WorldId;
  joinedAt: number;
  t0: number;
};

type PeerJsBridgeFrame =
  | { ch: 'plr'; data: WirePlayerPayload }
  | { ch: 'veh'; data: WireVehiclePayload }
  | { ch: 'evt'; data: WireEventPayload }
  | { ch: 'ctl'; data: WireControlPayload };

interface PlayerSnapshot {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  recvMs: number;
}

interface VehicleSnapshot {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  steering: number;
  wheelSpin: number;
  extra: number;
  recvMs: number;
}

interface RemotePeerRecord {
  peerId: string;
  trysteroPeerId: string | null;
  name: string;
  color: string;
  worldId: WorldId;
  joinedAt: number;
  pingMs: number;
  lastSeenMs: number;
  anim: AvatarAnimState;
  tool: EquippedToolType;
  vehicleId: string | null;
  seatIndex: number;
  snapshots: PlayerSnapshot[];
  prevYaw: number;
  avatar: PlayerAvatar | null;
}

interface RemoteVehicleRecord {
  vehicleId: string;
  kind: NetVehiclePacket['kind'];
  ownerId: string;
  lastSeenMs: number;
  snapshots: VehicleSnapshot[];
  mesh: THREE.Group | null;
}

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const APP_ID = 'axeldelaro-3dgames-omniverse-v1';
const INTERP_DELAY_MS = 95;
const SEND_INTERVAL_MS = 62; // ~16 Hz network rate

const AVATAR_PALETTE = [
  '#28e0ff',
  '#ffb347',
  '#66f2a5',
  '#ff6b8b',
  '#a78bfa',
  '#ffd166'
];

export function hermite(p0: number, v0: number, p1: number, v1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * v0 + h01 * p1 + h11 * v1;
}

function lerpShortestAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  return a + diff * t;
}

export class NetworkManager implements INetworkManager {
  public readonly selfPeerId: string;
  private _roomCode: string;
  private _isHost = true;

  public playerName: string;
  public playerColor: string;

  private readonly selfJoinedAt = Date.now();
  private currentLocalWorldId: WorldId = 'metropolis';
  private lastSentAnim: AvatarAnimState = 'idle';
  private lastSentVehicleId: string | null = null;
  private lastSentTool: EquippedToolType = 'none';
  private lastPlayerSendMs = 0;
  private readonly lastVehicleSendMs = new Map<string, number>();

  private trysteroRoom: Room | null = null;
  private sendPlrAction: ((data: WirePlayerPayload) => Promise<void>) | null = null;
  private sendVehAction: ((data: WireVehiclePayload) => Promise<void>) | null = null;
  private sendEvtAction: ((data: WireEventPayload) => Promise<void>) | null = null;
  private sendCtlAction: ((data: WireControlPayload) => Promise<void>) | null = null;

  private peerJsInstance: Peer | null = null;
  private isPeerJsHub = false;
  private readonly peerJsConnections = new Set<DataConnection>();
  private heartbeatTimerId: number | null = null;

  private msgSeq = 0;
  private readonly seenMsgIds = new Set<string>();
  private readonly seenMsgQueue: string[] = [];

  private readonly peers = new Map<string, RemotePeerRecord>();
  private readonly remoteVehicles = new Map<string, RemoteVehicleRecord>();
  private readonly vehicleOccupancy = new Map<string, Map<number, string>>();

  private readonly worldEventListeners = new Set<(ev: NetWorldEventPacket) => void>();
  private readonly peersChangedListeners = new Set<(peers: ConnectedPeerSummary[]) => void>();

  private readonly tmpQuatA = new THREE.Quaternion();
  private readonly tmpQuatB = new THREE.Quaternion();
  private readonly tmpSeatVec = new THREE.Vector3();

  constructor() {
    this.selfPeerId = NetworkManager.generateRandomId('omni', 10);
    const paletteIdx = Math.floor(Math.random() * AVATAR_PALETTE.length);
    this.playerColor = AVATAR_PALETTE[paletteIdx];
    this.playerName = `Pilote-${this.selfPeerId.slice(-4).toUpperCase()}`;

    const urlCode = NetworkManager.extractRoomFromUrl();
    this._roomCode = urlCode ?? NetworkManager.generateRoomCode();
  }

  public get roomCode(): string {
    return this._roomCode;
  }

  public get isHost(): boolean {
    return this._isHost;
  }

  private static generateRandomId(prefix: string, len: number): string {
    let out = `${prefix}_`;
    for (let i = 0; i < len; i++) {
      out += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)].toLowerCase();
    }
    return out;
  }

  public static generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
    }
    return code;
  }

  private static sanitizeRoomCode(raw: string): string {
    const cleaned = raw
      .trim()
      .toUpperCase()
      .replace(/^OMNI-/, '')
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4);
    return cleaned.length >= 3 ? cleaned.padEnd(4, 'X') : NetworkManager.generateRoomCode();
  }

  private static extractRoomFromUrl(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r && r.trim().length >= 3) {
        return NetworkManager.sanitizeRoomCode(r);
      }
    } catch {
      // Ignore malformed URL
    }
    return null;
  }

  private nextMsgId(): string {
    this.msgSeq = (this.msgSeq + 1) % 1_000_000_000;
    return `${this.selfPeerId}:${this.msgSeq.toString(36)}`;
  }

  private markMessageSeen(msgId: string): boolean {
    if (!msgId || this.seenMsgIds.has(msgId)) {
      return false;
    }
    this.seenMsgIds.add(msgId);
    this.seenMsgQueue.push(msgId);
    if (this.seenMsgQueue.length > 600) {
      const oldest = this.seenMsgQueue.shift();
      if (oldest) {
        this.seenMsgIds.delete(oldest);
      }
    }
    return true;
  }

  public async joinOrCreateRoom(code: string): Promise<void> {
    const normalized = code.trim() ? NetworkManager.sanitizeRoomCode(code) : this._roomCode;
    await this.leaveRoom();
    this._roomCode = normalized;

    // 1. Start Serverless WebRTC Room via Trystero (Nostr signaling)
    try {
      const trysteroRoomName = `OMNI-${this._roomCode}`;
      const room: Room = joinRoom({ appId: APP_ID }, trysteroRoomName);
      this.trysteroRoom = room;

      const plrAction = room.makeAction<WirePlayerPayload>('plr');
      const vehAction = room.makeAction<WireVehiclePayload>('veh');
      const evtAction = room.makeAction<WireEventPayload>('evt');
      const ctlAction = room.makeAction<WireControlPayload>('ctl');

      this.sendPlrAction = (data) => plrAction.send(data);
      this.sendVehAction = (data) => vehAction.send(data);
      this.sendEvtAction = (data) => evtAction.send(data);
      this.sendCtlAction = (data) => ctlAction.send(data);

      plrAction.onMessage((data, ctx) => {
        this.handleIncomingPlayer(data, ctx.peerId);
      });
      vehAction.onMessage((data) => {
        this.handleIncomingVehicle(data);
      });
      evtAction.onMessage((data) => {
        this.handleIncomingWorldEvent(data);
      });
      ctlAction.onMessage((data, ctx) => {
        this.handleIncomingControl(data, ctx.peerId);
      });

      room.onPeerJoin((ctx) => {
        this.sendHello(ctx.peerId);
      });

      room.onPeerLeave((ctx) => {
        for (const [id, rec] of this.peers.entries()) {
          if (rec.trysteroPeerId === ctx.peerId && this.peerJsConnections.size === 0) {
            this.removePeer(id);
          }
        }
      });

      room.onError(() => {
        // Handled silently — PeerJS dual-channel bridge ensures continuous connectivity
      });
    } catch {
      this.trysteroRoom = null;
    }

    // 2. Start Automatic PeerJS Dual-Channel Fallback / Bridge for OMNI-<CODE>
    this.startPeerJsBridge(this._roomCode);

    // 3. Start PING/PONG latency & stale peer cleanup loop
    if (typeof window !== 'undefined') {
      this.heartbeatTimerId = window.setInterval(() => {
        this.tickHeartbeat();
      }, 2000);
    }

    this.recomputeHostElection();
    this.emitPeersChanged();
  }

  private startPeerJsBridge(code: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    const hostBrokerId = `omni-3dgames-v1-${code.toLowerCase()}`;

    try {
      const candidateHost = new Peer(hostBrokerId);
      this.peerJsInstance = candidateHost;
      this.isPeerJsHub = false;

      candidateHost.on('open', () => {
        if (this.peerJsInstance !== candidateHost) return;
        this.isPeerJsHub = true;
        this.recomputeHostElection();
      });

      candidateHost.on('connection', (conn: DataConnection) => {
        this.attachPeerJsConnection(conn, true);
      });

      candidateHost.on('error', (err) => {
        const errType = (err as { type?: string }).type;
        if (errType === 'unavailable-id' && this.peerJsInstance === candidateHost) {
          // Room hub already exists on PeerJS — connect as a PeerJS client to OMNI-<CODE>
          try {
            candidateHost.destroy();
          } catch {
            // Ignore destroy error
          }
          this.connectAsPeerJsClient(hostBrokerId);
        }
      });
    } catch {
      this.peerJsInstance = null;
    }
  }

  private connectAsPeerJsClient(hostBrokerId: string): void {
    try {
      const clientPeer = new Peer();
      this.peerJsInstance = clientPeer;
      this.isPeerJsHub = false;

      clientPeer.on('open', () => {
        if (this.peerJsInstance !== clientPeer) return;
        const conn = clientPeer.connect(hostBrokerId, { reliable: true });
        this.attachPeerJsConnection(conn, false);
      });

      clientPeer.on('connection', (conn: DataConnection) => {
        this.attachPeerJsConnection(conn, false);
      });

      clientPeer.on('error', () => {
        // Silent fallback if PeerServer unreachable
      });
    } catch {
      this.peerJsInstance = null;
    }
  }

  private attachPeerJsConnection(conn: DataConnection, actAsRelayHub: boolean): void {
    conn.on('open', () => {
      this.peerJsConnections.add(conn);
      this.sendHello(null);
    });

    conn.on('data', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const frame = raw as PeerJsBridgeFrame;
      if (!('ch' in frame) || !('data' in frame)) return;

      // If acting as the OMNI-<CODE> PeerJS star hub, relay frame to all other PeerJS clients
      if (actAsRelayHub && this.isPeerJsHub) {
        for (const other of this.peerJsConnections) {
          if (other !== conn && other.open) {
            try {
              void other.send(frame);
            } catch {
              // Ignore closed channel
            }
          }
        }
      }

      switch (frame.ch) {
        case 'plr':
          this.handleIncomingPlayer(frame.data, null);
          break;
        case 'veh':
          this.handleIncomingVehicle(frame.data);
          break;
        case 'evt':
          this.handleIncomingWorldEvent(frame.data);
          break;
        case 'ctl':
          this.handleIncomingControl(frame.data, null);
          break;
      }
    });

    const cleanup = (): void => {
      this.peerJsConnections.delete(conn);
    };
    conn.on('close', cleanup);
    conn.on('error', cleanup);
  }

  private dispatchFrame(frame: PeerJsBridgeFrame): void {
    this.markMessageSeen(frame.data.msgId);

    // 1. Send via Trystero WebRTC
    try {
      if (frame.ch === 'plr' && this.sendPlrAction) {
        void this.sendPlrAction(frame.data).catch(() => {});
      } else if (frame.ch === 'veh' && this.sendVehAction) {
        void this.sendVehAction(frame.data).catch(() => {});
      } else if (frame.ch === 'evt' && this.sendEvtAction) {
        void this.sendEvtAction(frame.data).catch(() => {});
      } else if (frame.ch === 'ctl' && this.sendCtlAction) {
        void this.sendCtlAction(frame.data).catch(() => {});
      }
    } catch {
      // Ignore transient WebRTC send errors
    }

    // 2. Send via PeerJS Bridge
    for (const conn of this.peerJsConnections) {
      if (conn.open) {
        try {
          void conn.send(frame);
        } catch {
          // Ignore send failure
        }
      }
    }
  }

  private sendHello(targetId: string | null): void {
    const payload: WireControlPayload = {
      msgId: this.nextMsgId(),
      kind: 'hello',
      senderId: this.selfPeerId,
      targetId,
      name: this.playerName,
      color: this.playerColor,
      worldId: this.currentLocalWorldId,
      joinedAt: this.selfJoinedAt,
      t0: Date.now()
    };
    this.dispatchFrame({ ch: 'ctl', data: payload });
  }

  private tickHeartbeat(): void {
    const now = Date.now();

    // Send PING broadcast
    const pingMsg: WireControlPayload = {
      msgId: this.nextMsgId(),
      kind: 'ping',
      senderId: this.selfPeerId,
      targetId: null,
      name: this.playerName,
      color: this.playerColor,
      worldId: this.currentLocalWorldId,
      joinedAt: this.selfJoinedAt,
      t0: now
    };
    this.dispatchFrame({ ch: 'ctl', data: pingMsg });

    // Also sample Trystero native RTT ping if available
    if (this.trysteroRoom) {
      for (const peer of this.peers.values()) {
        if (peer.trysteroPeerId) {
          void this.trysteroRoom
            .ping(peer.trysteroPeerId)
            .then((rtt) => {
              if (Number.isFinite(rtt) && rtt > 0) {
                peer.pingMs = Math.round(peer.pingMs * 0.6 + rtt * 0.4);
                peer.lastSeenMs = Date.now();
              }
            })
            .catch(() => {});
        }
      }
    }

    // Prune timed-out peers (> 16s silent)
    let removedAny = false;
    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastSeenMs > 16000) {
        this.disposePeerVisuals(peer);
        this.peers.delete(peerId);
        removedAny = true;
      }
    }

    if (removedAny) {
      this.rebuildOccupancyTable();
      this.recomputeHostElection();
      this.emitPeersChanged();
    } else {
      this.emitPeersChanged();
    }
  }

  public async leaveRoom(): Promise<void> {
    if (this.trysteroRoom || this.peerJsConnections.size > 0) {
      const byeMsg: WireControlPayload = {
        msgId: this.nextMsgId(),
        kind: 'bye',
        senderId: this.selfPeerId,
        targetId: null,
        name: this.playerName,
        color: this.playerColor,
        worldId: this.currentLocalWorldId,
        joinedAt: this.selfJoinedAt,
        t0: Date.now()
      };
      this.dispatchFrame({ ch: 'ctl', data: byeMsg });
    }

    if (this.heartbeatTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.heartbeatTimerId);
      this.heartbeatTimerId = null;
    }

    if (this.trysteroRoom) {
      try {
        await this.trysteroRoom.leave();
      } catch {
        // Ignore room leave errors
      }
      this.trysteroRoom = null;
    }

    this.sendPlrAction = null;
    this.sendVehAction = null;
    this.sendEvtAction = null;
    this.sendCtlAction = null;

    for (const conn of this.peerJsConnections) {
      try {
        conn.close();
      } catch {
        // Ignore
      }
    }
    this.peerJsConnections.clear();

    if (this.peerJsInstance) {
      try {
        this.peerJsInstance.destroy();
      } catch {
        // Ignore
      }
      this.peerJsInstance = null;
    }
    this.isPeerJsHub = false;

    for (const peer of this.peers.values()) {
      this.disposePeerVisuals(peer);
    }
    this.peers.clear();

    for (const veh of this.remoteVehicles.values()) {
      if (veh.mesh && veh.mesh.parent) {
        veh.mesh.parent.remove(veh.mesh);
      }
    }
    this.remoteVehicles.clear();
    this.vehicleOccupancy.clear();

    this._isHost = true;
    this.emitPeersChanged();
  }

  public getInviteUrl(): string {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return `${window.location.origin}${window.location.pathname}?room=${this._roomCode}`;
      }
    }
    return `https://axeldelaro.github.io/3dgames/?room=${this._roomCode}`;
  }

  public getConnectedPeers(): ConnectedPeerSummary[] {
    const hostId = this.determineHostPeerId();
    const list: ConnectedPeerSummary[] = [];
    for (const p of this.peers.values()) {
      list.push({
        peerId: p.peerId,
        name: p.name,
        color: p.color,
        pingMs: p.pingMs,
        isHost: p.peerId === hostId,
        worldId: p.worldId
      });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  public getVehicleSeats(vehicleId: string): ReadonlyMap<number, string> {
    return this.vehicleOccupancy.get(vehicleId) ?? new Map<number, string>();
  }

  public broadcastLocalPlayer(
    packet: Omit<NetPlayerPacket, 'peerId' | 'name' | 'color' | 'ts'>
  ): void {
    this.currentLocalWorldId = packet.worldId;

    const nowPerf = performance.now();
    const urgentChange =
      packet.anim !== this.lastSentAnim ||
      packet.vehicleId !== this.lastSentVehicleId ||
      packet.tool !== this.lastSentTool;

    if (!urgentChange && nowPerf - this.lastPlayerSendMs < SEND_INTERVAL_MS) {
      return;
    }

    this.lastPlayerSendMs = nowPerf;
    this.lastSentAnim = packet.anim;
    this.lastSentVehicleId = packet.vehicleId;
    this.lastSentTool = packet.tool;

    // Track local player's vehicle occupancy too
    this.updateSeatOccupancy(this.selfPeerId, packet.vehicleId, packet.seatIndex);

    if (!this.trysteroRoom && this.peerJsConnections.size === 0) {
      return;
    }

    const wire: WirePlayerPayload = {
      msgId: this.nextMsgId(),
      peerId: this.selfPeerId,
      name: this.playerName,
      color: this.playerColor,
      worldId: packet.worldId,
      x: packet.x,
      y: packet.y,
      z: packet.z,
      vx: packet.vx,
      vy: packet.vy,
      vz: packet.vz,
      yaw: packet.yaw,
      pitch: packet.pitch,
      anim: packet.anim,
      tool: packet.tool,
      vehicleId: packet.vehicleId,
      seatIndex: packet.seatIndex,
      joinedAt: this.selfJoinedAt,
      ts: Date.now()
    };

    this.dispatchFrame({ ch: 'plr', data: wire });
  }

  public broadcastVehicle(packet: Omit<NetVehiclePacket, 'ownerId' | 'ts'>): void {
    if (!this.trysteroRoom && this.peerJsConnections.size === 0) {
      return;
    }

    const nowPerf = performance.now();
    const lastMs = this.lastVehicleSendMs.get(packet.vehicleId) ?? 0;
    if (nowPerf - lastMs < SEND_INTERVAL_MS) {
      return;
    }
    this.lastVehicleSendMs.set(packet.vehicleId, nowPerf);

    const wire: WireVehiclePayload = {
      msgId: this.nextMsgId(),
      vehicleId: packet.vehicleId,
      kind: packet.kind,
      ownerId: this.selfPeerId,
      x: packet.x,
      y: packet.y,
      z: packet.z,
      vx: packet.vx,
      vy: packet.vy,
      vz: packet.vz,
      qx: packet.qx,
      qy: packet.qy,
      qz: packet.qz,
      qw: packet.qw,
      steering: packet.steering,
      wheelSpin: packet.wheelSpin,
      extra: packet.extra,
      ts: Date.now()
    };

    this.dispatchFrame({ ch: 'veh', data: wire });
  }

  public broadcastWorldEvent(
    type: NetWorldEventPacket['type'],
    worldId: WorldId,
    payload: NetWorldEventPacket['payload']
  ): void {
    if (!this.trysteroRoom && this.peerJsConnections.size === 0) {
      return;
    }

    const wire: WireEventPayload = {
      msgId: this.nextMsgId(),
      type,
      senderId: this.selfPeerId,
      worldId,
      payloadJson: JSON.stringify(payload),
      ts: Date.now()
    };

    this.dispatchFrame({ ch: 'evt', data: wire });
  }

  public onWorldEvent(listener: (ev: NetWorldEventPacket) => void): () => void {
    this.worldEventListeners.add(listener);
    return () => {
      this.worldEventListeners.delete(listener);
    };
  }

  public onPeersChanged(listener: (peers: ConnectedPeerSummary[]) => void): () => void {
    this.peersChangedListeners.add(listener);
    return () => {
      this.peersChangedListeners.delete(listener);
    };
  }

  private handleIncomingControl(data: WireControlPayload, trysteroPeerId: string | null): void {
    if (data.senderId === this.selfPeerId || !this.markMessageSeen(data.msgId)) {
      return;
    }

    if (data.kind === 'bye') {
      this.removePeer(data.senderId);
      return;
    }

    const now = Date.now();
    let peer = this.peers.get(data.senderId);
    let isNew = false;

    if (!peer) {
      peer = {
        peerId: data.senderId,
        trysteroPeerId,
        name: data.name,
        color: data.color,
        worldId: data.worldId,
        joinedAt: data.joinedAt,
        pingMs: 36,
        lastSeenMs: now,
        anim: 'idle',
        tool: 'none',
        vehicleId: null,
        seatIndex: 0,
        snapshots: [],
        prevYaw: 0,
        avatar: null
      };
      this.peers.set(data.senderId, peer);
      isNew = true;
    } else {
      if (trysteroPeerId) {
        peer.trysteroPeerId = trysteroPeerId;
      }
      peer.name = data.name;
      peer.color = data.color;
      peer.worldId = data.worldId;
      peer.joinedAt = Math.min(peer.joinedAt, data.joinedAt);
      peer.lastSeenMs = now;
    }

    if (data.kind === 'hello' && (data.targetId === null || data.targetId === this.selfPeerId)) {
      if (isNew) {
        // Reply with targeted hello so new peer discovers us immediately
        const reply: WireControlPayload = {
          msgId: this.nextMsgId(),
          kind: 'hello',
          senderId: this.selfPeerId,
          targetId: data.senderId,
          name: this.playerName,
          color: this.playerColor,
          worldId: this.currentLocalWorldId,
          joinedAt: this.selfJoinedAt,
          t0: now
        };
        this.dispatchFrame({ ch: 'ctl', data: reply });
      }
    } else if (data.kind === 'ping') {
      const pong: WireControlPayload = {
        msgId: this.nextMsgId(),
        kind: 'pong',
        senderId: this.selfPeerId,
        targetId: data.senderId,
        name: this.playerName,
        color: this.playerColor,
        worldId: this.currentLocalWorldId,
        joinedAt: this.selfJoinedAt,
        t0: data.t0
      };
      this.dispatchFrame({ ch: 'ctl', data: pong });
    } else if (data.kind === 'pong' && data.targetId === this.selfPeerId) {
      const rtt = Math.max(4, Math.min(999, now - data.t0));
      peer.pingMs = Math.round(peer.pingMs * 0.55 + rtt * 0.45);
    }

    if (isNew) {
      this.recomputeHostElection();
      this.emitPeersChanged();
    }
  }

  private handleIncomingPlayer(data: WirePlayerPayload, trysteroPeerId: string | null): void {
    if (data.peerId === this.selfPeerId || !this.markMessageSeen(data.msgId)) {
      return;
    }

    const recvMs = performance.now();
    const wallNow = Date.now();
    let peer = this.peers.get(data.peerId);
    let peersDirty = false;

    if (!peer) {
      peer = {
        peerId: data.peerId,
        trysteroPeerId,
        name: data.name,
        color: data.color,
        worldId: data.worldId,
        joinedAt: data.joinedAt || wallNow,
        pingMs: 38,
        lastSeenMs: wallNow,
        anim: data.anim,
        tool: data.tool,
        vehicleId: data.vehicleId,
        seatIndex: data.seatIndex,
        snapshots: [],
        prevYaw: data.yaw,
        avatar: null
      };
      this.peers.set(data.peerId, peer);
      peersDirty = true;
    } else {
      if (
        peer.name !== data.name ||
        peer.color !== data.color ||
        peer.worldId !== data.worldId
      ) {
        peersDirty = true;
      }
      if (trysteroPeerId) {
        peer.trysteroPeerId = trysteroPeerId;
      }
      peer.name = data.name;
      peer.color = data.color;
      peer.worldId = data.worldId;
      peer.joinedAt = Math.min(peer.joinedAt, data.joinedAt || peer.joinedAt);
      peer.lastSeenMs = wallNow;
      peer.anim = data.anim;
      peer.tool = data.tool;
      peer.vehicleId = data.vehicleId;
      peer.seatIndex = data.seatIndex;
    }

    peer.snapshots.push({
      x: data.x,
      y: data.y,
      z: data.z,
      vx: data.vx,
      vy: data.vy,
      vz: data.vz,
      yaw: data.yaw,
      pitch: data.pitch,
      recvMs
    });
    if (peer.snapshots.length > 10) {
      peer.snapshots.shift();
    }

    this.updateSeatOccupancy(data.peerId, data.vehicleId, data.seatIndex);

    if (peersDirty) {
      this.recomputeHostElection();
      this.emitPeersChanged();
    }
  }

  private handleIncomingVehicle(data: WireVehiclePayload): void {
    if (data.ownerId === this.selfPeerId || !this.markMessageSeen(data.msgId)) {
      return;
    }

    const recvMs = performance.now();
    const wallNow = Date.now();
    let veh = this.remoteVehicles.get(data.vehicleId);

    if (!veh) {
      veh = {
        vehicleId: data.vehicleId,
        kind: data.kind,
        ownerId: data.ownerId,
        lastSeenMs: wallNow,
        snapshots: [],
        mesh: null
      };
      this.remoteVehicles.set(data.vehicleId, veh);
    } else {
      veh.ownerId = data.ownerId;
      veh.kind = data.kind;
      veh.lastSeenMs = wallNow;
    }

    veh.snapshots.push({
      x: data.x,
      y: data.y,
      z: data.z,
      vx: data.vx,
      vy: data.vy,
      vz: data.vz,
      qx: data.qx,
      qy: data.qy,
      qz: data.qz,
      qw: data.qw,
      steering: data.steering,
      wheelSpin: data.wheelSpin,
      extra: data.extra,
      recvMs
    });
    if (veh.snapshots.length > 10) {
      veh.snapshots.shift();
    }
  }

  private handleIncomingWorldEvent(data: WireEventPayload): void {
    if (data.senderId === this.selfPeerId || !this.markMessageSeen(data.msgId)) {
      return;
    }

    let parsedPayload: NetWorldEventPacket['payload'] = {};
    try {
      const raw = JSON.parse(data.payloadJson) as unknown;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        parsedPayload = raw as NetWorldEventPacket['payload'];
      }
    } catch {
      parsedPayload = {};
    }

    const ev: NetWorldEventPacket = {
      type: data.type,
      senderId: data.senderId,
      worldId: data.worldId,
      payload: parsedPayload,
      ts: data.ts
    };

    for (const listener of this.worldEventListeners) {
      listener(ev);
    }
  }

  private updateSeatOccupancy(
    peerId: string,
    vehicleId: string | null,
    seatIndex: number
  ): void {
    for (const [vid, seats] of this.vehicleOccupancy.entries()) {
      for (const [seat, occupant] of seats.entries()) {
        if (occupant === peerId && (vid !== vehicleId || seat !== seatIndex)) {
          seats.delete(seat);
        }
      }
      if (seats.size === 0) {
        this.vehicleOccupancy.delete(vid);
      }
    }

    if (vehicleId) {
      let seats = this.vehicleOccupancy.get(vehicleId);
      if (!seats) {
        seats = new Map<number, string>();
        this.vehicleOccupancy.set(vehicleId, seats);
      }
      seats.set(seatIndex, peerId);
    }
  }

  private rebuildOccupancyTable(): void {
    this.vehicleOccupancy.clear();
    for (const peer of this.peers.values()) {
      if (peer.vehicleId) {
        this.updateSeatOccupancy(peer.peerId, peer.vehicleId, peer.seatIndex);
      }
    }
  }

  private determineHostPeerId(): string {
    let bestId = this.selfPeerId;
    let bestJoinedAt = this.selfJoinedAt;

    for (const peer of this.peers.values()) {
      if (
        peer.joinedAt < bestJoinedAt ||
        (peer.joinedAt === bestJoinedAt && peer.peerId < bestId)
      ) {
        bestJoinedAt = peer.joinedAt;
        bestId = peer.peerId;
      }
    }
    return bestId;
  }

  private recomputeHostElection(): void {
    this._isHost = this.determineHostPeerId() === this.selfPeerId;
  }

  private removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    this.disposePeerVisuals(peer);
    this.peers.delete(peerId);
    this.rebuildOccupancyTable();
    this.recomputeHostElection();
    this.emitPeersChanged();
  }

  private disposePeerVisuals(peer: RemotePeerRecord): void {
    if (peer.avatar) {
      if (peer.avatar.root.parent) {
        peer.avatar.root.parent.remove(peer.avatar.root);
      }
      peer.avatar.dispose();
      peer.avatar = null;
    }
  }

  private emitPeersChanged(): void {
    const summary = this.getConnectedPeers();
    for (const listener of this.peersChangedListeners) {
      listener(summary);
    }
  }

  private createStylizedVehicleProxy(kind: NetVehiclePacket['kind']): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: kind === 'galleon' ? 0x6f4728 : 0x22324d,
      roughness: kind === 'galleon' ? 0.72 : 0.24,
      metalness: kind === 'galleon' ? 0.1 : 0.7,
      clearcoat: kind === 'galleon' ? 0.1 : 0.85
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x28e0ff,
      emissive: 0x18a8cc,
      emissiveIntensity: 1.5,
      roughness: 0.25,
      metalness: 0.5
    });

    if (kind === 'jet' || kind === 'starfighter') {
      const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.9, 6.2, 10), bodyMat);
      fuselage.rotation.x = Math.PI * 0.5;
      group.add(fuselage);

      const wings = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 1.9), bodyMat);
      wings.position.set(0, 0, -0.4);
      group.add(wings);

      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.5, 12), trimMat);
      thruster.rotation.x = Math.PI * 0.5;
      thruster.position.set(0, 0, -3.1);
      group.add(thruster);
    } else if (kind === 'galleon') {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 12.0), bodyMat);
      hull.position.y = 0.8;
      group.add(hull);

      const sailMat = new THREE.MeshStandardMaterial({
        color: 0xf0ead8,
        roughness: 0.82,
        metalness: 0.04,
        side: THREE.DoubleSide
      });
      const sail = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.8, 0.12), sailMat);
      sail.position.set(0, 4.4, 0.4);
      group.add(sail);
    } else if (kind === 'heli') {
      const cabin = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 12), bodyMat);
      cabin.scale.set(0.95, 0.9, 1.65);
      cabin.position.y = 1.3;
      group.add(cabin);

      const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 0.28), trimMat);
      rotor.position.set(0, 2.55, 0);
      rotor.name = 'rotor';
      group.add(rotor);
    } else {
      const width = kind === 'moto' ? 0.72 : 1.95;
      const height = kind === 'truck4x4' ? 1.35 : 0.85;
      const length = kind === 'moto' ? 2.1 : 4.4;
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), bodyMat);
      chassis.position.y = height * 0.5 + 0.35;
      chassis.castShadow = true;
      group.add(chassis);

      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.12, 0.08), trimMat);
      lightBar.position.set(0, height * 0.45 + 0.35, length * 0.5);
      group.add(lightBar);
    }

    return group;
  }

  private samplePlayerHermite(
    snapshots: PlayerSnapshot[],
    renderTimeMs: number
  ): { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number } | null {
    const count = snapshots.length;
    if (count === 0) {
      return null;
    }
    if (count === 1) {
      const s = snapshots[0];
      return { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, yaw: s.yaw };
    }

    // Find bracketing pair [s0, s1] around renderTimeMs
    let idx = count - 2;
    for (let i = 0; i < count - 1; i++) {
      if (renderTimeMs >= snapshots[i].recvMs && renderTimeMs <= snapshots[i + 1].recvMs) {
        idx = i;
        break;
      }
    }

    const s0 = snapshots[idx];
    const s1 = snapshots[idx + 1];

    if (renderTimeMs > snapshots[count - 1].recvMs) {
      const latest = snapshots[count - 1];
      const extrapSec = Math.min(0.18, (renderTimeMs - latest.recvMs) / 1000);
      return {
        x: latest.x + latest.vx * extrapSec,
        y: latest.y + latest.vy * extrapSec,
        z: latest.z + latest.vz * extrapSec,
        vx: latest.vx,
        vy: latest.vy,
        vz: latest.vz,
        yaw: latest.yaw
      };
    }

    const spanMs = Math.max(16, s1.recvMs - s0.recvMs);
    const spanSec = spanMs / 1000;
    const t = Math.max(0, Math.min(1, (renderTimeMs - s0.recvMs) / spanMs));

    return {
      x: hermite(s0.x, s0.vx * spanSec, s1.x, s1.vx * spanSec, t),
      y: hermite(s0.y, s0.vy * spanSec, s1.y, s1.vy * spanSec, t),
      z: hermite(s0.z, s0.vz * spanSec, s1.z, s1.vz * spanSec, t),
      vx: s0.vx + (s1.vx - s0.vx) * t,
      vy: s0.vy + (s1.vy - s0.vy) * t,
      vz: s0.vz + (s1.vz - s0.vz) * t,
      yaw: lerpShortestAngle(s0.yaw, s1.yaw, t)
    };
  }

  public syncRemoteEntities(
    scene: THREE.Scene,
    currentWorldId: WorldId,
    dt: number
  ): MinimapMarker[] {
    this.currentLocalWorldId = currentWorldId;
    const markers: MinimapMarker[] = [];
    const renderTimeMs = performance.now() - INTERP_DELAY_MS;
    const wallNow = Date.now();
    const safeDt = Math.max(0.001, Math.min(0.1, dt));

    // 1. Interpolate remote vehicles
    for (const [vid, veh] of this.remoteVehicles.entries()) {
      const owner = this.peers.get(veh.ownerId);
      const activeInWorld = owner && owner.worldId === currentWorldId && wallNow - veh.lastSeenMs < 10000;

      if (!activeInWorld || veh.snapshots.length === 0) {
        if (veh.mesh && veh.mesh.parent) {
          veh.mesh.parent.remove(veh.mesh);
        }
        if (wallNow - veh.lastSeenMs > 15000) {
          this.remoteVehicles.delete(vid);
        }
        continue;
      }

      if (!veh.mesh) {
        veh.mesh = this.createStylizedVehicleProxy(veh.kind);
      }
      if (veh.mesh.parent !== scene) {
        scene.add(veh.mesh);
      }

      const snaps = veh.snapshots;
      const lastIdx = snaps.length - 1;
      let s0 = snaps[Math.max(0, lastIdx - 1)];
      let s1 = snaps[lastIdx];
      for (let i = 0; i < lastIdx; i++) {
        if (renderTimeMs >= snaps[i].recvMs && renderTimeMs <= snaps[i + 1].recvMs) {
          s0 = snaps[i];
          s1 = snaps[i + 1];
          break;
        }
      }

      const spanMs = Math.max(16, s1.recvMs - s0.recvMs);
      const spanSec = spanMs / 1000;
      const t = Math.max(0, Math.min(1, (renderTimeMs - s0.recvMs) / spanMs));

      const vx = hermite(s0.x, s0.vx * spanSec, s1.x, s1.vx * spanSec, t);
      const vy = hermite(s0.y, s0.vy * spanSec, s1.y, s1.vy * spanSec, t);
      const vz = hermite(s0.z, s0.vz * spanSec, s1.z, s1.vz * spanSec, t);

      veh.mesh.position.set(vx, vy, vz);
      this.tmpQuatA.set(s0.qx, s0.qy, s0.qz, s0.qw);
      this.tmpQuatB.set(s1.qx, s1.qy, s1.qz, s1.qw);
      veh.mesh.quaternion.slerpQuaternions(this.tmpQuatA, this.tmpQuatB, t);

      if (veh.kind === 'heli') {
        const rotor = veh.mesh.getObjectByName('rotor');
        if (rotor) {
          rotor.rotation.y += safeDt * 28;
        }
      }

      markers.push({
        id: `veh_${veh.vehicleId}`,
        x: vx,
        z: vz,
        color: '#ffb347',
        type: 'vehicle',
        label: veh.kind.toUpperCase()
      });
    }

    // 2. Interpolate & animate remote player avatars via Cubic Hermite Spline
    for (const peer of this.peers.values()) {
      if (peer.worldId !== currentWorldId || peer.snapshots.length === 0) {
        if (peer.avatar && peer.avatar.root.parent) {
          peer.avatar.root.parent.remove(peer.avatar.root);
        }
        continue;
      }

      if (!peer.avatar) {
        peer.avatar = new PlayerAvatar(peer.color);
      }
      if (peer.avatar.root.parent !== scene) {
        scene.add(peer.avatar.root);
      }

      peer.avatar.setAccentColor(peer.color);
      peer.avatar.setNameplate(peer.name, peer.color);
      if (peer.avatar.getEquippedTool() !== peer.tool) {
        peer.avatar.setEquippedTool(peer.tool);
      }

      const sampled = this.samplePlayerHermite(peer.snapshots, renderTimeMs);
      if (!sampled) {
        continue;
      }

      // Multi-seat vehicle occupancy placement if seated in a synced vehicle
      const remoteVeh = peer.vehicleId ? this.remoteVehicles.get(peer.vehicleId) : undefined;
      if (peer.vehicleId && remoteVeh && remoteVeh.mesh && remoteVeh.mesh.parent === scene) {
        const seatSide = peer.seatIndex % 2 === 0 ? -0.44 : 0.44;
        const seatRow = Math.floor(peer.seatIndex / 2) * -0.9;
        this.tmpSeatVec.set(
          remoteVeh.kind === 'moto' ? 0 : seatSide,
          0.32,
          0.15 + seatRow
        );
        this.tmpSeatVec.applyQuaternion(remoteVeh.mesh.quaternion);
        peer.avatar.root.position.copy(remoteVeh.mesh.position).add(this.tmpSeatVec);
        peer.avatar.root.quaternion.copy(remoteVeh.mesh.quaternion);
        peer.avatar.updateAnimation(safeDt, 'drive', 0, 0, 0);
      } else {
        peer.avatar.root.rotation.set(0, sampled.yaw, 0);
        peer.avatar.root.position.set(sampled.x, sampled.y, sampled.z);

        let yawDelta = sampled.yaw - peer.prevYaw;
        if (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        if (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        const turnRate = yawDelta / safeDt;
        peer.prevYaw = sampled.yaw;

        const horizSpeed = Math.hypot(sampled.vx, sampled.vz);
        peer.avatar.setParagliderVisible(peer.anim === 'glide');
        peer.avatar.setJetpackFlame(peer.anim === 'jump' && sampled.vy > 2.5 ? 0.85 : 0);
        peer.avatar.updateAnimation(safeDt, peer.anim, horizSpeed, turnRate, 0);
      }

      markers.push({
        id: peer.peerId,
        x: peer.avatar.root.position.x,
        z: peer.avatar.root.position.z,
        color: peer.color,
        type: 'peer',
        label: peer.name
      });
    }

    return markers;
  }

  public getAveragePing(): number {
    if (this.peers.size === 0) {
      return 0;
    }
    let sum = 0;
    for (const peer of this.peers.values()) {
      sum += peer.pingMs;
    }
    return Math.round(sum / this.peers.size);
  }
}
