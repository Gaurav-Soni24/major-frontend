"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { attachStream } from "../hooks/useProctoring.js";
import styles from "./player.module.css";

/**
 * Small live preview of the student's own camera. Draggable with the pointer on desktop (fine pointer);
 * on touch screens it stays put in the corner. The video element is the one the face monitor and snapshots read.
 */
export default function CameraPreview({ stream, onVideo }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  const onDown = (e) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const nx = d.ox + (e.clientX - d.x);
    const ny = d.oy + (e.clientY - d.y);
    // keep it inside the window: the box sits 16px from the bottom-right corner
    const maxX = 0;
    const minX = -(window.innerWidth - 200);
    const maxY = 0;
    const minY = -(window.innerHeight - 200);
    setOffset({ x: Math.min(maxX, Math.max(minX, nx)), y: Math.min(maxY, Math.max(minY, ny)) });
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className={styles.cam} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} data-testid="camera-preview">
      <div className={styles.camHandle} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <video
          ref={(el) => {
            onVideo(el);
            if (el) attachStream(stream)(el);
          }}
          muted
          playsInline
          autoPlay
          aria-label="Your camera, used for face monitoring"
        />
      </div>
      <p className={styles.camLabel}>
        <Icon name="camera" size={13} /> Camera on
      </p>
    </div>
  );
}
