
'use client';

import { useCallback, useState, useRef } from 'react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Upload, FileText, Image, File, Download, Eye,
    Loader2, CheckCircle, AlertCircle, Paperclip
} from 'lucide-react';

export interface SharedFile {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    sender: string;
    timestamp: Date;
    data?: Blob;
    progress?: number;
    status: 'uploading' | 'complete' | 'error';
}

interface FileSharingProps {
    isOpen: boolean;
    onClose: () => void;
    sharedFiles: SharedFile[];
    onFileUploaded: (file: SharedFile) => void;
    onFileProgress: (id: string, progress: number) => void;
    onFileComplete: (id: string, data?: Blob) => void;
    onFileError: (id: string) => void;
}

export const FILE_TOPIC = 'shared-files';

// Format file size for display
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Get icon based on file type
function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
}

export default function FileSharing({
    isOpen,
    onClose,
    sharedFiles,
    onFileUploaded,
    onFileProgress,
    onFileComplete,
    onFileError,
}: FileSharingProps) {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file selection
    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0 || !localParticipant) return;

        const file = files[0];
        const fileId = `${Date.now()}-${Math.random()}`;

        // Add to local list immediately
        const newFile: SharedFile = {
            id: fileId,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            sender: localParticipant.identity,
            timestamp: new Date(),
            data: file,
            status: 'uploading',
            progress: 0,
        };

        onFileUploaded(newFile);
        setUploadProgress(0);

        try {
            // Send file using LiveKit's byte streams
            await localParticipant.sendFile(file, {
                mimeType: file.type,
                topic: FILE_TOPIC,
                onProgress: (progress: number) => {
                    const percent = Math.round(progress * 100);
                    setUploadProgress(percent);
                    onFileProgress(fileId, percent);
                },
            });

            onFileComplete(fileId, file);
            setUploadProgress(null);
        } catch (err) {
            console.error('[FileSharing] Error sending file:', err);
            onFileError(fileId);
            setUploadProgress(null);
        }
    }, [localParticipant, onFileUploaded, onFileProgress, onFileComplete, onFileError]);

    // Handle drag events
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    // Download file
    const downloadFile = useCallback((file: SharedFile) => {
        if (!file.data) return;
        const url = URL.createObjectURL(file.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    // Preview file (for images)
    const previewFile = useCallback((file: SharedFile) => {
        if (!file.data) return;
        const url = URL.createObjectURL(file.data);
        window.open(url, '_blank');
    }, []);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 top-4 bottom-24 w-80 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Paperclip size={18} className="text-indigo-400" />
                    <span className="font-medium text-white">Shared Files</span>
                    {sharedFiles.length > 0 && (
                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                            {sharedFiles.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Upload Area */}
            <div className="p-4">
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files)}
                    />
                    {uploadProgress !== null ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <span className="text-sm text-zinc-400">Uploading... {uploadProgress}%</span>
                            <div className="w-full bg-zinc-700 rounded-full h-1.5">
                                <div
                                    className="bg-indigo-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                            <p className="text-sm text-zinc-400">
                                Drop files here or <span className="text-indigo-400">browse</span>
                            </p>
                            <p className="text-xs text-zinc-600 mt-1">Max 50MB per file</p>
                        </>
                    )}
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                <AnimatePresence>
                    {sharedFiles.map((file) => {
                        const FileIcon = getFileIcon(file.mimeType);
                        const isImage = file.mimeType.startsWith('image/');

                        return (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-zinc-800/50 rounded-xl p-3 border border-white/5"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
                                        <FileIcon size={20} className="text-zinc-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate font-medium">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {formatFileSize(file.size)} • from {file.sender}
                                        </p>

                                        {/* Progress bar for uploading files */}
                                        {file.status === 'uploading' && (
                                            <div className="mt-2 w-full bg-zinc-700 rounded-full h-1">
                                                <div
                                                    className="bg-indigo-500 h-1 rounded-full transition-all"
                                                    style={{ width: `${file.progress || 0}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Status/Action buttons */}
                                    <div className="flex items-center gap-1">
                                        {file.status === 'uploading' && (
                                            <Loader2 size={16} className="text-indigo-400 animate-spin" />
                                        )}
                                        {file.status === 'complete' && file.data && (
                                            <>
                                                {isImage && (
                                                    <button
                                                        onClick={() => previewFile(file)}
                                                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                                                        title="Preview"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => downloadFile(file)}
                                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </>
                                        )}
                                        {file.status === 'complete' && !file.data && (
                                            <CheckCircle size={16} className="text-green-500" />
                                        )}
                                        {file.status === 'error' && (
                                            <AlertCircle size={16} className="text-red-500" />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {sharedFiles.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">
                        <FileText size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files shared yet</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
