'use client';

import { useState, useRef, useCallback } from 'react';
import { AudioMetadata } from '@/types';

interface UseAudioPlayerOptions {
  audioMetadata: AudioMetadata | null;
  viewRange: { start: number; end: number };
  setViewRange: React.Dispatch<React.SetStateAction<{ start: number; end: number }>>;
  selection: { start: number; end: number } | null;
}

export function useAudioPlayer({
  audioMetadata,
  viewRange,
  setViewRange,
  selection,
}: UseAudioPlayerOptions) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio time update event with smooth viewport auto-scrolling
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    if (isPlaying && time > viewRange.end) {
      const span = viewRange.end - viewRange.start;
      const totalDur = audioMetadata ? audioMetadata.duration : time + span;
      let newStart = time;
      let newEnd = newStart + span;
      if (newEnd > totalDur) {
        newEnd = totalDur;
        newStart = Math.max(0, newEnd - span);
      }
      setViewRange({ start: newStart, end: newEnd });
    }

    if (isLooping && selection && selection.start !== selection.end) {
      const minSel = Math.min(selection.start, selection.end);
      const maxSel = Math.max(selection.start, selection.end);
      if (time >= maxSel) {
        audioRef.current.currentTime = minSel;
        audioRef.current.play();
      }
    }
  }, [isPlaying, viewRange, audioMetadata, isLooping, selection, setViewRange]);

  const handleTogglePlay = useCallback(() => {
    if (!audioRef.current || !audioMetadata) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioMetadata]);

  const handlePlayRange = useCallback((start: number, end: number) => {
    if (!audioRef.current || !audioMetadata) return;
    const minTime = Math.max(0, Math.min(start, end));
    const maxTime = Math.min(audioMetadata.duration, Math.max(start, end));
    if (maxTime - minTime < 0.005) return;

    audioRef.current.currentTime = minTime;
    audioRef.current.play();
    setIsPlaying(true);

    const checkInterval = setInterval(() => {
      if (!audioRef.current) {
        clearInterval(checkInterval);
        return;
      }
      if (audioRef.current.currentTime >= maxTime) {
        audioRef.current.pause();
        setIsPlaying(false);
        clearInterval(checkInterval);
      }
    }, 20);
  }, [audioMetadata]);

  const handlePlaySelection = useCallback(() => {
    if (!selection) return;
    handlePlayRange(selection.start, selection.end);
  }, [selection, handlePlayRange]);

  const handleSeek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleChangePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  return {
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    playbackRate,
    isLooping,
    setIsLooping,
    audioRef,
    handleTimeUpdate,
    handleTogglePlay,
    handlePlaySelection,
    handlePlayRange,
    handleSeek,
    handleChangePlaybackRate,
  };
}
