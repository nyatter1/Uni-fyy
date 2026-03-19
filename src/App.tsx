import { useState, ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Infinity, User, ArrowRight, Github, 
  AtSign, Check, AlertCircle, Upload, Image as ImageIcon, 
  Palette, Layout, Zap, Flame, 
  Snowflake, Globe, Cpu, Monitor,
  ChevronLeft, ChevronRight, X, RotateCcw,
  Terminal, Waves, Sun, Wind, Cloud, Moon, Star, 
  Coffee, Music, Gamepad2, Code2, Ghost, Skull, 
  Heart, Anchor, Mountain, TreeDeciduous, 
  Leaf, Droplets, Sparkles, Play, Volume2, ExternalLink,
  Eye, Pause, Youtube, Music as SpotifyIcon, Link as LinkIcon,
  Users, MessageSquare, Plus, Compass, LayoutGrid, Bell, Search, Settings, LogOut, ShieldCheck
} from 'lucide-react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// --- Types ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ProfileState {
  username: string;
  handle: string;
  pfp: string | null;
  banner: string | null;
  usernameStyle: {
    type: 'solid' | 'gradient' | 'glow';
    value: string;
    glow?: string;
  };
  pfpRing: string;
  profileEffect: string;
  cardStyle: string;
  bio: string;
  animationsEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  theme: string;
  musicStyle: string;
  musicType: 'upload' | 'link' | 'none';
  musicSource: string | null;
  musicTitle: string;
  musicArtist: string;
  musicAlbumArt: string;
  cardGlow: string;
  cardOutline: string;
  cardOutlineWidth: number;
}

// --- Constants & Data ---
const COLORS = [
  '#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B',
  '#0F172A', '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
  '#FFEDD5', '#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#EA580C', '#C2410C', '#9A3412', '#7C2D12', '#FEF3C7',
  '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', '#ECFDF5', '#D1FAE5',
  '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#EFF6FF', '#DBEAFE',
  '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#F5F3FF', '#EDE9FE',
  '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#FAE8FF', '#F5D0FE',
  '#F0ABFC', '#E879F9', '#D946EF', '#C026D3', '#A21CAF', '#86198F', '#701A75', '#FFF1F2', '#FFE4E6', '#FECDD3',
  '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48', '#BE123C', '#9F1239', '#881337',
  '#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e',
  '#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3AED', '#6d28d9', '#5b21b6', '#4c1d95',
  '#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87',
  '#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843',
  '#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337',
  '#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'
];

const GRADIENTS = [
  'from-emerald-400 to-cyan-400', 'from-purple-500 to-pink-500', 'from-orange-400 to-red-500', 'from-blue-400 to-indigo-600',
  'from-yellow-200 to-yellow-500', 'from-slate-900 to-slate-700', 'from-rose-400 to-orange-300', 'from-violet-500 to-purple-500',
  'from-cyan-500 to-blue-500', 'from-amber-200 to-yellow-400', 'from-fuchsia-500 to-purple-600', 'from-sky-400 to-blue-500',
  'from-green-300 to-emerald-500', 'from-teal-400 to-teal-600', 'from-lime-400 to-lime-600', 'from-emerald-500 to-teal-700',
  'from-red-400 to-rose-600', 'from-pink-400 to-rose-500', 'from-orange-300 to-amber-500', 'from-yellow-400 to-orange-500',
  'from-blue-500 to-cyan-400', 'from-indigo-500 to-blue-600', 'from-violet-400 to-indigo-500', 'from-purple-400 to-violet-600',
  'from-slate-400 to-slate-600', 'from-zinc-400 to-zinc-600', 'from-neutral-400 to-neutral-600', 'from-stone-400 to-stone-600',
  'from-red-500 via-orange-500 to-yellow-500', 'from-yellow-500 via-green-500 to-blue-500', 'from-blue-500 via-purple-500 to-pink-500',
  'from-emerald-400 via-teal-500 to-cyan-600', 'from-rose-400 via-fuchsia-500 to-indigo-600', 'from-amber-400 via-orange-500 to-red-600',
  'from-sky-400 via-blue-500 to-indigo-600', 'from-violet-400 via-purple-500 to-fuchsia-600', 'from-lime-300 via-emerald-400 to-teal-500',
  'from-cyan-300 via-sky-400 to-blue-500', 'from-fuchsia-300 via-pink-400 to-rose-500', 'from-orange-200 via-amber-300 to-yellow-400',
  'from-slate-800 to-slate-900', 'from-zinc-800 to-zinc-900', 'from-neutral-800 to-neutral-900', 'from-stone-800 to-stone-900',
  'from-emerald-900 to-emerald-700', 'from-blue-900 to-blue-700', 'from-purple-900 to-purple-700', 'from-red-900 to-red-700',
  'from-indigo-900 to-indigo-700', 'from-rose-900 to-rose-700', 'from-amber-900 to-amber-700', 'from-teal-900 to-teal-700',
  'from-rose-500 to-indigo-700', 'from-cyan-200 to-cyan-500', 'from-teal-200 to-teal-500', 'from-emerald-200 to-emerald-500',
  'from-lime-200 to-lime-500', 'from-yellow-200 to-yellow-500', 'from-amber-200 to-amber-500', 'from-orange-200 to-orange-500',
  'from-red-200 to-red-500', 'from-pink-200 to-pink-500', 'from-fuchsia-200 to-fuchsia-500', 'from-purple-200 to-purple-500',
  'from-violet-200 to-violet-500', 'from-indigo-200 to-indigo-500', 'from-blue-200 to-blue-500', 'from-sky-200 to-sky-500',
  'from-slate-200 to-slate-500', 'from-zinc-200 to-zinc-500', 'from-neutral-200 to-neutral-500', 'from-stone-200 to-stone-500',
  'from-red-500 to-blue-500', 'from-green-500 to-purple-500', 'from-yellow-500 to-pink-500', 'from-orange-500 to-cyan-500',
  'from-teal-500 to-rose-500', 'from-indigo-500 to-amber-500', 'from-fuchsia-500 to-lime-500', 'from-sky-500 to-emerald-500',
  'from-black to-white', 'from-white to-black', 'from-slate-900 to-emerald-400', 'from-zinc-900 to-rose-400',
  'from-neutral-900 to-amber-400', 'from-stone-900 to-cyan-400', 'from-slate-950 to-slate-500', 'from-zinc-950 to-zinc-500',
  'from-red-600 via-pink-600 to-purple-600', 'from-blue-600 via-cyan-600 to-teal-600', 'from-yellow-600 via-orange-600 to-red-600',
  'from-emerald-600 via-green-600 to-lime-600', 'from-indigo-600 via-blue-600 to-sky-600', 'from-fuchsia-600 via-purple-600 to-violet-600'
];

const GLOWS = [
  { color: '#10B981', label: 'Emerald' },
  { color: '#3B82F6', label: 'Blue' },
  { color: '#8B5CF6', label: 'Violet' },
  { color: '#EC4899', label: 'Pink' },
  { color: '#F59E0B', label: 'Amber' },
  { color: '#EF4444', label: 'Red' },
  { color: '#06B6D4', label: 'Cyan' },
  { color: '#84CC16', label: 'Lime' },
  { color: '#F97316', label: 'Orange' },
  { color: '#FFFFFF', label: 'White' },
  { color: '#6366F1', label: 'Indigo' },
  { color: '#A855F7', label: 'Purple' },
  { color: '#D946EF', label: 'Fuchsia' },
  { color: '#F43F5E', label: 'Rose' },
  { color: '#14B8A6', label: 'Teal' },
  { color: '#22C55E', label: 'Green' },
  { color: '#EAB308', label: 'Yellow' },
  { color: '#64748B', label: 'Slate' },
  { color: '#71717A', label: 'Zinc' },
  { color: '#78716C', label: 'Stone' },
];

const RINGS = [
  { id: 'none', label: 'None', icon: X },
  { id: 'minimal', label: 'Minimal', color: 'border-white/20' },
  { id: 'neon', label: 'Neon', color: 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' },
  { id: 'fire', label: 'Fire', icon: Flame, color: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]' },
  { id: 'ice', label: 'Ice', icon: Snowflake, color: 'border-cyan-300 shadow-[0_0_15px_rgba(165,243,252,0.6)]' },
  { id: 'electric', label: 'Electric', icon: Zap, color: 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' },
  { id: 'galaxy', label: 'Galaxy', icon: Globe, color: 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]' },
  { id: 'glitch', label: 'Glitch', icon: Cpu, color: 'border-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' },
  { id: 'gold', label: 'Gold', color: 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]' },
  { id: 'platinum', label: 'Platinum', color: 'border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.4)]' },
  { id: 'ruby', label: 'Ruby', color: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' },
  { id: 'emerald-deep', label: 'Deep Emerald', color: 'border-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.5)]' },
  { id: 'sapphire', label: 'Sapphire', color: 'border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' },
  { id: 'amethyst', label: 'Amethyst', color: 'border-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.5)]' },
  { id: 'topaz', label: 'Topaz', color: 'border-yellow-600 shadow-[0_0_15px_rgba(202,138,4,0.5)]' },
  { id: 'obsidian', label: 'Obsidian', color: 'border-zinc-800 shadow-[0_0_10px_rgba(0,0,0,0.8)]' },
  { id: 'pearl', label: 'Pearl', color: 'border-pink-100 shadow-[0_0_15px_rgba(255,255,255,0.6)]' },
  { id: 'rainbow', label: 'Rainbow', color: 'border-white animate-rainbow shadow-[0_0_15px_rgba(255,255,255,0.5)]' },
  { id: 'cyber', label: 'Cyber', color: 'border-cyan-400 border-double border-4' },
  { id: 'royal', label: 'Royal', color: 'border-amber-500 border-dotted border-4' },
  { id: 'dotted-white', label: 'Dot White', color: 'border-white/40 border-dotted' },
  { id: 'dashed-emerald', label: 'Dash Emerald', color: 'border-emerald-400/60 border-dashed' },
  { id: 'thick-white', label: 'Thick White', color: 'border-white border-4' },
  { id: 'gradient-1', label: 'Grad 1', color: 'border-transparent bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-border' },
  { id: 'gradient-2', label: 'Grad 2', color: 'border-transparent bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-border' },
  { id: 'double-neon', label: 'Double Neon', color: 'border-emerald-400 ring-2 ring-emerald-400/20' },
  { id: 'triple-neon', label: 'Triple Neon', color: 'border-cyan-400 ring-4 ring-cyan-400/10' },
  { id: 'pulse-red', label: 'Pulse Red', color: 'border-red-500 animate-pulse' },
  { id: 'pulse-blue', label: 'Pulse Blue', color: 'border-blue-500 animate-pulse' },
  { id: 'spin-emerald', label: 'Spin Emerald', color: 'border-emerald-400 border-t-transparent animate-spin' },
  { id: 'bounce-gold', label: 'Bounce Gold', color: 'border-amber-400 animate-bounce' },
  { id: 'ping-cyan', label: 'Ping Cyan', color: 'border-cyan-400 animate-ping' },
  { id: 'wiggle', label: 'Wiggle', color: 'border-white animate-wiggle' },
  { id: 'float', label: 'Float', color: 'border-white animate-float' },
  { id: 'shadow-lg', label: 'Heavy Shadow', color: 'border-white/10 shadow-2xl' },
  { id: 'inset-shadow', label: 'Inner Glow', color: 'border-white/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.5)]' },
  { id: 'glass-ring', label: 'Glass Ring', color: 'border-white/30 backdrop-blur-sm' },
  { id: 'frosted', label: 'Frosted', color: 'border-white/10 bg-white/5 backdrop-blur-xl' },
  { id: 'hologram', label: 'Hologram', color: 'border-indigo-400/50 shadow-[0_0_20px_rgba(129,140,248,0.4)]' },
  { id: 'toxic', label: 'Toxic', color: 'border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.6)]' },
  { id: 'void', label: 'Void', color: 'border-black shadow-[0_0_20px_rgba(0,0,0,1)]' },
  { id: 'stellar', label: 'Stellar', color: 'border-white shadow-[0_0_25px_rgba(255,255,255,0.8)]' },
  { id: 'magma', label: 'Magma', color: 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.7)]' },
  { id: 'plasma', label: 'Plasma', color: 'border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.7)]' },
  { id: 'deep-sea', label: 'Deep Sea', color: 'border-blue-900 shadow-[0_0_20px_rgba(30,58,138,0.7)]' },
  { id: 'forest', label: 'Forest', color: 'border-green-900 shadow-[0_0_20px_rgba(20,83,45,0.7)]' },
  { id: 'sunset', label: 'Sunset', color: 'border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.7)]' },
  { id: 'midnight', label: 'Midnight', color: 'border-slate-900 shadow-[0_0_20px_rgba(15,23,42,0.7)]' },
  { id: 'diamond', label: 'Diamond', color: 'border-cyan-100 shadow-[0_0_30px_rgba(207,250,254,0.9)]' },
  { id: 'emerald-royal', label: 'Royal Emerald', color: 'border-emerald-500 border-4 shadow-[0_0_20px_rgba(16,185,129,0.5)]' },
  { id: 'blood-moon', label: 'Blood Moon', color: 'border-red-700 shadow-[0_0_25px_rgba(185,28,28,0.8)]' },
  { id: 'solar-flare', label: 'Solar Flare', color: 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.9)]' },
  { id: 'aurora', label: 'Aurora', color: 'border-emerald-300 shadow-[0_0_25px_rgba(110,231,183,0.7)]' },
  { id: 'nebula-ring', label: 'Nebula', color: 'border-fuchsia-400 shadow-[0_0_25px_rgba(232,121,249,0.7)]' },
  { id: 'supernova-ring', label: 'Supernova', color: 'border-white shadow-[0_0_40px_rgba(255,255,255,1)]' },
  { id: 'black-hole-ring', label: 'Event Horizon', color: 'border-zinc-900 shadow-[0_0_30px_rgba(0,0,0,1)] ring-2 ring-white/10' },
  { id: 'comet-tail', label: 'Comet', color: 'border-sky-200 shadow-[0_0_20px_rgba(186,230,253,0.6)] animate-pulse' },
  { id: 'pulsar-ring', label: 'Pulsar', color: 'border-violet-400 shadow-[0_0_20px_rgba(167,139,250,0.8)] animate-ping' },
  { id: 'quasar-ring', label: 'Quasar', color: 'border-amber-300 shadow-[0_0_35px_rgba(252,211,77,0.9)]' },
  { id: 'stardust', label: 'Stardust', color: 'border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.4)] border-dotted border-4' },
  { id: 'infinity-ring', label: 'Infinity', color: 'border-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-border animate-rainbow' },
];

const EFFECTS = [
  { id: 'none', label: 'None' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'scanlines', label: 'Scanlines' },
  { id: 'vhs', label: 'VHS Noise' },
  { id: 'rgb', label: 'RGB Split' },
  { id: 'particles', label: 'Particles' },
  { id: 'bloom', label: 'Bloom' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'invert', label: 'Invert' },
  { id: 'blur', label: 'Soft Blur' },
  { id: 'pixelate', label: 'Pixelate' },
  { id: 'hue-rotate', label: 'Hue Shift' },
  { id: 'brightness', label: 'High Exposure' },
  { id: 'contrast', label: 'High Contrast' },
  { id: 'saturate', label: 'Vibrant' },
  { id: 'noise', label: 'Film Grain' },
  { id: 'vignette', label: 'Vignette' },
  { id: 'dream', label: 'Dreamy' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'crt', label: 'Retro CRT' },
  { id: 'old-film', label: 'Old Film' },
  { id: 'matrix', label: 'Digital Rain' },
  { id: 'snow', label: 'Snowfall' },
  { id: 'rain', label: 'Raindrops' },
  { id: 'fog', label: 'Mist' },
  { id: 'heatwave', label: 'Heatwave' },
  { id: 'underwater', label: 'Underwater' },
  { id: 'space', label: 'Deep Space' },
  { id: 'magma', label: 'Magma Flow' },
];

const CARD_STYLES = [
  { id: 'glass', label: 'Glass', icon: Snowflake },
  { id: 'metal', label: 'Brushed Metal', icon: Monitor },
  { id: 'carbon', label: 'Carbon Fiber', icon: Cpu },
  { id: 'terminal', label: 'Terminal Hacker', icon: Terminal },
  { id: 'sunset', label: 'Sunset', icon: Sun },
  { id: 'wave', label: 'Ocean Wave', icon: Waves },
  { id: 'neon', label: 'Neon Panel', icon: Zap },
  { id: 'minimal', label: 'Minimal Flat', icon: Layout },
  { id: 'holographic', label: 'Holographic', icon: Sparkles },
  { id: 'retro', label: 'Retro UI', icon: Gamepad2 },
  { id: 'wood', label: 'Fine Wood', icon: TreeDeciduous },
  { id: 'marble', label: 'White Marble', icon: Mountain },
  { id: 'obsidian', label: 'Black Obsidian', icon: Moon },
  { id: 'gold-leaf', label: 'Gold Leaf', icon: Star },
  { id: 'slate', label: 'Deep Slate', icon: Anchor },
  { id: 'paper', label: 'Textured Paper', icon: Leaf },
  { id: 'leather', label: 'Fine Leather', icon: Coffee },
  { id: 'silk', label: 'Royal Silk', icon: Music },
  { id: 'concrete', label: 'Raw Concrete', icon: Compass },
  { id: 'ice', label: 'Frosted Ice', icon: Snowflake },
  { id: 'plasma', label: 'Plasma Field', icon: Zap },
  { id: 'matrix', label: 'The Matrix', icon: Code2 },
  { id: 'nebula', label: 'Deep Nebula', icon: Globe },
  { id: 'cyber', label: 'Cyber Grid', icon: Cpu },
  { id: 'glitch', label: 'Glitch Panel', icon: Ghost },
  { id: 'steampunk', label: 'Brass & Gears', icon: Skull },
  { id: 'minimal-dark', label: 'Minimal Dark', icon: Moon },
  { id: 'minimal-light', label: 'Minimal Light', icon: Sun },
  { id: 'royal-gold', label: 'Royal Gold', icon: Heart },
  { id: 'deep-ocean', label: 'Deep Ocean', icon: Droplets },
  { id: 'forest-mist', label: 'Forest Mist', icon: Wind },
  { id: 'volcanic', label: 'Volcanic', icon: Flame },
  { id: 'arctic', label: 'Arctic', icon: Snowflake },
  { id: 'desert-sand', label: 'Desert Sand', icon: Cloud },
  { id: 'midnight-purple', label: 'Midnight Purple', icon: Moon },
  { id: 'emerald-city', label: 'Emerald City', icon: Sparkles },
  { id: 'ruby-red', label: 'Ruby Red', icon: Heart },
  { id: 'sapphire-blue', label: 'Sapphire Blue', icon: Droplets },
  { id: 'sunset-orange', label: 'Sunset Orange', icon: Sun },
  { id: 'lavender-dream', label: 'Lavender Dream', icon: Cloud },
  { id: 'mint-fresh', label: 'Mint Fresh', icon: Leaf },
  { id: 'charcoal', label: 'Charcoal', icon: Moon },
  { id: 'ivory', label: 'Ivory', icon: Sun },
  { id: 'cyber-punk', label: 'Cyberpunk', icon: Zap },
  { id: 'deep-space', label: 'Deep Space', icon: Globe },
  { id: 'lava', label: 'Lava Flow', icon: Flame },
  { id: 'emerald', label: 'Emerald Gem', icon: Sparkles },
  { id: 'amethyst', label: 'Amethyst Gem', icon: Sparkles },
  { id: 'glacier', label: 'Glacier', icon: Snowflake },
  { id: 'sandstone', label: 'Sandstone', icon: Mountain },
  { id: 'onyx', label: 'Pure Onyx', icon: Moon },
  { id: 'pearl-white', label: 'Pearl White', icon: Sun },
];

const MUSIC_STYLES = [
  { id: 'none', label: 'None', icon: X },
  { id: 'minimal-dark', label: 'Minimal Dark', class: 'bg-black/40 border-white/5' },
  { id: 'minimal-light', label: 'Minimal Light', class: 'bg-white/10 border-black/5 text-black' },
  { id: 'glass', label: 'Glass Morph', class: 'bg-white/5 backdrop-blur-md border-white/10' },
  { id: 'retro', label: 'Retro Cassette', class: 'bg-amber-100 border-amber-900/20 text-amber-900 font-mono' },
  { id: 'vinyl', label: 'Vinyl Record', class: 'bg-zinc-900 border-zinc-800 rounded-xl' },
  { id: 'neon-pink', label: 'Neon Pink', class: 'bg-black border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.2)]' },
  { id: 'neon-cyan', label: 'Neon Cyan', class: 'bg-black border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' },
  { id: 'terminal', label: 'Terminal', class: 'bg-black border-emerald-500/30 font-mono text-emerald-400' },
  { id: 'cyber', label: 'Cyberpunk', class: 'bg-gradient-to-r from-fuchsia-600/20 to-indigo-600/20 border-fuchsia-500/50' },
  { id: 'sunset', label: 'Sunset', class: 'bg-gradient-to-r from-orange-500/20 to-purple-900/20 border-orange-400/30' },
  { id: 'ocean', label: 'Ocean', class: 'bg-gradient-to-r from-cyan-500/20 to-blue-900/20 border-cyan-400/30' },
  { id: 'forest', label: 'Forest', class: 'bg-gradient-to-r from-emerald-900/20 to-green-900/20 border-emerald-800/30' },
  { id: 'volcano', label: 'Volcanic', class: 'bg-gradient-to-r from-red-950/20 to-orange-950/20 border-red-800/30' },
  { id: 'arctic', label: 'Arctic', class: 'bg-sky-50/10 border-sky-200/20' },
  { id: 'space', label: 'Nebula', class: 'bg-purple-950/20 border-purple-500/20' },
  { id: 'gold', label: 'Royal Gold', class: 'bg-amber-200/10 border-amber-400/30' },
  { id: 'silver', label: 'Sleek Silver', class: 'bg-slate-200/10 border-slate-400/30' },
  { id: 'paper', label: 'Paper', class: 'bg-[#f5f5f0] border-[#dcdcdc] text-slate-800' },
  { id: 'leather', label: 'Leather', class: 'bg-[#2a1a1a] border-[#3a2a2a]' },
  { id: 'marble', label: 'Marble', class: 'bg-white border-slate-200 text-slate-900' },
  { id: 'obsidian', label: 'Obsidian', class: 'bg-black border-white/10' },
  { id: 'holographic', label: 'Holographic', class: 'bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-white/20' },
  { id: 'matrix', label: 'Matrix', class: 'bg-black border-green-500/20 text-green-500 font-mono' },
  { id: 'sketch', label: 'Sketch', class: 'bg-white border-black border-2 border-dashed text-black' },
  { id: 'pop', label: 'Pop Art', class: 'bg-yellow-400 border-black border-4 text-black font-bold' },
  { id: 'amethyst', label: 'Amethyst', class: 'bg-purple-900/20 border-purple-400/30' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-900/20 border-emerald-400/30' },
  { id: 'ruby', label: 'Ruby', class: 'bg-red-900/20 border-red-400/30' },
  { id: 'sapphire', label: 'Sapphire', class: 'bg-blue-900/20 border-blue-400/30' },
  { id: 'dream', label: 'Dreamy', class: 'bg-gradient-to-br from-pink-500/20 to-violet-500/20 border-pink-400/30' },
  { id: 'midnight', label: 'Midnight', class: 'bg-slate-950 border-indigo-500/20 text-indigo-200' },
  { id: 'sunrise', label: 'Sunrise', class: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30' },
  { id: 'glitch', label: 'Glitch', class: 'bg-zinc-900 border-red-500/40 animate-pulse' },
  { id: 'minimal-emerald', label: 'Minimal Emerald', class: 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' },
  { id: 'toxic', label: 'Toxic', class: 'bg-lime-900/20 border-lime-400/30 text-lime-400' },
  { id: 'blood', label: 'Blood Lust', class: 'bg-red-950/40 border-red-600/30 text-red-500' },
  { id: 'royal-purple', label: 'Royal Purple', class: 'bg-purple-950/40 border-purple-500/30 text-purple-400' },
  { id: 'deep-blue', label: 'Deep Blue', class: 'bg-blue-950/40 border-blue-500/30 text-blue-400' },
  { id: 'forest-deep', label: 'Deep Forest', class: 'bg-green-950/40 border-green-500/30 text-green-400' },
  { id: 'sand', label: 'Desert Sand', class: 'bg-amber-950/40 border-amber-500/30 text-amber-400' },
  { id: 'slate-dark', label: 'Dark Slate', class: 'bg-slate-950/40 border-slate-500/30 text-slate-400' },
  { id: 'zinc-dark', label: 'Dark Zinc', class: 'bg-zinc-950/40 border-zinc-500/30 text-zinc-400' },
  { id: 'neutral-dark', label: 'Dark Neutral', class: 'bg-neutral-950/40 border-neutral-500/30 text-neutral-400' },
];

const CARD_GLOWS = [
  { id: 'none', label: 'None', icon: X, class: '' },
  { id: 'soft-white', label: 'Soft White', class: 'shadow-[0_0_20px_rgba(255,255,255,0.1)]' },
  { id: 'emerald', label: 'Emerald Aura', class: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]' },
  { id: 'sapphire', label: 'Sapphire Glow', class: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]' },
  { id: 'ruby', label: 'Ruby Radiance', class: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]' },
  { id: 'amethyst', label: 'Amethyst Mist', class: 'shadow-[0_0_30px_rgba(139,92,246,0.2)]' },
  { id: 'amber', label: 'Amber Warmth', class: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]' },
  { id: 'cyan', label: 'Cyan Cyber', class: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]' },
  { id: 'lime', label: 'Lime Toxic', class: 'shadow-[0_0_30px_rgba(132,204,22,0.2)]' },
  { id: 'orange', label: 'Orange Heat', class: 'shadow-[0_0_30px_rgba(249,115,22,0.2)]' },
  { id: 'pink', label: 'Pink Neon', class: 'shadow-[0_0_30px_rgba(236,72,153,0.2)]' },
  { id: 'purple', label: 'Purple Haze', class: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]' },
  { id: 'gold', label: 'Gold Shimmer', class: 'shadow-[0_0_40px_rgba(251,191,36,0.15)]' },
  { id: 'silver', label: 'Silver Sheen', class: 'shadow-[0_0_40px_rgba(203,213,225,0.15)]' },
  { id: 'rainbow', label: 'Rainbow Cycle', class: 'animate-pulse shadow-[0_0_40px_rgba(255,255,255,0.2)]' },
  { id: 'pulse-red', label: 'Pulse Red', class: 'animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.3)]' },
  { id: 'pulse-blue', label: 'Pulse Blue', class: 'animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.3)]' },
  { id: 'pulse-green', label: 'Pulse Green', class: 'animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.3)]' },
  { id: 'breathing-white', label: 'Breathing White', class: 'animate-pulse shadow-[0_0_25px_rgba(255,255,255,0.2)]' },
  { id: 'strobe', label: 'Strobe', class: 'animate-pulse shadow-[0_0_50px_rgba(255,255,255,0.4)]' },
  { id: 'dual-emerald', label: 'Emerald/Cyan', class: 'shadow-[0_0_40px_rgba(16,185,129,0.1),0_0_60px_rgba(6,182,212,0.1)]' },
  { id: 'dual-purple', label: 'Purple/Pink', class: 'shadow-[0_0_40px_rgba(168,85,247,0.1),0_0_60px_rgba(236,72,153,0.1)]' },
  { id: 'dual-orange', label: 'Orange/Red', class: 'shadow-[0_0_40_rgba(249,115,22,0.1),0_0_60px_rgba(239,68,68,0.1)]' },
  { id: 'void', label: 'Deep Void', class: 'shadow-[0_0_50px_rgba(0,0,0,0.8)]' },
  { id: 'solar', label: 'Solar Flare', class: 'shadow-[0_0_50px_rgba(251,191,36,0.3)]' },
  { id: 'aurora', label: 'Aurora', class: 'shadow-[0_0_40px_rgba(110,231,183,0.2),0_0_80px_rgba(56,189,248,0.1)]' },
  { id: 'nebula', label: 'Nebula Mist', class: 'shadow-[0_0_40px_rgba(192,38,211,0.2),0_0_80px_rgba(79,70,229,0.1)]' },
  { id: 'toxic', label: 'Toxic Spill', class: 'shadow-[0_0_40px_rgba(132,204,22,0.3)]' },
  { id: 'lava', label: 'Lava Glow', class: 'shadow-[0_0_40px_rgba(220,38,38,0.3)]' },
  { id: 'ice', label: 'Ice Core', class: 'shadow-[0_0_40px_rgba(186,230,253,0.3)]' },
  { id: 'deep-sea', label: 'Deep Sea', class: 'shadow-[0_0_50px_rgba(30,58,138,0.4)]' },
  { id: 'forest', label: 'Forest Glow', class: 'shadow-[0_0_50px_rgba(20,83,45,0.4)]' },
  { id: 'midnight', label: 'Midnight', class: 'shadow-[0_0_50px_rgba(15,23,42,0.5)]' },
  { id: 'supernova', label: 'Supernova', class: 'shadow-[0_0_60px_rgba(255,255,255,0.5)]' },
  { id: 'black-hole', label: 'Event Horizon', class: 'shadow-[0_0_60px_rgba(0,0,0,1)] ring-1 ring-white/10' },
  { id: 'plasma', label: 'Plasma Field', class: 'shadow-[0_0_40px_rgba(217,70,239,0.4)]' },
  { id: 'comet', label: 'Comet Tail', class: 'shadow-[0_0_40px_rgba(186,230,253,0.4)]' },
  { id: 'magma', label: 'Magma Flow', class: 'shadow-[0_0_40px_rgba(220,38,38,0.4)]' },
  { id: 'stellar', label: 'Stellar Burst', class: 'shadow-[0_0_50px_rgba(255,255,255,0.6)]' },
  { id: 'quasar', label: 'Quasar Beam', class: 'shadow-[0_0_60px_rgba(251,191,36,0.4)]' },
  { id: 'pulsar', label: 'Pulsar Spin', class: 'animate-spin-slow shadow-[0_0_40px_rgba(167,139,250,0.4)]' },
  { id: 'nebula-deep', label: 'Deep Nebula', class: 'shadow-[0_0_60px_rgba(192,38,211,0.3)]' },
  { id: 'void-pulse', label: 'Void Pulse', class: 'animate-pulse shadow-[0_0_70px_rgba(0,0,0,1)]' },
];

const CARD_OUTLINES = [
  { id: 'none', label: 'None', icon: X, class: 'border-white/10' },
  { id: 'thin-white', label: 'Thin White', class: 'border-white/20' },
  { id: 'thick-white', label: 'Thick White', class: 'border-white/40 border-2' },
  { id: 'dashed', label: 'Dashed', class: 'border-white/20 border-dashed' },
  { id: 'dotted', label: 'Dotted', class: 'border-white/20 border-dotted' },
  { id: 'double', label: 'Double', class: 'border-white/20 border-double border-4' },
  { id: 'emerald', label: 'Emerald', class: 'border-emerald-500/40' },
  { id: 'sapphire', label: 'Sapphire', class: 'border-blue-500/40' },
  { id: 'ruby', label: 'Ruby', class: 'border-red-500/40' },
  { id: 'gold', label: 'Gold', class: 'border-amber-400/40' },
  { id: 'neon-emerald', label: 'Neon Emerald', class: 'border-emerald-400 shadow-[inset_0_0_10px_rgba(52,211,153,0.3)]' },
  { id: 'neon-cyan', label: 'Neon Cyan', class: 'border-cyan-400 shadow-[inset_0_0_10px_rgba(6,182,212,0.3)]' },
  { id: 'neon-pink', label: 'Neon Pink', class: 'border-pink-400 shadow-[inset_0_0_10px_rgba(236,72,153,0.3)]' },
  { id: 'grad-rainbow', label: 'Rainbow', class: 'border-transparent bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-border' },
  { id: 'grad-sunset', label: 'Sunset', class: 'border-transparent bg-gradient-to-r from-orange-500 to-purple-900 bg-clip-border' },
  { id: 'grad-ocean', label: 'Ocean', class: 'border-transparent bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-border' },
  { id: 'grad-cyber', label: 'Cyber', class: 'border-transparent bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-border' },
  { id: 'anim-dash', label: 'Animated Dash', class: 'border-white/20 border-dashed animate-pulse' },
  { id: 'anim-grad', label: 'Animated Grad', class: 'border-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-border animate-pulse' },
  { id: 'brackets', label: 'Brackets', class: 'border-transparent border-x-white/40 border-x-2' },
  { id: 'glow-border', label: 'Glowing', class: 'border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]' },
  { id: 'scanline', label: 'Scanline', class: 'border-white/10' },
  { id: 'glitch', label: 'Glitch', class: 'border-red-500/50 animate-pulse' },
  { id: 'rough', label: 'Rough', class: 'border-white/20 border-4 border-double' },
  { id: 'pixel', label: 'Pixel', class: 'border-white/20 border-[4px] border-double' },
  { id: 'amethyst', label: 'Amethyst', class: 'border-purple-500/40' },
  { id: 'toxic', label: 'Toxic', class: 'border-lime-500/40' },
  { id: 'lava', label: 'Lava', class: 'border-red-600/40' },
  { id: 'ice', label: 'Ice', class: 'border-sky-300/40' },
  { id: 'void', label: 'Void', class: 'border-black border-2' },
  { id: 'cyber-grid', label: 'Cyber Grid', class: 'border-cyan-500/30 bg-[linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:20px_20px]' },
  { id: 'royal', label: 'Royal Gold', class: 'border-amber-500/50 border-double border-8' },
  { id: 'steampunk', label: 'Steampunk', class: 'border-[#8b5a2b] border-4 border-double shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' },
  { id: 'minimal-emerald', label: 'Minimal Emerald', class: 'border-emerald-500/20' },
  { id: 'heavy-metal', label: 'Heavy Metal', class: 'border-slate-400 border-4 shadow-2xl' },
  { id: 'neon-violet', label: 'Neon Violet', class: 'border-violet-400 shadow-[inset_0_0_10px_rgba(139,92,246,0.3)]' },
  { id: 'neon-amber', label: 'Neon Amber', class: 'border-amber-400 shadow-[inset_0_0_10px_rgba(245,158,11,0.3)]' },
  { id: 'neon-red', label: 'Neon Red', class: 'border-red-400 shadow-[inset_0_0_10px_rgba(239,68,68,0.3)]' },
  { id: 'grad-forest', label: 'Forest', class: 'border-transparent bg-gradient-to-r from-emerald-600 to-green-900 bg-clip-border' },
  { id: 'grad-magma', label: 'Magma', class: 'border-transparent bg-gradient-to-r from-red-600 to-orange-900 bg-clip-border' },
  { id: 'grad-space', label: 'Space', class: 'border-transparent bg-gradient-to-r from-indigo-600 to-purple-900 bg-clip-border' },
  { id: 'dotted-emerald', label: 'Dot Emerald', class: 'border-emerald-500/40 border-dotted border-2' },
  { id: 'dashed-sapphire', label: 'Dash Sapphire', class: 'border-blue-500/40 border-dashed border-2' },
];

const MOCK_SONG = {
  title: "Midnight City",
  artist: "M83",
  albumArt: "https://picsum.photos/seed/music/100/100"
};

const SOCIALS = [
  { id: 'twitter', label: 'Twitter', icon: Globe },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'discord', label: 'Discord', icon: Infinity },
];

// --- Components ---

const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = {
    sm: "w-6 h-6 p-1.5",
    md: "w-12 h-12 p-3",
    lg: "w-20 h-20 p-5"
  };
  return (
    <div className="flex items-center justify-center">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className={`relative bg-black rounded-2xl ${sizes[size]} border border-white/10 flex items-center justify-center`}>
          <Infinity className="w-full h-full text-white stroke-[1.5]" />
        </div>
      </div>
    </div>
  );
};

const StepIndicator = ({ current, total }: { current: number, total: number }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {Array.from({ length: total }).map((_, i) => (
      <div 
        key={i}
        className={`h-1 rounded-sm transition-all duration-500 ${
          i + 1 <= current ? 'w-8 bg-emerald-400' : 'w-4 bg-white/10'
        }`}
      />
    ))}
  </div>
);

const MusicPlayer = ({ profile, viewMode = 'editor' }: { profile: ProfileState, viewMode?: 'editor' | 'visitor' | 'full' }) => {
  if (profile.musicStyle === 'none') return null;
  const config = MUSIC_STYLES.find(s => s.id === profile.musicStyle);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if ((viewMode === 'visitor' || viewMode === 'full') && audioRef.current && profile.musicType === 'upload') {
      audioRef.current.play().catch(e => console.log('Autoplay blocked:', e));
      setIsPlaying(true);
    }
  }, [viewMode, profile.musicSource, profile.musicType]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const songTitle = profile.musicTitle || MOCK_SONG.title;
  const songArtist = profile.musicArtist || MOCK_SONG.artist;
  const albumArt = profile.musicAlbumArt || MOCK_SONG.albumArt;
  
  const isYouTube = profile.musicSource?.includes('youtube.com') || profile.musicSource?.includes('youtu.be');
  const isSpotify = profile.musicSource?.includes('spotify.com');

  return (
    <div className={`mt-4 p-3 rounded-xl border flex items-center gap-3 transition-all duration-500 ${config?.class}`}>
      {profile.musicSource && profile.musicType === 'upload' && (
        <audio ref={audioRef} src={profile.musicSource} loop onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
      )}
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 relative group">
        <img src={albumArt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        {profile.musicType === 'upload' && (
          <button 
            onClick={togglePlay}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        {(isYouTube || isSpotify) && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {isYouTube ? <Youtube className="w-5 h-5 text-red-500" /> : <SpotifyIcon className="w-5 h-5 text-emerald-500" />}
          </div>
        )}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-1.5">
          {isYouTube && <Youtube className="w-2.5 h-2.5 text-red-500" />}
          {isSpotify && <SpotifyIcon className="w-2.5 h-2.5 text-emerald-500" />}
          <h4 className="text-[10px] font-bold truncate uppercase tracking-wider">{songTitle}</h4>
        </div>
        <p className="text-[9px] opacity-60 truncate">{songArtist}</p>
      </div>
      <div className="flex items-center gap-2">
        {profile.musicType === 'upload' && (
          <button onClick={togglePlay} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        )}
        {profile.musicType === 'link' && (
          <a href={profile.musicSource || '#'} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/10 rounded-md transition-colors">
            <ExternalLink className="w-3 h-3 opacity-40 hover:opacity-100" />
          </a>
        )}
        <Volume2 className="w-3 h-3 opacity-40" />
      </div>
    </div>
  );
};

const ProfilePreview = ({ profile, viewMode = 'editor' }: { profile: ProfileState, viewMode?: 'editor' | 'visitor' | 'full' }) => {
  const effectClass = profile.profileEffect === 'glitch' ? 'effect-glitch' : 
                     profile.profileEffect === 'scanlines' ? 'effect-scanlines' :
                     profile.profileEffect === 'vhs' ? 'effect-vhs' : 
                     profile.profileEffect === 'bloom' ? 'blur-[1px] brightness-110' :
                     profile.profileEffect === 'sepia' ? 'sepia' :
                     profile.profileEffect === 'grayscale' ? 'grayscale' :
                     profile.profileEffect === 'invert' ? 'invert' :
                     profile.profileEffect === 'blur' ? 'blur-[2px]' :
                     profile.profileEffect === 'pixelate' ? 'pixelate' :
                     profile.profileEffect === 'hue-rotate' ? 'animate-hue-rotate' :
                     profile.profileEffect === 'brightness' ? 'brightness-150' :
                     profile.profileEffect === 'contrast' ? 'contrast-150' :
                     profile.profileEffect === 'saturate' ? 'saturate-200' :
                     profile.profileEffect === 'noise' ? 'effect-noise' :
                     profile.profileEffect === 'vignette' ? 'effect-vignette' :
                     profile.profileEffect === 'dream' ? 'blur-[1px] saturate-150 brightness-110' :
                     profile.profileEffect === 'cyberpunk' ? 'hue-rotate-[280deg] saturate-200 contrast-125' :
                     profile.profileEffect === 'crt' ? 'effect-crt' :
                     profile.profileEffect === 'old-film' ? 'effect-old-film' :
                     profile.profileEffect === 'matrix' ? 'bg-black/80' :
                     profile.profileEffect === 'snow' ? 'bg-white/5' :
                     profile.profileEffect === 'rain' ? 'bg-blue-900/10' :
                     profile.profileEffect === 'fog' ? 'opacity-80 blur-[1px]' :
                     profile.profileEffect === 'heatwave' ? 'animate-pulse saturate-150' :
                     profile.profileEffect === 'underwater' ? 'bg-blue-500/10 blur-[0.5px]' :
                     profile.profileEffect === 'space' ? 'bg-indigo-950/20' :
                     profile.profileEffect === 'magma' ? 'bg-red-950/20 saturate-200' :
                     '';

  const ringStyle = RINGS.find(r => r.id === profile.pfpRing);
  const glowStyle = CARD_GLOWS.find(g => g.id === profile.cardGlow)?.class || '';
  const outlineStyle = CARD_OUTLINES.find(o => o.id === profile.cardOutline)?.class || 'border-white/10';

  return (
    <div 
      className={`relative w-full aspect-[4/5] rounded-[24px] overflow-hidden border ${glowStyle} bg-[#0a0a0a] ${effectClass} transition-all duration-700 ${viewMode === 'full' ? 'scale-110 shadow-2xl' : ''}`}
      style={{ 
        borderColor: profile.cardOutline === 'none' ? 'rgba(255,255,255,0.1)' : undefined,
        borderWidth: profile.cardOutlineWidth,
        ...(profile.cardOutline !== 'none' ? { borderStyle: 'solid' } : {})
      }}
    >
      {/* Apply outline style class if it's not none */}
      {profile.cardOutline !== 'none' && (
        <div className={`absolute inset-0 border-[inherit] rounded-[inherit] pointer-events-none z-10 ${outlineStyle}`} style={{ borderWidth: profile.cardOutlineWidth }} />
      )}
      {/* Banner */}
      <div className="h-1/3 w-full relative overflow-hidden bg-white/5">
        {profile.banner ? (
          <img src={profile.banner} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      </div>

      {/* Profile Content */}
      <div className="px-6 -mt-12 relative z-10">
        <div className="relative inline-block">
          <div className={`w-24 h-24 rounded-2xl overflow-hidden border-4 bg-[#0a0a0a] ${ringStyle?.color || 'border-[#0a0a0a]'}`}>
            {profile.pfp ? (
              <img src={profile.pfp} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <User className="w-10 h-10 text-white/20" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <h2 className={`text-2xl font-serif italic tracking-tight ${
            profile.usernameStyle.type === 'gradient' ? `bg-gradient-to-r ${profile.usernameStyle.value} bg-clip-text text-transparent` :
            profile.usernameStyle.type === 'glow' ? 'text-white' : 
            profile.usernameStyle.type === 'solid' ? '' : ''
          }`}
          style={
            profile.usernameStyle.type === 'glow' ? { textShadow: `0 0 15px ${profile.usernameStyle.glow}, 0 0 30px ${profile.usernameStyle.glow}` } : 
            profile.usernameStyle.type === 'solid' ? { color: profile.usernameStyle.value } : {}
          }
          >
            {profile.username || 'Username'}
          </h2>
          <p className="text-white/40 text-sm font-mono mt-1">@{profile.handle || 'handle'}</p>
        </div>

        <div className={`mt-6 p-4 rounded-xl border border-white/5 min-h-[100px] transition-all duration-500 ${
          profile.cardStyle === 'glass' ? 'bg-white/5 backdrop-blur-md' :
          profile.cardStyle === 'metal' ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-slate-600' :
          profile.cardStyle === 'carbon' ? 'bg-carbon border-white/10' :
          profile.cardStyle === 'terminal' ? 'bg-black border-[#00FF00]/30 shadow-[0_0_15px_rgba(0,255,0,0.05)] font-mono bg-terminal-scan' :
          profile.cardStyle === 'sunset' ? 'bg-gradient-to-br from-orange-500/40 via-red-500/40 to-purple-900/60 backdrop-blur-xl border-orange-500/30' :
          profile.cardStyle === 'wave' ? 'bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-indigo-900/50 backdrop-blur-xl border-cyan-400/30 bg-wave-pattern' :
          profile.cardStyle === 'neon' ? 'bg-black border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
          profile.cardStyle === 'holographic' ? 'bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl border-white/20' :
          profile.cardStyle === 'wood' ? 'bg-wood-grain border-[#4d3b2f]' :
          profile.cardStyle === 'retro' ? 'bg-[#1a1a1a] border-2 border-white/20 font-mono' :
          profile.cardStyle === 'marble' ? 'bg-white border-slate-200 text-slate-900' :
          profile.cardStyle === 'obsidian' ? 'bg-[#050505] border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]' :
          profile.cardStyle === 'gold-leaf' ? 'bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 border-amber-300 text-amber-950' :
          profile.cardStyle === 'slate' ? 'bg-slate-900 border-slate-800' :
          profile.cardStyle === 'paper' ? 'bg-[#f5f5f0] border-[#dcdcdc] text-slate-800 shadow-inner' :
          profile.cardStyle === 'leather' ? 'bg-[#2a1a1a] border-[#3a2a2a] shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]' :
          profile.cardStyle === 'silk' ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 border-purple-800' :
          profile.cardStyle === 'concrete' ? 'bg-zinc-600 border-zinc-500 shadow-inner' :
          profile.cardStyle === 'ice' ? 'bg-cyan-50/10 backdrop-blur-2xl border-cyan-100/20' :
          profile.cardStyle === 'plasma' ? 'bg-gradient-to-br from-fuchsia-600/20 via-purple-600/20 to-indigo-600/20 border-fuchsia-500/30' :
          profile.cardStyle === 'matrix' ? 'bg-black border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
          profile.cardStyle === 'nebula' ? 'bg-[url(https://picsum.photos/seed/space/400/500)] bg-cover bg-center border-purple-500/20' :
          profile.cardStyle === 'cyber' ? 'bg-black border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' :
          profile.cardStyle === 'glitch' ? 'bg-zinc-900 border-red-500/50 animate-pulse' :
          profile.cardStyle === 'steampunk' ? 'bg-[#4a3728] border-[#8b5a2b] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]' :
          profile.cardStyle === 'minimal-dark' ? 'bg-black border-white/5' :
          profile.cardStyle === 'minimal-light' ? 'bg-white border-black/5 text-black' :
          profile.cardStyle === 'royal-gold' ? 'bg-[#1a1a1a] border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' :
          profile.cardStyle === 'deep-ocean' ? 'bg-blue-950 border-blue-800' :
          profile.cardStyle === 'forest-mist' ? 'bg-emerald-950 border-emerald-800' :
          profile.cardStyle === 'volcanic' ? 'bg-red-950 border-red-800' :
          profile.cardStyle === 'arctic' ? 'bg-sky-50 border-sky-200 text-sky-900' :
          profile.cardStyle === 'desert-sand' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          profile.cardStyle === 'midnight-purple' ? 'bg-purple-950 border-purple-800' :
          profile.cardStyle === 'emerald-city' ? 'bg-emerald-900 border-emerald-700' :
          profile.cardStyle === 'ruby-red' ? 'bg-rose-900 border-rose-700' :
          profile.cardStyle === 'sapphire-blue' ? 'bg-blue-900 border-blue-700' :
          profile.cardStyle === 'sunset-orange' ? 'bg-orange-900 border-orange-700' :
          profile.cardStyle === 'lavender-dream' ? 'bg-violet-100 border-violet-200 text-violet-900' :
          profile.cardStyle === 'mint-fresh' ? 'bg-teal-50 border-teal-200 text-teal-900' :
          profile.cardStyle === 'charcoal' ? 'bg-zinc-800 border-zinc-700' :
          profile.cardStyle === 'ivory' ? 'bg-[#fffff0] border-[#dcdcdc] text-slate-800' :
          profile.cardStyle === 'cyber-punk' ? 'bg-gradient-to-br from-fuchsia-600/40 via-indigo-900/60 to-cyan-600/40 border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.2)]' :
          profile.cardStyle === 'deep-space' ? 'bg-gradient-to-br from-black via-slate-950 to-indigo-950 border-indigo-500/20' :
          profile.cardStyle === 'lava' ? 'bg-gradient-to-br from-red-950 via-black to-orange-950 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' :
          profile.cardStyle === 'emerald' ? 'bg-gradient-to-br from-emerald-900 via-emerald-950 to-black border-emerald-500/30' :
          profile.cardStyle === 'amethyst' ? 'bg-gradient-to-br from-purple-900 via-purple-950 to-black border-purple-500/30' :
          profile.cardStyle === 'glacier' ? 'bg-gradient-to-br from-sky-100 via-white to-blue-50 border-sky-200 text-sky-900' :
          profile.cardStyle === 'sandstone' ? 'bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 border-amber-200 text-amber-900' :
          profile.cardStyle === 'onyx' ? 'bg-black border-white/5 shadow-[inset_0_0_40px_rgba(255,255,255,0.02)]' :
          profile.cardStyle === 'pearl-white' ? 'bg-white border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] text-slate-900' :
          'bg-white/[0.02]'
        }`}>
          <p className="text-sm text-white/60 font-light leading-relaxed">
            {profile.bio || 'Your story begins here...'}
          </p>
        </div>
        <MusicPlayer profile={profile} viewMode={viewMode} />
      </div>

      {/* Overlay Effects */}
      {profile.profileEffect === 'scanlines' && <div className="absolute inset-0 effect-scanlines" />}
      {profile.profileEffect === 'rgb' && <div className="absolute inset-0 mix-blend-screen animate-rgb-cycle opacity-30 bg-gradient-to-r from-red-500 via-green-500 to-blue-500" />}
    </div>
  );
};

export default function App() {
  const [authState, setAuthState] = useState<'login' | 'signup' | 'wizard' | 'app'>('login');
  const [step, setStep] = useState(1);
  const [activeAppTab, setActiveAppTab] = useState<'friends' | 'customization' | 'explore'>('friends');
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [activeMusicSource, setActiveMusicSource] = useState<'upload' | 'link' | 'none'>('none');

  // Firebase State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [profile, setProfile] = useState<ProfileState>({
    username: '',
    handle: '',
    pfp: null,
    banner: null,
    usernameStyle: { type: 'solid', value: '#FFFFFF' },
    pfpRing: 'none',
    profileEffect: 'none',
    cardStyle: 'glass',
    bio: '',
    animationsEnabled: true,
    animationSpeed: 'normal',
    theme: 'dark',
    musicStyle: 'none',
    musicType: 'none',
    musicSource: null,
    musicTitle: '',
    musicArtist: '',
    musicAlbumArt: '',
    cardGlow: 'none',
    cardOutline: 'none',
    cardOutlineWidth: 1
  });

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  // Mock Handle Checker
  useEffect(() => {
    if (profile.handle.length > 2) {
      setIsCheckingHandle(true);
      const timer = setTimeout(() => {
        setIsCheckingHandle(false);
        setHandleAvailable(profile.handle.length % 2 === 0);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setHandleAvailable(null);
    }
  }, [profile.handle]);

  const [styleTab, setStyleTab] = useState<'solid' | 'gradient' | 'glow'>('solid');
  const [customTab, setCustomTab] = useState<'identity' | 'visuals' | 'effects' | 'socials' | 'suggested'>('visuals');
  const [suggestedSubTab, setSuggestedSubTab] = useState<'music' | 'glow' | 'outline'>('music');
  const [friendsSubTab, setFriendsSubTab] = useState<'All' | 'Pending' | 'Add Friend'>('All');

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user profile
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as ProfileState);
            setAuthState('app');
          } else {
            setAuthState('wizard');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setAuthState('login');
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firebase Data Listeners
  useEffect(() => {
    if (!user || !isAuthReady) return;

    // Listen to all users for search
    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersData.filter(u => u.id !== user.uid));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Listen to friend requests
    const qRequests = query(collection(db, 'friendRequests'), where('toUserId', '==', user.uid));
    const reqUnsub = onSnapshot(qRequests, (snapshot) => {
      setFriendRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'friendRequests'));

    // Listen to friendships
    const qFriends1 = query(collection(db, 'friendships'), where('user1Id', '==', user.uid));
    const qFriends2 = query(collection(db, 'friendships'), where('user2Id', '==', user.uid));
    
    const friendsUnsub1 = onSnapshot(qFriends1, (snapshot) => {
      const f1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriends(prev => {
        const others = prev.filter(f => !f1.find((newF: any) => newF.id === f.id));
        return [...others, ...f1];
      });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'friendships'));

    const friendsUnsub2 = onSnapshot(qFriends2, (snapshot) => {
      const f2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriends(prev => {
        const others = prev.filter(f => !f2.find((newF: any) => newF.id === f.id));
        return [...others, ...f2];
      });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'friendships'));

    return () => {
      usersUnsub();
      reqUnsub();
      friendsUnsub1();
      friendsUnsub2();
    };
  }, [user, isAuthReady]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp()
      }, { merge: true });
      setAuthState('app');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleSendRequest = async (toUserId: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: user.uid,
        toUserId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'friendRequests');
    }
  };

  const handleAcceptRequest = async (request: any) => {
    try {
      await updateDoc(doc(db, 'friendRequests', request.id), { status: 'accepted' });
      await addDoc(collection(db, 'friendships'), {
        user1Id: request.fromUserId,
        user2Id: request.toUserId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `friendRequests/${request.id}`);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `friendRequests/${requestId}`);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif italic mb-2">Identify Yourself</h2>
              <p className="text-white/40 text-sm">Choose how the world will see you.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-medium text-white/40 mb-2 ml-1">Display Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                  <input 
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all"
                    placeholder="Julian Sterling"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-medium text-white/40 mb-2 ml-1">Unique Handle</label>
                <div className="relative group">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                  <input 
                    type="text"
                    value={profile.handle}
                    onChange={(e) => setProfile({ ...profile, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="w-full pl-12 pr-12 py-4 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all"
                    placeholder="julian_s"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isCheckingHandle ? (
                      <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                    ) : handleAvailable === true ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : handleAvailable === false ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center px-1">
                  <p className="text-[10px] text-white/20">3-16 chars, lowercase & underscores only</p>
                  <button 
                    onClick={() => setProfile({ ...profile, handle: `user_${Math.floor(Math.random() * 10000)}` })}
                    className="text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                  >
                    Suggest
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif italic mb-2">Visual Identity</h2>
              <p className="text-white/40 text-sm">Upload your signature look.</p>
            </div>

            <div className="space-y-6">
              <div className="group relative">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-medium text-white/40 mb-4 ml-1">Profile Banner (1200x400)</label>
                <div className="h-32 w-full rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.05] hover:border-emerald-400/30 transition-all overflow-hidden relative">
                  {profile.banner ? (
                    <img src={profile.banner} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-white/20 mb-2" />
                      <span className="text-xs text-white/40">Click to upload banner</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setProfile({ ...profile, banner: URL.createObjectURL(file) });
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center cursor-pointer hover:bg-white/[0.05] hover:border-emerald-400/30 transition-all overflow-hidden relative">
                    {profile.pfp ? (
                      <img src={profile.pfp} className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-5 h-5 text-white/20" />
                    )}
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setProfile({ ...profile, pfp: URL.createObjectURL(file) });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Profile Picture</h4>
                  <p className="text-xs text-white/30 leading-relaxed">Recommended: 400x400px.<br/>Supports JPG, PNG, GIF.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleNext}
                className="text-xs text-white/20 hover:text-white transition-colors underline underline-offset-4"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col lg:flex-row gap-8 min-h-[700px] h-[750px]"
          >
            {/* Left: Preview */}
            <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-medium text-white/40">Live Preview</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowFullPreview(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-400 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-400/20"
                  >
                    <Eye className="w-3 h-3" />
                    What profile will look like
                  </button>
                  <button className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
                    <Monitor className="w-3 h-3 text-white/40" />
                  </button>
                </div>
              </div>
              <ProfilePreview profile={profile} />
            </div>
            </div>

            {/* Right: Customization Panel */}
            <div className="flex-grow flex flex-col bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden">
              {/* Tabs Header */}
              <div className="flex border-b border-white/5 p-2 gap-1">
                {(['identity', 'visuals', 'effects', 'socials', 'suggested'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setCustomTab(t)}
                    className={`flex-1 py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                      customTab === t ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/20' : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {customTab === 'identity' && (
                    <motion.div 
                      key="identity"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <User className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs uppercase tracking-widest font-semibold">Bio & Details</h4>
                        </div>
                        <textarea 
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          className="w-full h-32 bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all resize-none"
                          placeholder="Tell your story..."
                        />
                      </section>

                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <Palette className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs uppercase tracking-widest font-semibold">Username Style</h4>
                        </div>
                        <div className="flex bg-white/5 rounded-xl p-1 mb-4">
                          {(['solid', 'gradient', 'glow'] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => setStyleTab(t)}
                              className={`flex-1 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all ${
                                styleTab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-8 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {styleTab === 'solid' && COLORS.map(c => (
                            <button 
                              key={c}
                              onClick={() => setProfile({ ...profile, usernameStyle: { type: 'solid', value: c } })}
                              className={`aspect-square rounded-lg border-2 transition-all hover:scale-110 ${profile.usernameStyle.value === c ? 'border-white' : 'border-transparent'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          {styleTab === 'gradient' && GRADIENTS.map(g => (
                            <button 
                              key={g}
                              onClick={() => setProfile({ ...profile, usernameStyle: { type: 'gradient', value: g } })}
                              className={`col-span-4 h-10 rounded-lg bg-gradient-to-r ${g} border-2 transition-all hover:scale-[1.02] ${profile.usernameStyle.value === g ? 'border-white' : 'border-transparent'}`}
                            />
                          ))}
                          {styleTab === 'glow' && GLOWS.map(g => (
                            <button 
                              key={g.color}
                              onClick={() => setProfile({ ...profile, usernameStyle: { type: 'glow', value: '#FFFFFF', glow: g.color } })}
                              className={`col-span-4 h-12 rounded-lg bg-black border-2 flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02] ${profile.usernameStyle.glow === g.color ? 'border-white' : 'border-emerald-400/30'}`}
                              style={{ boxShadow: `0 0 10px ${g.color}20` }}
                            >
                              <span className="text-white text-xs font-serif italic" style={{ textShadow: `0 0 8px ${g.color}` }}>{g.label}</span>
                              <div className="w-8 h-0.5 rounded-sm" style={{ backgroundColor: g.color }} />
                            </button>
                          ))}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {customTab === 'visuals' && (
                    <motion.div 
                      key="visuals"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <Layout className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs uppercase tracking-widest font-semibold">Card Theme</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {CARD_STYLES.map(c => (
                            <button 
                              key={c.id}
                              onClick={() => setProfile({ ...profile, cardStyle: c.id })}
                              className={`group relative p-4 rounded-2xl border text-left transition-all hover:bg-white/5 flex items-center gap-3 overflow-hidden ${
                                profile.cardStyle === c.id ? 'border-emerald-400 bg-emerald-400/5' : 'border-white/5 bg-white/[0.02]'
                              }`}
                            >
                              {/* Visual Preview Background */}
                              <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity ${
                                c.id === 'glass' ? 'bg-white/20 backdrop-blur-sm' :
                                c.id === 'metal' ? 'bg-gradient-to-br from-slate-700 to-slate-900' :
                                c.id === 'carbon' ? 'bg-carbon' :
                                c.id === 'terminal' ? 'bg-black bg-terminal-scan' :
                                c.id === 'sunset' ? 'bg-gradient-to-br from-orange-500 to-purple-900' :
                                c.id === 'wave' ? 'bg-gradient-to-br from-cyan-500 to-blue-900 bg-wave-pattern' :
                                c.id === 'neon' ? 'bg-black border-emerald-500/50' :
                                c.id === 'wood' ? 'bg-wood-grain' :
                                c.id === 'marble' ? 'bg-white' :
                                c.id === 'obsidian' ? 'bg-black' :
                                c.id === 'cyber-punk' ? 'bg-gradient-to-br from-fuchsia-600 to-indigo-900' :
                                c.id === 'lava' ? 'bg-gradient-to-br from-red-950 to-black' :
                                'bg-white/10'
                              }`} />
                              
                              <div className={`relative z-10 p-2 rounded-lg ${profile.cardStyle === c.id ? 'bg-emerald-400 text-black' : 'bg-white/5 text-white/40'}`}>
                                <c.icon className="w-4 h-4" />
                              </div>
                              <span className="relative z-10 text-[10px] uppercase tracking-widest font-bold">{c.label}</span>
                            </button>
                          ))}
                        </div>
                      </section>

                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <RotateCcw className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs uppercase tracking-widest font-semibold">Avatar Rings</h4>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {RINGS.map(r => (
                            <button 
                              key={r.id}
                              onClick={() => setProfile({ ...profile, pfpRing: r.id })}
                              className={`group relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 overflow-hidden ${
                                profile.pfpRing === r.id ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/5 bg-white/[0.02]'
                              }`}
                            >
                              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-white to-transparent`} />
                              <div className="relative z-10">
                                {r.icon ? <r.icon className="w-4 h-4" /> : <div className={`w-5 h-5 rounded-md border-2 ${r.color}`} />}
                              </div>
                              <span className="relative z-10 text-[7px] uppercase tracking-tighter opacity-40 text-center px-1 font-bold">{r.label}</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {customTab === 'effects' && (
                    <motion.div 
                      key="effects"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs uppercase tracking-widest font-semibold">Atmospheric Effects</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {EFFECTS.map(e => (
                            <button 
                              key={e.id}
                              onClick={() => setProfile({ ...profile, profileEffect: e.id })}
                              className={`group relative px-4 py-4 rounded-2xl text-[10px] uppercase tracking-widest border transition-all font-bold overflow-hidden ${
                                profile.profileEffect === e.id ? 'bg-emerald-400 text-black border-emerald-400 shadow-lg shadow-emerald-400/20' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-emerald-400 to-cyan-400`} />
                              <span className="relative z-10">{e.label}</span>
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-white/20" />
                            <div>
                              <span className="text-[10px] uppercase tracking-widest font-bold block">Motion Effects</span>
                              <span className="text-[8px] text-white/40">Enable animations and transitions</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setProfile({ ...profile, animationsEnabled: !profile.animationsEnabled })}
                            className={`w-12 h-6 rounded-md relative transition-colors ${profile.animationsEnabled ? 'bg-emerald-400' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-sm bg-white transition-all ${profile.animationsEnabled ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {customTab === 'socials' && (
                    <motion.div 
                      key="socials"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="text-center py-8">
                        <Globe className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <h4 className="text-sm font-medium mb-2">Connect Your World</h4>
                        <p className="text-xs text-white/30 max-w-[200px] mx-auto">Link your social profiles to your card.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {SOCIALS.map(s => (
                          <button 
                            key={s.id}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-400/30 transition-all group"
                          >
                            <div className="p-2 rounded-xl bg-white/5 group-hover:bg-emerald-400/10 transition-colors">
                              <s.icon className="w-5 h-5 text-white/20 group-hover:text-emerald-400" />
                            </div>
                            <div className="text-left">
                              <span className="text-[10px] uppercase tracking-widest font-bold block">{s.label}</span>
                              <span className="text-[8px] text-white/20">Click to connect</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {customTab === 'suggested' && (
                    <motion.div 
                      key="suggested"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                        {(['music', 'glow', 'outline'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setSuggestedSubTab(t)}
                            className={`flex-1 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all ${
                              suggestedSubTab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {suggestedSubTab === 'music' && (
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-xs uppercase tracking-widest font-semibold">Profile Music</h4>
                            </div>
                            <span className="text-[8px] text-white/20 uppercase tracking-tighter">Suggested by Jericho</span>
                          </div>

                          <div className="space-y-6">
                            <div className="flex bg-white/5 rounded-xl p-1">
                              {(['none', 'upload', 'link'] as const).map(t => (
                                <button
                                  key={t}
                                  onClick={() => {
                                    setActiveMusicSource(t);
                                    setProfile({ ...profile, musicType: t });
                                  }}
                                  className={`flex-1 py-2 rounded-lg text-[9px] uppercase tracking-widest transition-all ${
                                    activeMusicSource === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>

                            {activeMusicSource === 'upload' && (
                              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="relative h-24 w-full rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group">
                                  <Upload className="w-6 h-6 text-white/20 mb-2 group-hover:text-emerald-400 transition-colors" />
                                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Upload MP3 File</span>
                                  <p className="text-[8px] text-white/20 mt-1">Maximum size 10MB</p>
                                  <input 
                                    type="file" 
                                    accept=".mp3"
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) setProfile({ ...profile, musicSource: URL.createObjectURL(file), musicTitle: file.name.replace('.mp3', '') });
                                    }}
                                  />
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[8px] uppercase tracking-widest text-white/40 ml-1">Song Title</label>
                                      <input 
                                        type="text"
                                        placeholder="Enter title..."
                                        value={profile.musicTitle}
                                        onChange={(e) => setProfile({ ...profile, musicTitle: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] uppercase tracking-widest text-white/40 ml-1">Artist Name</label>
                                      <input 
                                        type="text"
                                        placeholder="Enter artist..."
                                        value={profile.musicArtist}
                                        onChange={(e) => setProfile({ ...profile, musicArtist: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] uppercase tracking-widest text-white/40 ml-1">Album Art URL (Optional)</label>
                                    <input 
                                      type="text"
                                      placeholder="https://..."
                                      value={profile.musicAlbumArt || ''}
                                      onChange={(e) => setProfile({ ...profile, musicAlbumArt: e.target.value })}
                                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeMusicSource === 'link' && (
                              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="space-y-1">
                                  <label className="text-[8px] uppercase tracking-widest text-white/40 ml-1">Music Link</label>
                                  <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                                    <input 
                                      type="text"
                                      placeholder="YouTube or Spotify URL..."
                                      value={profile.musicSource || ''}
                                      onChange={(e) => setProfile({ ...profile, musicSource: e.target.value })}
                                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[8px] uppercase tracking-widest text-white/40 ml-1">Song Title</label>
                                      <input 
                                        type="text"
                                        placeholder="Enter title..."
                                        value={profile.musicTitle}
                                        onChange={(e) => setProfile({ ...profile, musicTitle: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] uppercase tracking-widest text-white/40 ml-1">Artist Name</label>
                                      <input 
                                        type="text"
                                        placeholder="Enter artist..."
                                        value={profile.musicArtist}
                                        onChange={(e) => setProfile({ ...profile, musicArtist: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] uppercase tracking-widest text-white/40 ml-1">Album Art URL (Optional)</label>
                                    <input 
                                      type="text"
                                      placeholder="https://..."
                                      value={profile.musicAlbumArt || ''}
                                      onChange={(e) => setProfile({ ...profile, musicAlbumArt: e.target.value })}
                                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              {MUSIC_STYLES.map(s => (
                                <button 
                                  key={s.id}
                                  onClick={() => setProfile({ ...profile, musicStyle: s.id })}
                                  className={`group relative p-4 rounded-2xl border text-left transition-all hover:bg-white/5 flex flex-col gap-3 overflow-hidden ${
                                    profile.musicStyle === s.id ? 'border-emerald-400 bg-emerald-400/5 ring-1 ring-emerald-400/20' : 'border-white/5 bg-white/[0.02]'
                                  }`}
                                >
                                  {/* Visual Preview */}
                                  <div className={`w-full h-12 rounded-lg border flex items-center gap-2 px-2 overflow-hidden ${s.class}`}>
                                    <div className="w-6 h-6 rounded bg-white/10 flex-shrink-0" />
                                    <div className="flex-grow space-y-1">
                                      <div className="w-12 h-1 bg-white/20 rounded" />
                                      <div className="w-8 h-1 bg-white/10 rounded" />
                                    </div>
                                  </div>
                                  <span className="text-[10px] uppercase tracking-widest font-bold truncate">{s.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}

                      {suggestedSubTab === 'glow' && (
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-xs uppercase tracking-widest font-semibold">Card Glow</h4>
                            </div>
                            <span className="text-[8px] text-white/20 uppercase tracking-tighter">Suggested by Grant</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {CARD_GLOWS.map(g => (
                              <button 
                                key={g.id}
                                onClick={() => setProfile({ ...profile, cardGlow: g.id })}
                                className={`group relative p-4 rounded-2xl border text-left transition-all hover:bg-white/5 flex flex-col gap-3 overflow-hidden ${
                                  profile.cardGlow === g.id ? 'border-emerald-400 bg-emerald-400/5 ring-1 ring-emerald-400/20' : 'border-white/5 bg-white/[0.02]'
                                }`}
                              >
                                {/* Visual Preview */}
                                <div className={`w-full h-16 rounded-lg bg-black/40 border border-white/5 relative overflow-hidden ${g.class}`}>
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                                </div>
                                <span className="text-[10px] uppercase tracking-widest font-bold truncate">{g.label}</span>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      {suggestedSubTab === 'outline' && (
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-xs uppercase tracking-widest font-semibold">Card Outline</h4>
                            </div>
                            <span className="text-[8px] text-white/20 uppercase tracking-tighter">Suggested by Grant</span>
                          </div>

                          <div className="space-y-6">
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] uppercase tracking-widest font-bold">Outline Width</span>
                                <span className="text-[10px] text-emerald-400 font-mono">{profile.cardOutlineWidth}px</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={profile.cardOutlineWidth}
                                onChange={(e) => setProfile({ ...profile, cardOutlineWidth: parseFloat(e.target.value) })}
                                className="w-full accent-emerald-400"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {CARD_OUTLINES.map(o => (
                                <button 
                                  key={o.id}
                                  onClick={() => setProfile({ ...profile, cardOutline: o.id })}
                                  className={`group relative p-4 rounded-2xl border text-left transition-all hover:bg-white/5 flex flex-col gap-3 overflow-hidden ${
                                    profile.cardOutline === o.id ? 'border-emerald-400 bg-emerald-400/5 ring-1 ring-emerald-400/20' : 'border-white/5 bg-white/[0.02]'
                                  }`}
                                >
                                  {/* Visual Preview */}
                                  <div className={`w-full h-16 rounded-lg bg-black/40 border relative overflow-hidden ${o.class}`} style={{ borderWidth: profile.cardOutlineWidth }}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                                  </div>
                                  <span className="text-[10px] uppercase tracking-widest font-bold truncate">{o.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-serif italic mb-2">Final Review</h2>
              <p className="text-white/40 text-sm">Your luxury identity is ready for the infinity.</p>
            </div>

            <div className="max-w-[340px] mx-auto">
              <ProfilePreview profile={profile} />
            </div>

            <div className="space-y-4">
              <p className="text-xs text-white/20">By clicking finish, you agree to our terms and conditions.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-medium"
                >
                  Edit Steps
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-[2] py-4 bg-white text-black font-semibold rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                  Finalize Account <Infinity className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  if (authState === 'app') {
    return (
      <div className="flex h-screen bg-[#050505] text-white font-sans selection:bg-emerald-400 selection:text-black overflow-hidden">
        {/* Sidebar (Rail) */}
        <div className="w-[72px] bg-black border-r border-white/5 flex flex-col items-center py-4 gap-4 flex-shrink-0">
          <button 
            onClick={() => setActiveAppTab('friends')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative ${
              activeAppTab === 'friends' ? 'bg-emerald-400 text-black rounded-xl' : 'bg-white/5 text-white/40 hover:bg-emerald-400 hover:text-black hover:rounded-xl'
            }`}
          >
            <Logo size="sm" />
            <div className={`absolute left-0 w-1 bg-white rounded-r-md transition-all ${activeAppTab === 'friends' ? 'h-8' : 'h-0 group-hover:h-4'}`} />
          </button>
          
          <div className="w-8 h-[2px] bg-white/5 rounded-sm" />
          
          <button 
            onClick={() => setActiveAppTab('explore')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative ${
              activeAppTab === 'explore' ? 'bg-emerald-400 text-black rounded-xl' : 'bg-white/5 text-white/40 hover:bg-emerald-400 hover:text-black hover:rounded-xl'
            }`}
          >
            <Compass className="w-6 h-6" />
            <div className={`absolute left-0 w-1 bg-white rounded-r-md transition-all ${activeAppTab === 'explore' ? 'h-8' : 'h-0 group-hover:h-4'}`} />
          </button>

          <button 
            onClick={() => setActiveAppTab('customization')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative ${
              activeAppTab === 'customization' ? 'bg-emerald-400 text-black rounded-xl' : 'bg-white/5 text-white/40 hover:bg-emerald-400 hover:text-black hover:rounded-xl'
            }`}
          >
            <Sparkles className="w-6 h-6" />
            <div className={`absolute left-0 w-1 bg-white rounded-r-md transition-all ${activeAppTab === 'customization' ? 'h-8' : 'h-0 group-hover:h-4'}`} />
          </button>

          <div className="mt-auto flex flex-col gap-4">
            <button className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-emerald-400 hover:text-black hover:rounded-xl transition-all group">
              <Settings className="w-6 h-6" />
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="w-12 h-12 rounded-2xl bg-white/5 text-red-400/60 flex items-center justify-center hover:bg-red-500 hover:text-white hover:rounded-xl transition-all group"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Panel */}
        <div className="w-60 bg-[#080808] border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="h-12 border-b border-white/5 flex items-center px-4 shadow-sm">
            <div className="relative w-full">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
              <input 
                type="text" 
                placeholder="Find or start a conversation" 
                className="w-full bg-black/40 border border-white/5 rounded px-7 py-1 text-[10px] focus:outline-none focus:border-emerald-400/30"
              />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {activeAppTab === 'friends' ? (
              <>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded bg-white/5 text-white transition-colors">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium">Friends</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-white/40 hover:bg-white/5 hover:text-white transition-colors">
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-xs font-medium">Explore</span>
                </button>
                
                <div className="pt-4 pb-2 px-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/20">Direct Messages</span>
                </div>
                
                {['Jericho', 'Grant', 'Julian', 'Sterling', 'Aria'].map(name => (
                  <button key={name} className="w-full flex items-center gap-3 px-3 py-2 rounded text-white/40 hover:bg-white/5 hover:text-white transition-colors group">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">
                        {name[0]}
                      </div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-sm border-2 border-[#080808]" />
                    </div>
                    <span className="text-xs font-medium">{name}</span>
                  </button>
                ))}
              </>
            ) : activeAppTab === 'customization' ? (
              <>
                <div className="px-3 py-4">
                  <h3 className="text-sm font-serif italic text-emerald-400">Uni-fy Nitro</h3>
                  <p className="text-[10px] text-white/30">Luxury Customization</p>
                </div>
                
                <div className="space-y-1">
                  {['Profile Themes', 'Card Effects', 'Music Styles', 'Social Links', 'Inventory'].map(tab => (
                    <button key={tab} className="w-full flex items-center gap-3 px-3 py-2 rounded text-white/40 hover:bg-white/5 hover:text-white transition-colors">
                      <span className="text-xs font-medium">{tab}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <Compass className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-[10px] text-white/20">Explore the Uni-fy ecosystem</p>
              </div>
            )}
          </div>

          {/* User Profile Bar */}
          <div className="h-14 bg-[#050505] border-t border-white/5 flex items-center px-2 gap-2">
            <div className="relative group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center overflow-hidden">
                {profile.pfp ? (
                  <img src={profile.pfp} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-sm border-2 border-[#050505]" />
            </div>
            <div className="flex-grow min-w-0">
              <div className="text-[11px] font-bold truncate">{profile.username || 'User'}</div>
              <div className="text-[9px] text-white/30 truncate">Online</div>
            </div>
            <div className="flex gap-1">
              <button className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-all">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow bg-[#0a0a0a] flex flex-col overflow-hidden">
          {activeAppTab === 'friends' ? (
            <>
              <div className="h-12 border-b border-white/5 flex items-center px-4 gap-4 flex-shrink-0">
                <div className="flex items-center gap-2 pr-4 border-r border-white/5">
                  <Users className="w-4 h-4 text-white/40" />
                  <span className="text-xs font-bold">Friends</span>
                </div>
                <div className="flex gap-4">
                  {['All', 'Pending', 'Add Friend'].map(t => (
                    <button 
                      key={t} 
                      onClick={() => setFriendsSubTab(t as any)}
                      className={`text-xs font-medium px-2 py-1 rounded transition-colors ${friendsSubTab === t ? (t === 'Add Friend' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white') : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <MessageSquare className="w-4 h-4 text-white/40 hover:text-white cursor-pointer" />
                  <div className="w-[1px] h-6 bg-white/5" />
                  <Bell className="w-4 h-4 text-white/40 hover:text-white cursor-pointer" />
                </div>
              </div>

              <div className="flex-grow flex overflow-hidden">
                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                  {friendsSubTab === 'All' && (
                    <>
                      <div className="mb-4">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/20">All Friends — {friends.length}</span>
                      </div>
                      <div className="space-y-1">
                        {friends.map(friend => {
                          const friendId = friend.user1Id === user?.uid ? friend.user2Id : friend.user1Id;
                          const friendProfile = allUsers.find(u => u.uid === friendId);
                          if (!friendProfile) return null;
                          return (
                            <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group cursor-pointer">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {friendProfile.pfp ? (
                                    <img src={friendProfile.pfp} alt={friendProfile.username} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold">
                                      {friendProfile.username?.[0] || '?'}
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-sm border-2 border-[#0a0a0a]" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{friendProfile.username}</div>
                                  <div className="text-[10px] text-white/30">@{friendProfile.handle}</div>
                                </div>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 rounded-lg bg-black/40 text-white/40 hover:text-emerald-400 transition-colors">
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {friends.length === 0 && (
                          <div className="text-center py-10 text-white/40 text-sm">No friends yet. Go add some!</div>
                        )}
                      </div>
                    </>
                  )}

                  {friendsSubTab === 'Pending' && (
                    <>
                      <div className="mb-4">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/20">Pending Requests — {friendRequests.filter(r => r.status === 'pending').length}</span>
                      </div>
                      <div className="space-y-1">
                        {friendRequests.filter(r => r.status === 'pending').map(request => {
                          const senderProfile = allUsers.find(u => u.uid === request.fromUserId);
                          if (!senderProfile) return null;
                          return (
                            <div key={request.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {senderProfile.pfp ? (
                                    <img src={senderProfile.pfp} alt={senderProfile.username} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold">
                                      {senderProfile.username?.[0] || '?'}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{senderProfile.username}</div>
                                  <div className="text-[10px] text-white/30">@{senderProfile.handle}</div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleAcceptRequest(request)} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleRejectRequest(request.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {friendRequests.filter(r => r.status === 'pending').length === 0 && (
                          <div className="text-center py-10 text-white/40 text-sm">No pending requests.</div>
                        )}
                      </div>
                    </>
                  )}

                  {friendsSubTab === 'Add Friend' && (
                    <div className="max-w-md mx-auto mt-10">
                      <h2 className="text-xl font-bold mb-2">Add Friend</h2>
                      <p className="text-sm text-white/40 mb-6">You can add friends with their Uni-fy handle.</p>
                      <div className="relative mb-8">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by handle or username..." 
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-400/50 transition-colors"
                        />
                      </div>
                      
                      {searchQuery && (
                        <div className="space-y-2">
                          {allUsers.filter(u => 
                            u.handle?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.username?.toLowerCase().includes(searchQuery.toLowerCase())
                          ).map(u => (
                            <div key={u.uid} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="flex items-center gap-3">
                                {u.pfp ? (
                                  <img src={u.pfp} alt={u.username} className="w-10 h-10 rounded-xl object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                                    {u.username?.[0] || '?'}
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-bold">{u.username}</div>
                                  <div className="text-xs text-white/40">@{u.handle}</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleSendRequest(u.uid)}
                                className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors"
                              >
                                Send Request
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Now Sidebar */}
                <div className="w-80 border-l border-white/5 p-6 hidden xl:block">
                  <h3 className="text-sm font-bold mb-4">Active Now</h3>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-xs text-white/40 italic">It's quiet for now...</p>
                    <p className="text-[10px] text-white/20 mt-2">When friends start an activity, it'll show up here!</p>
                  </div>
                </div>
              </div>
            </>
          ) : activeAppTab === 'customization' ? (
            <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-12">
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-serif italic mb-2">Uni-fy Nitro</h2>
                    <p className="text-white/40 text-sm">Elevate your digital presence with luxury customization.</p>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">Premium Active</span>
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section className="p-6 rounded-[32px] bg-white/[0.02] border border-white/10 backdrop-blur-xl">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-emerald-400/10">
                          <LayoutGrid className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-widest">Active Profile</h3>
                      </div>
                      <div className="max-w-[300px] mx-auto">
                        <ProfilePreview profile={profile} />
                      </div>
                      <button 
                        onClick={() => setAuthState('wizard')}
                        className="w-full mt-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-emerald-400 transition-all text-xs uppercase tracking-widest"
                      >
                        Open Editor
                      </button>
                    </section>

                    <section className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:border-emerald-400/30 transition-all cursor-pointer group">
                        <Music className="w-6 h-6 text-white/20 group-hover:text-emerald-400 mb-4 transition-colors" />
                        <h4 className="text-xs font-bold uppercase tracking-widest mb-1">Music Library</h4>
                        <p className="text-[10px] text-white/20">42 Custom Tracks</p>
                      </div>
                      <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:border-emerald-400/30 transition-all cursor-pointer group">
                        <Sparkles className="w-6 h-6 text-white/20 group-hover:text-emerald-400 mb-4 transition-colors" />
                        <h4 className="text-xs font-bold uppercase tracking-widest mb-1">Visual Effects</h4>
                        <p className="text-[10px] text-white/20">12 Active Layers</p>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section className="p-8 rounded-[32px] bg-gradient-to-br from-emerald-400/10 to-transparent border border-emerald-400/20 relative overflow-hidden group">
                      <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-emerald-400/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-700" />
                      <h3 className="text-xl font-serif italic mb-4">Your Luxury Perks</h3>
                      <ul className="space-y-4">
                        {[
                          'Animated Profile Outlines',
                          'Custom Music Autoplay',
                          'Exclusive Nitro Badges',
                          'High-Fidelity Audio Uploads',
                          'Unlimited Social Connections'
                        ].map(perk => (
                          <li key={perk} className="flex items-center gap-3 text-xs text-white/60">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </section>

                    <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/20 mb-4">Recent Activity</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold">Updated Profile Theme</div>
                            <div className="text-[9px] text-white/20">2 hours ago</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <Compass className="w-16 h-16 text-white/5 mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-serif italic mb-2">Explore Uni-fy</h2>
                <p className="text-white/20 text-sm">Discover new communities and creators.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (authState === 'wizard') {
    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-400 selection:text-black flex items-center justify-center p-6 overflow-hidden relative">
        {/* Atmospheric Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full" />
        </div>

        <div className={`w-full ${step === 3 ? 'max-w-[1000px]' : 'max-w-[500px]'} relative z-10 transition-all duration-700`}>
          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <Logo size="sm" />
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-medium">
                Step {step} of 4
              </div>
            </div>

            <StepIndicator current={step} total={4} />

            <AnimatePresence>
              {showFullPreview && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6"
                >
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
                  </div>
                  
                  <div className="w-full max-w-[400px] relative z-10">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Visitor View</span>
                      </div>
                      <button 
                        onClick={() => setShowFullPreview(false)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <ProfilePreview profile={profile} viewMode="visitor" />
                    
                    <button 
                      onClick={() => setShowFullPreview(false)}
                      className="w-full mt-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-[10px] uppercase tracking-[0.2em] font-bold"
                    >
                      Back to Editor
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-[400px]">
              {renderStep()}
            </div>

            {step < 4 && step !== 3 && (
              <div className="mt-12 flex items-center justify-between">
                <button 
                  onClick={handleBack}
                  disabled={step === 1}
                  className={`flex items-center gap-2 text-sm font-medium transition-all ${step === 1 ? 'opacity-0' : 'text-white/40 hover:text-white'}`}
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button 
                  onClick={handleNext}
                  className="px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 group"
                >
                  Continue <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                <button 
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button 
                  onClick={handleNext}
                  className="px-12 py-4 bg-white text-black font-semibold rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 group"
                >
                  Review Profile <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-400 selection:text-black flex items-center justify-center p-6 overflow-hidden relative">
      {/* Auth UI */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        <AnimatePresence mode="wait">
          {authState === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl"
            >
              <Logo />
              <div className="text-center mb-10">
                <h1 className="text-4xl font-serif italic mb-2 tracking-tight">Welcome Back</h1>
                <p className="text-white/40 text-sm font-light">Enter your credentials to access the infinity.</p>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <AuthButton onClick={handleGoogleLogin}>Sign In with Google</AuthButton>
              </form>

              <div className="mt-10 text-center">
                <p className="text-sm text-white/40 font-light">
                  New to Uni-fy?{' '}
                  <button onClick={() => setAuthState('signup')} className="text-white hover:text-emerald-400 transition-colors font-medium border-b border-white/20">Create account</button>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl"
            >
              <Logo />
              <div className="text-center mb-10">
                <h1 className="text-4xl font-serif italic mb-2 tracking-tight">Join Uni-fy</h1>
                <p className="text-white/40 text-sm font-light">Begin your journey into the unified space.</p>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <AuthButton onClick={handleGoogleLogin}>Sign Up with Google</AuthButton>
              </form>

              <div className="mt-10 text-center">
                <p className="text-sm text-white/40 font-light">
                  Already a member?{' '}
                  <button onClick={() => setAuthState('login')} className="text-white hover:text-emerald-400 transition-colors font-medium border-b border-white/20">Sign in here</button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Preview Overlay */}
        <AnimatePresence>
          {showFullPreview && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
            >
              <button 
                onClick={() => setShowFullPreview(false)}
                className="absolute top-6 right-6 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group z-[110]"
              >
                <X className="w-6 h-6 text-white/40 group-hover:text-white group-hover:rotate-90 transition-all" />
              </button>

              <div className="w-full max-w-lg relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-center w-full">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-emerald-400 font-bold animate-pulse">Live Preview Mode</span>
                </div>
                <ProfilePreview profile={profile} viewMode="full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// InputField removed as it's no longer used

const AuthButton = ({ children, onClick }: { children: ReactNode, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="w-full py-4 bg-white text-black font-semibold rounded-xl hover:bg-emerald-400 transition-all duration-500 flex items-center justify-center gap-2 group"
  >
    {children}
    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
  </button>
);


