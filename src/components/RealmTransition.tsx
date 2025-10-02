"use client";

import React, { useEffect, useRef } from "react";

interface RealmTransitionProps {
  active: boolean;
}

export default function RealmTransition({ active }: RealmTransitionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!active || !videoRef.current) return;

    const video = videoRef.current;

    const playVideo = () => {
      try {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            /* Ignore autoplay errors */
          });
        }
      } catch {
        /* Ignore playback reset errors */
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      playVideo();
      return;
    }

    const handleLoadedData = () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      playVideo();
    };

    video.addEventListener("loadeddata", handleLoadedData);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [active]);

  return (
    <div className={`realm-transition${active ? " active" : ""}`}>
      <video
        ref={videoRef}
        className="realm-transition-video"
        muted
        playsInline
        preload="metadata"
      >
        <source src="/Loading-Screen.webm" type="video/webm" />
        <source src="/Loading-Screen.mp4" type="video/mp4" />
      </video>

      <style jsx>{`
        .realm-transition {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
          background: black;
          opacity: 0;
          visibility: hidden;
          transition: opacity 600ms ease, visibility 0s linear 600ms;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .realm-transition.active {
          opacity: 1;
          visibility: visible;
          transition: opacity 150ms ease;
        }

        .realm-transition-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.92);
        }
      `}</style>
    </div>
  );
}
