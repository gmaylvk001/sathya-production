"use client";
import { Fireworks } from "@fireworks-js/react";
import { useRef } from "react";

export default function FireworksEffect() {
    const ref = useRef(null);

    return (
        <Fireworks
            ref={ref}
            options={{
                rocketsPoint: { min: 0, max: 100 },
                hue: { min: 20, max: 55 },       // gold/orange/red diwali tone
                delay: { min: 15, max: 30 },
                speed: 3,
                acceleration: 1.02,
                friction: 0.97,
                gravity: 1.4,
                particles: 90,
                traceLength: 3,
                traceSpeed: 10,
                explosion: 6,
                brightness: { min: 60, max: 90 },
                flickering: 40,
                intensity: 25,
            }}
            style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 9990,
            }}
        />
    );
}