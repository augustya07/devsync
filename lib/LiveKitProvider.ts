/**
 * LiveKit Yjs Provider
 * 
 * A custom Yjs provider that synchronizes Yjs documents via LiveKit data channels.
 * Uses reliable data channels for document updates and unreliable for cursor awareness.
 * 
 * @description This provider bridges Yjs CRDT documents with LiveKit's real-time
 * infrastructure, enabling collaborative editing without a separate WebSocket server.
 */

import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { Room, LocalParticipant, RoomEvent, DataPacket_Kind } from 'livekit-client';

const DOC_TOPIC = 'code-editor';
const AWARENESS_TOPIC = 'code-awareness';
const SYNC_REQUEST_TOPIC = 'code-sync-request';
const SYNC_RESPONSE_TOPIC = 'code-sync-response';

export interface LiveKitProviderOptions {
    /** Yjs document to sync */
    doc: Y.Doc;
    /** Awareness instance for cursor sharing */
    awareness?: Awareness;
}

export class LiveKitYjsProvider {
    private doc: Y.Doc;
    private awareness: Awareness;
    private room: Room | null = null;
    private localParticipant: LocalParticipant | null = null;
    private connected: boolean = false;
    private synced: boolean = false;
    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    constructor(options: LiveKitProviderOptions) {
        this.doc = options.doc;
        this.awareness = options.awareness || new Awareness(this.doc);

        // Listen for local document updates
        this.doc.on('update', this.handleLocalUpdate);

        // Listen for local awareness changes
        this.awareness.on('update', this.handleAwarenessUpdate);
    }

    /**
     * Connect the provider to a LiveKit room
     */
    connect(room: Room, localParticipant: LocalParticipant) {
        if (this.connected) {
            console.warn('[LiveKitProvider] Already connected');
            return;
        }

        this.room = room;
        this.localParticipant = localParticipant;
        this.connected = true;

        // Listen for incoming data
        room.on(RoomEvent.DataReceived, this.handleDataReceived);

        // Request sync from existing participants
        this.requestSync();

        console.log('[LiveKitProvider] Connected to room');
    }

    /**
     * Disconnect from the room
     */
    disconnect() {
        if (!this.connected) return;

        if (this.room) {
            this.room.off(RoomEvent.DataReceived, this.handleDataReceived);
        }

        this.room = null;
        this.localParticipant = null;
        this.connected = false;
        this.synced = false;

        console.log('[LiveKitProvider] Disconnected');
    }

    /**
     * Request full document state from existing participants
     */
    private requestSync = async () => {
        if (!this.localParticipant || !this.connected) return;

        // Small delay to ensure connection is established
        await new Promise(r => setTimeout(r, 1000));

        // Check again after delay - provider might have been disconnected
        if (!this.localParticipant || !this.connected) return;

        // Check room connection state
        if (this.room?.state !== 'connected') {
            console.log('[LiveKitProvider] Skipping sync request - room not connected');
            return;
        }

        try {
            const data = JSON.stringify({ type: 'sync-request' });
            await this.localParticipant.publishData(this.encoder.encode(data), {
                reliable: true,
                topic: SYNC_REQUEST_TOPIC,
            });
            console.log('[LiveKitProvider] Sent sync request');
        } catch (err) {
            console.warn('[LiveKitProvider] Failed to send sync request:', err);
        }
    };

    /**
     * Handle incoming data from LiveKit
     */
    private handleDataReceived = (
        payload: Uint8Array,
        participant: any,
        _kind?: DataPacket_Kind,
        topic?: string
    ) => {
        // Ignore our own messages
        if (participant?.identity === this.localParticipant?.identity) return;

        try {
            if (topic === DOC_TOPIC) {
                // Document update - apply with 'this' as origin to prevent re-broadcast
                Y.applyUpdate(this.doc, payload, this);
            } else if (topic === AWARENESS_TOPIC) {
                // Awareness update
                applyAwarenessUpdate(this.awareness, payload, participant);
            } else if (topic === SYNC_REQUEST_TOPIC) {
                // Someone requested sync - send full state
                this.sendFullState();
            } else if (topic === SYNC_RESPONSE_TOPIC) {
                // Received full state from existing participant
                if (!this.synced) {
                    Y.applyUpdate(this.doc, payload, this);
                    this.synced = true;
                    console.log('[LiveKitProvider] Synced with existing state');
                }
            }
        } catch (err) {
            console.error('[LiveKitProvider] Error processing data:', err);
        }
    };

    /**
     * Send full document state to all participants
     */
    private sendFullState = async () => {
        if (!this.localParticipant || !this.connected) return;
        if (this.room?.state !== 'connected') return;

        try {
            const state = Y.encodeStateAsUpdate(this.doc);
            await this.localParticipant.publishData(state, {
                reliable: true,
                topic: SYNC_RESPONSE_TOPIC,
            });
            console.log('[LiveKitProvider] Sent full state');
        } catch (err) {
            console.warn('[LiveKitProvider] Failed to send full state:', err);
        }
    };

    /**
     * Handle local document updates and broadcast them
     */
    private handleLocalUpdate = async (update: Uint8Array, origin: any) => {
        // Don't broadcast updates from remote
        if (origin === this) return;
        if (!this.localParticipant || !this.connected) return;
        if (this.room?.state !== 'connected') return;

        try {
            await this.localParticipant.publishData(update, {
                reliable: true,
                topic: DOC_TOPIC,
            });
        } catch (err) {
            console.warn('[LiveKitProvider] Failed to publish update:', err);
        }
    };

    /**
     * Handle local awareness changes and broadcast them
     */
    private handleAwarenessUpdate = async ({ added, updated, removed }: {
        added: number[];
        updated: number[];
        removed: number[];
    }) => {
        if (!this.localParticipant || !this.connected) return;
        if (this.room?.state !== 'connected') return;

        try {
            const changedClients = [...added, ...updated, ...removed];
            const awarenessUpdate = encodeAwarenessUpdate(this.awareness, changedClients);

            await this.localParticipant.publishData(awarenessUpdate, {
                reliable: false, // Cursors are ephemeral, use unreliable for speed
                topic: AWARENESS_TOPIC,
            });
        } catch (err) {
            // Don't log every awareness update failure - they're frequent and ephemeral
        }
    };

    /**
     * Set awareness state (e.g., cursor position)
     */
    setAwarenessState(state: Record<string, any>) {
        this.awareness.setLocalStateField('user', state);
    }

    /**
     * Get the awareness instance
     */
    getAwareness(): Awareness {
        return this.awareness;
    }

    /**
     * Get the Yjs document
     */
    getDoc(): Y.Doc {
        return this.doc;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Destroy the provider
     */
    destroy() {
        this.disconnect();
        this.doc.off('update', this.handleLocalUpdate);
        this.awareness.off('update', this.handleAwarenessUpdate);
        this.awareness.destroy();
    }
}
