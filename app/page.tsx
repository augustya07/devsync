'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Users, Monitor, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [roomName, setRoomName] = useState('');

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName && roomName) {
      router.push(`/room/${roomName}?user=${encodeURIComponent(displayName)}`);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-zinc-950 font-sans text-white selection:bg-indigo-500/30">

      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[128px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
      </div>

      <div className="z-10 w-full max-w-6xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">

          {/* Left Column: Hero Text */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-indigo-300 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
                </span>
                Live Collaboration Ready
              </div>

              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
                <span className="block text-white">Code Together,</span>
                <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Synced Instantly.
                </span>
              </h1>

              <p className="max-w-xl text-lg text-zinc-400 sm:text-xl">
                Experience real-time collaboration with ghost cursors, active speaker detection, and crystal clear screen sharing. Built for modern dev teams.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm font-medium text-zinc-500">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <span>Multi-user Video</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-purple-400" />
                <span>HD Screen Share</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span>Low Latency</span>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="mx-auto w-full max-w-md">
            <div className="relative rounded-3xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl transition-transform hover:scale-[1.01] duration-500">

              {/* Card Glow Effect */}
              <div className="absolute -inset-0.5 -z-10 rounded-3xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 blur opacity-75"></div>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-lg shadow-indigo-500/20 text-white">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-bold text-white">Join a Session</h2>
                <p className="mt-2 text-sm text-zinc-400">Enter your details to start collaborating</p>
              </div>

              <form onSubmit={joinRoom} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Display Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. Alex Dev"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-zinc-600 outline-none transition-all focus:border-indigo-500 focus:bg-black/60 focus:ring-1 focus:ring-indigo-500"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="room" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Room ID
                  </label>
                  <input
                    id="room"
                    type="text"
                    required
                    placeholder="e.g. daily-standup"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-zinc-600 outline-none transition-all focus:border-indigo-500 focus:bg-black/60 focus:ring-1 focus:ring-indigo-500"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 active:scale-[0.98]"
                  >
                    Enter Room
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
