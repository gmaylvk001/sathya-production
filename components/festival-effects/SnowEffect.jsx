"use client";
import Snowfall from "react-snowfall";

export default function SnowEffect() {
    return (
        <Snowfall
            snowflakeCount={180}
            radius={[1, 4.5]}
            speed={[0.5, 1.8]}
            wind={[-0.5, 0.5]}
            rotationSpeed={[-0.5, 0.5]}
            style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 9990,
            }}
        />
    );
}