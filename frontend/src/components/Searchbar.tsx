import { useRef } from "react";
import { gsap } from "gsap";
import { Search } from "lucide-react";

type SearchbarProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function Searchbar({ value, onChange }: SearchbarProps) {
    const searchBarRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (!searchBarRef.current) return;

        gsap.to(searchBarRef.current, {
            backgroundPosition: "75% 100%",
            duration: 0.5,
            ease: "power2.out"
        });
    };

    const handleMouseLeave = () => {
        if (!searchBarRef.current) return;

        gsap.to(searchBarRef.current, {
            backgroundPosition: "0% 100%",
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