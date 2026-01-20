/**
 * Custom Hooks Library
 * 
 * A collection of reusable hooks for WebRTC and real-time collaboration features.
 * These hooks abstract away the complexity of LiveKit's API and provide
 * a clean interface for common real-time operations.
 */

export { usePresence, type CursorPosition, type ParticipantCursor, type CursorMap } from './usePresence';
export { useConnectionQuality, type QualityLevel, type ConnectionStats, type QualityInfo } from './useConnectionQuality';

