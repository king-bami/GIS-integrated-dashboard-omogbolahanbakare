import { useRef, useEffect } from 'react';
import gsap from 'gsap';

const Loader = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pulseRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Pulse Animation
            gsap.to(pulseRef.current, {
                scale: 1.5,
                opacity: 0,
                duration: 1.5,
                repeat: -1,
                ease: "power1.out"
            });

            // Text Fade In
            gsap.fromTo(textRef.current,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 1, ease: "power2.out", delay: 0.5 }
            );

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} style={{
            position: 'fixed',
            inset: 0,
            background: '#F1F5F9', // Light Theme Background
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Pulse Ring */}
                <div ref={pulseRef} style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '2px solid #DC2626',
                    opacity: 0.6
                }}></div>

                {/* Center Icon */}
                <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#DC2626',
                    borderRadius: '50%',
                    boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '20px'
                }}>
                    +
                </div>
            </div>

            <div ref={textRef} style={{
                marginTop: '24px',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '2px',
                fontSize: '14px'
            }}>
                MEDICAL COMMAND CENTER...
            </div>
        </div>
    );
};

export default Loader;
