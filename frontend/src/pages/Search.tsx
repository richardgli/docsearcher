import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import Dropzone from "../components/Dropzone";
import Searchbar from "../components/Searchbar";
import Historybar from "../components/Historybar";


function Search() {
    // const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const logButtonRef = useRef<HTMLButtonElement>(null);

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
        
            fetch(`${BACKEND_URL}/me`, { credentials: 'include' })
                .then(res => res.ok ? res.json() : null)
                .then(user => {
                    if (user) {
                        setUser(user);
                        setLoggedIn(true);
                    }
                    // else Navigate('/login')
                })
    }, []);

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

    return (
        <>
            <Historybar />
            {!loggedIn && (
                <button
                    id="login-button"
                    type="button"
                    ref={logButtonRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => window.location.href = `${BACKEND_URL}/login`}
                >
                    Login
                </button>
            )}
            {loggedIn && (
                <button
                    id="logout-button"
                    type="button"
                    ref={logButtonRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => window.location.href = `${BACKEND_URL}/logout`}
                >
                    Logout
                </button>
            )}
            <div className="background">
                <div className="main-title">
                    <p id="title">docsearcher</p>
                    <p id="subtitle">
                        Search PDFs by description, not keywords
                    </p>
                    <Searchbar />
                    <p id="description">
                        {user && (
                            `${user["email"]}`
                        )}
                        PDFs are dense. You shouldn't need to know the exact words in a document to find what you're looking for. docsearcher lets you describe the information you need in plain English and finds the 5 most relevant passages for you so you can stop searching and start reading.
                    </p>
                </div>
                <Dropzone />
            </div>
        </>
    )
}

export default Search
