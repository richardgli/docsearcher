import { useRef } from "react";
import { gsap } from "gsap";
import { Search } from "lucide-react";

type SearchbarProps = {
    value: string;
    onChange: (value: string) => void;
    theme?: "light" | "dark";
};

export default function Searchbar({ value, onChange, theme = "light" }: SearchbarProps) {
    const searchBarRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (!searchBarRef.current) return;

        const enterPos = theme === "dark" ? "0% 100%" : "75% 100%";

        gsap.to(searchBarRef.current, {
            backgroundPosition: enterPos,
            duration: 0.5,
            ease: "power2.out"
        });
    };

    const handleMouseLeave = () => {
        if (!searchBarRef.current) return;

        const leavePos = theme === "dark" ? "75% 100%" : "0% 100%";

        gsap.to(searchBarRef.current, {
            backgroundPosition: leavePos,
            duration: 0.5,
            ease: "power2.out"
        });
    };

    return (
        <>
            <div
                id="search-bar"
                ref={searchBarRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <Search size={24} strokeWidth={1.5} />
                <input
                    type="text"
                    placeholder="Search"
                    autoComplete="off"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </>
    )
}