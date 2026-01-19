"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AnimationType =
    | "fade-up"
    | "fade-down"
    | "fade-left"
    | "fade-right"
    | "zoom-in"
    | "zoom-out"
    | "flip-up"
    | "slide-up"
    | "slide-down"
    | "blur-in"
    | "scale-in"
    | "rotate-in"
    | "bounce-in"
    | "parallax";

interface ScrollAnimationProps {
    children: ReactNode;
    animation?: AnimationType;
    delay?: number;
    duration?: number;
    threshold?: number;
    once?: boolean;
    className?: string;
    staggerChildren?: boolean;
    staggerDelay?: number;
    parallaxSpeed?: number;
}

const animationClasses: Record<AnimationType, { initial: string; animate: string }> = {
    "fade-up": {
        initial: "opacity-0 translate-y-12",
        animate: "opacity-100 translate-y-0",
    },
    "fade-down": {
        initial: "opacity-0 -translate-y-12",
        animate: "opacity-100 translate-y-0",
    },
    "fade-left": {
        initial: "opacity-0 translate-x-12",
        animate: "opacity-100 translate-x-0",
    },
    "fade-right": {
        initial: "opacity-0 -translate-x-12",
        animate: "opacity-100 translate-x-0",
    },
    "zoom-in": {
        initial: "opacity-0 scale-90",
        animate: "opacity-100 scale-100",
    },
    "zoom-out": {
        initial: "opacity-0 scale-110",
        animate: "opacity-100 scale-100",
    },
    "flip-up": {
        initial: "opacity-0 rotateX-90",
        animate: "opacity-100 rotateX-0",
    },
    "slide-up": {
        initial: "opacity-0 translate-y-24",
        animate: "opacity-100 translate-y-0",
    },
    "slide-down": {
        initial: "opacity-0 -translate-y-24",
        animate: "opacity-100 translate-y-0",
    },
    "blur-in": {
        initial: "opacity-0 blur-lg",
        animate: "opacity-100 blur-0",
    },
    "scale-in": {
        initial: "opacity-0 scale-75",
        animate: "opacity-100 scale-100",
    },
    "rotate-in": {
        initial: "opacity-0 rotate-12 scale-90",
        animate: "opacity-100 rotate-0 scale-100",
    },
    "bounce-in": {
        initial: "opacity-0 scale-50",
        animate: "opacity-100 scale-100",
    },
    "parallax": {
        initial: "",
        animate: "",
    },
};

export function ScrollAnimation({
    children,
    animation = "fade-up",
    delay = 0,
    duration = 700,
    threshold = 0.15,
    once = true,
    className,
    parallaxSpeed = 0.5,
}: ScrollAnimationProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [parallaxY, setParallaxY] = useState(0);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) observer.disconnect();
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [once, threshold]);

    // Parallax effect
    useEffect(() => {
        if (animation !== "parallax" || !ref.current) return;

        const handleScroll = () => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const elementCenter = rect.top + rect.height / 2;
            const viewportCenter = viewportHeight / 2;
            const distanceFromCenter = elementCenter - viewportCenter;
            const parallaxOffset = distanceFromCenter * parallaxSpeed * 0.1;
            setParallaxY(parallaxOffset);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, [animation, parallaxSpeed]);

    const animConfig = animationClasses[animation];

    const style = {
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        ...(animation === "parallax" ? { transform: `translateY(${parallaxY}px)` } : {}),
    };

    return (
        <div
            ref={ref}
            className={cn(
                "transition-all ease-out",
                animation !== "parallax" && (isVisible ? animConfig.animate : animConfig.initial),
                className
            )}
            style={style}
        >
            {children}
        </div>
    );
}

// Stagger animation wrapper for lists
interface StaggerContainerProps {
    children: ReactNode;
    className?: string;
    staggerDelay?: number;
    animation?: AnimationType;
    threshold?: number;
}

export function StaggerContainer({
    children,
    className,
    staggerDelay = 100,
    animation = "fade-up",
    threshold = 0.1,
}: StaggerContainerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [threshold]);

    const animConfig = animationClasses[animation];

    return (
        <div ref={ref} className={className}>
            {Array.isArray(children)
                ? children.map((child, index) => (
                    <div
                        key={index}
                        className={cn(
                            "transition-all duration-700 ease-out",
                            isVisible ? animConfig.animate : animConfig.initial
                        )}
                        style={{ transitionDelay: `${index * staggerDelay}ms` }}
                    >
                        {child}
                    </div>
                ))
                : children}
        </div>
    );
}

// Section wrapper with reveal animation
interface AnimatedSectionProps {
    children: ReactNode;
    className?: string;
    id?: string;
    animation?: AnimationType;
    delay?: number;
    as?: "section" | "div" | "article";
}

export function AnimatedSection({
    children,
    className,
    id,
    animation = "fade-up",
    delay = 0,
    as: Component = "section",
}: AnimatedSectionProps) {
    const ref = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: "50px" }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const animConfig = animationClasses[animation];

    return (
        <Component
            ref={ref as any}
            id={id}
            className={cn(
                "transition-all duration-1000 ease-out",
                isVisible ? animConfig.animate : animConfig.initial,
                className
            )}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </Component>
    );
}

// Floating animation for decorative elements
export function FloatingElement({
    children,
    className,
    speed = 3,
    distance = 10,
}: {
    children: ReactNode;
    className?: string;
    speed?: number;
    distance?: number;
}) {
    return (
        <div
            className={cn("animate-float", className)}
            style={{
                ["--float-speed" as string]: `${speed}s`,
                ["--float-distance" as string]: `${distance}px`,
            }}
        >
            {children}
        </div>
    );
}

// Smooth scroll progress indicator hook
export function useScrollProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollProgress = (window.scrollY / totalHeight) * 100;
            setProgress(scrollProgress);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return progress;
}
