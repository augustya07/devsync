

'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { X, Maximize2, Minimize2, Copy, Check } from 'lucide-react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { LiveKitYjsProvider } from '@/lib/LiveKitProvider';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
    /** Whether the editor is visible */
    isOpen: boolean;
    /** Callback to close the editor */
    onClose: () => void;
}

const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'cpp', label: 'C++' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
];

// Generate consistent color based on string hash
function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
}

export default function CodeEditor({ isOpen, onClose }: CodeEditorProps) {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const [language, setLanguage] = useState('javascript');
    const [isMaximized, setIsMaximized] = useState(false);
    const [copied, setCopied] = useState(false);

    // Yjs document and provider refs
    const ydocRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<LiveKitYjsProvider | null>(null);
    const bindingRef = useRef<any>(null);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Initialize Yjs document (stable across renders)
    const { ydoc, ytext, awareness } = useMemo(() => {
        const doc = new Y.Doc();
        const text = doc.getText('monaco');
        const aware = new Awareness(doc);
        return { ydoc: doc, ytext: text, awareness: aware };
    }, []);

    // Store refs
    useEffect(() => {
        ydocRef.current = ydoc;
    }, [ydoc]);

    // Connect provider when room is available
    useEffect(() => {
        if (!room || !localParticipant || !isOpen) return;

        // Create and connect provider
        const provider = new LiveKitYjsProvider({
            doc: ydoc,
            awareness,
        });
        provider.connect(room, localParticipant);
        providerRef.current = provider;

        // Set local awareness state
        const userColor = stringToColor(localParticipant.identity);
        provider.setAwarenessState({
            name: localParticipant.identity,
            color: userColor,
        });

        return () => {
            provider.disconnect();
            providerRef.current = null;
        };
    }, [room, localParticipant, isOpen, ydoc, awareness]);

    // Handle Monaco editor mount
    const handleEditorMount: OnMount = useCallback(async (editor, monaco) => {
        editorRef.current = editor;

        // Dynamically import y-monaco to avoid SSR window error
        const { MonacoBinding } = await import('y-monaco');

        // Create Monaco binding with Yjs
        const binding = new MonacoBinding(
            ytext,
            editor.getModel()!,
            new Set([editor]),
            awareness
        );
        bindingRef.current = binding;

        // Configure Monaco theme
        monaco.editor.defineTheme('devsync-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#18181b',
                'editor.foreground': '#e4e4e7',
                'editorCursor.foreground': '#a78bfa',
                'editor.lineHighlightBackground': '#27272a',
                'editorLineNumber.foreground': '#52525b',
                'editor.selectionBackground': '#4338ca40',
                'editor.inactiveSelectionBackground': '#4338ca20',
            },
        });
        monaco.editor.setTheme('devsync-dark');

        // Focus the editor
        editor.focus();
    }, [ytext, awareness]);

    // Cleanup binding on unmount
    useEffect(() => {
        return () => {
            if (bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
        };
    }, []);

    // Copy code to clipboard
    const handleCopy = useCallback(() => {
        if (editorRef.current) {
            const code = editorRef.current.getValue();
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, []);

    if (!isOpen) return null;

    return (
        <div
            className={`flex flex-col bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isMaximized
                ? 'fixed inset-4 z-50'
                : 'h-full'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-300">
                        Code Editor
                    </span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        Live Collaboration
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Language Selector */}
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-zinc-800 text-zinc-300 text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                                {lang.label}
                            </option>
                        ))}
                    </select>

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                        title="Copy code"
                    >
                        {copied ? (
                            <Check size={16} className="text-green-500" />
                        ) : (
                            <Copy size={16} />
                        )}
                    </button>

                    {/* Maximize/Minimize Button */}
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                        title={isMaximized ? 'Minimize' : 'Maximize'}
                    >
                        {isMaximized ? (
                            <Minimize2 size={16} />
                        ) : (
                            <Maximize2 size={16} />
                        )}
                    </button>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title="Close editor"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    onMount={handleEditorMount}
                    options={{
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        fontLigatures: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                        bracketPairColorization: { enabled: true },
                        suggest: {
                            showMethods: true,
                            showFunctions: true,
                            showConstructors: true,
                            showFields: true,
                            showVariables: true,
                            showClasses: true,
                            showInterfaces: true,
                        },
                    }}
                    loading={
                        <div className="flex items-center justify-center h-full text-zinc-500">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                Loading editor...
                            </div>
                        </div>
                    }
                />
            </div>

            {/* Footer Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-t border-white/10 text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                    <span>{language.charAt(0).toUpperCase() + language.slice(1)}</span>
                    <span>UTF-8</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Synced</span>
                </div>
            </div>
        </div>
    );
}
