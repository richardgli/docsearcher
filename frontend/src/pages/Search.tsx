import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Moon, SunMedium } from "lucide-react";
import Dropzone from "../components/Dropzone";
import Searchbar from "../components/Searchbar";
import Historybar from "../components/Historybar";

type Passage = {
    chunk_id: string;
    page: number;
    chunk_index: number;
    score: number;
    content: string;
};

type SearchProps = {
    theme: "light" | "dark";
    onToggleTheme: () => void;
};

type LoggedInUser = {
    email?: string;
    username?: string;
};

function Search({ theme, onToggleTheme }: SearchProps) {
    // const navigate = useNavigate();
    const [user, setUser] = useState<LoggedInUser | null>(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [passages, setPassages] = useState<Passage[]>([]);
    const logButtonRef = useRef<HTMLButtonElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const titleParagraphRef = useRef<HTMLParagraphElement>(null);
    const searchBarRef = useRef<HTMLDivElement>(null);
    const BACKEND_URL = import.meta.env.VITE_API_URL;
    
    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 1 } });
        tl.fromTo("#title", { opacity: 0 }, { opacity: 1 }, 0)
            .fromTo("#subtitle", { opacity: 0 }, { opacity: 1 }, 0)
            .fromTo("#drop-zone", { opacity: 0 }, { opacity: 1 }, 0)
            .fromTo("#search-bar", { opacity: 0, y: 150 }, { opacity: 1, y: 0 }, 0)
            .addLabel("introDone", 1)
            .fromTo("#description", { opacity: 0, y: 150 }, { opacity: 1, y: 0 }, "introDone")
            .fromTo("#login-button", { opacity: 0, y: -30 }, { opacity: 1, y: 0 }, "introDone");
        
            fetch(`${BACKEND_URL}/api/me`, { credentials: 'include' })
                .then(res => res.ok ? res.json() : null)
                .then(user => {
                    if (user) {
                        setUser(user);
                        setLoggedIn(true);
                    }
                    // else Navigate('/login')
                })
    }, []);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!isProfileMenuOpen) return;

            const target = event.target as Node;
            if (profileMenuRef.current?.contains(target) || logButtonRef.current?.contains(target)) {
                return;
            }

            setIsProfileMenuOpen(false);
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleDocumentClick);
        document.addEventListener("keydown", handleEscapeKey);

        return () => {
            document.removeEventListener("mousedown", handleDocumentClick);
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [isProfileMenuOpen]);

    useEffect(() => {
        if (!titleParagraphRef || !searchBarRef) return;

        if (passages.length != 0) {
            gsap.to(titleParagraphRef.current, {
                y: -140,
                duration: 0.5,
                ease: "power2.out"
            })
            gsap.to(searchBarRef.current, {
                y: -130,
                duration: 0.5,
                ease: "power2.out"
            })
        } else {
            gsap.to(titleParagraphRef.current, {
                y: 0,
                duration: 0.5,
                ease: "power2.out"
            })
            gsap.to(searchBarRef.current, {
                y: 0,
                duration: 0.5,
                ease: "power2.out"
            })
        }
    }, [passages]);

    useEffect(() => {
        if (!loggedIn) {
            setIsProfileMenuOpen(false);
        }
    }, [loggedIn]);

    const handleMouseEnter = () => {
        if (!logButtonRef.current) return;

        gsap.to(logButtonRef.current, {
            backgroundPosition: "75% 100%",
            duration: 0.5,
            ease: "power2.out",
        });
    };

    const handleMouseLeave = () => {
        if (!logButtonRef.current) return;

        gsap.to(logButtonRef.current, {
            backgroundPosition: "0% 100%",
            duration: 0.5,
            ease: "power2.out",
        });
    };

    const handleAuthButtonClick = () => {
        if (!loggedIn) {
            window.location.href = `${BACKEND_URL}/api/login`;
            return;
        }

        setIsProfileMenuOpen((current) => !current);
    };

    const handleLogoutClick = () => {
        setIsProfileMenuOpen(false);
        window.location.href = `${BACKEND_URL}/api/logout`;
    };

    const profileName = user?.username || user?.email || "Account";

    return (
        <>
            <Historybar />
            <button
                id="theme-toggle-button"
                type="button"
                data-theme-current={theme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                onClick={onToggleTheme}
            >
                {theme === "dark" ? <Moon size={18} /> : <SunMedium size={18} />}
            </button>
            <div className="profile-menu-anchor" ref={profileMenuRef}>
                <button
                    id="login-button"
                    type="button"
                    ref={logButtonRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleAuthButtonClick}
                    title={loggedIn ? `Open profile menu for ${profileName}` : "Login"}
                    aria-expanded={loggedIn ? isProfileMenuOpen : undefined}
                    aria-haspopup={loggedIn ? "menu" : undefined}
                >
                    {loggedIn ? profileName : "Login"}
                </button>
                {loggedIn && isProfileMenuOpen && (
                    <div id="profile-menu" role="menu" aria-label="Profile menu">
                        <div className="profile-menu__header">
                            <span className="profile-menu__label">Signed in as</span>
                            <strong>{profileName}</strong>
                        </div>
                        <div className="profile-menu__details">
                            <p>
                                <span>Email</span>
                                <strong>{user?.email || "Not available"}</strong>
                            </p>
                            <p>
                                <span>Username</span>
                                <strong>{user?.username || "Not available"}</strong>
                            </p>
                        </div>
                        <button
                            id="profile-logout-button"
                            type="button"
                            onClick={handleLogoutClick}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
            <div className="background">
                <div className="main-title">
                    <p id="title" ref={titleParagraphRef}>docsearcher</p>
                    {!passages.length && (
                        <p id="subtitle">
                            Search PDFs by description, not keywords
                        </p>
                    )}
                    <div ref={searchBarRef}>
                        <Searchbar value={query} onChange={setQuery} />
                        {passages.length > 0 && (
                            <div className="passage-results passage-results--search">
                                <h3>Relevant passages</h3>
                                <ul>
                                    {passages.map((passage) => (
                                        <li key={passage.chunk_id}>
                                            <div className="passage-meta">
                                                <span>Page {passage.page}</span>
                                                <span>Chunk {passage.chunk_index + 1}</span>
                                                <span>{Math.round(passage.score * 100)}%</span>
                                            </div>
                                            <p>{passage.content}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    {!passages.length && (
                        <p id="description">
                            PDFs are dense. You shouldn't need to know the exact words in a document to find what you're looking for. docsearcher lets you describe the information you need in plain English and finds the 5 most relevant passages for you so you can stop searching and start reading.
                        </p>
                    )}
                </div>
                <Dropzone theme={theme} query={query} onPassagesChange={setPassages} />
            </div>
        </>
    )
}

export default Search
