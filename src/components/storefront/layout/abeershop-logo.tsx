"use client";

import React from "react";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
    showTagline?: boolean;
}

export function AbeerShopLogo({
    className = "",
    size = "md",
    showTagline = false
}: LogoProps) {
    const sizes = {
        sm: { heightClass: "h-8 sm:h-12" },
        md: { heightClass: "h-16" },
        lg: { heightClass: "h-20" },
        xl: { heightClass: "h-24" },
    };

    const { heightClass } = sizes[size];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <img
                src="/Storefront/images/Logo.png"
                alt="AbeerShop Logo"
                className={`${heightClass} w-auto`}
                loading="eager"
            />
        </div>
    );
}

export default AbeerShopLogo;
