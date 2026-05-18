import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Dropzone from "../components/Dropzone";
import Searchbar from "../components/Searchbar";
import Historybar from "../components/Historybar";

function Search() {
    const loginButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 1 } });
        tl.fromTo("#title", { opacity: 0 }, { opacity: 1 }, 0)
            .fromTo("#subtitle", { opacity: 0 }, { opacity: 1 }, 0)
            .fromTo("#drop-zone", { opacity: 0 }, { opacity: 1 }, 0)
            .fromTo("#search-bar", { opacity: 0, y: 150 }, { opacity: 1, y: 0 }, 0)
            .addLabel("introDone", 1)
            .fromTo("#description", { opacity: 0, y: 150 }, { opacity: 1, y: 0 }, "introDone")
            .fromTo("#login-button", { opacity: 0, y: -30 }, { opacity: 1, y: 0 }, "introDone");
    }, []);

    const handleMouseEnter = () => {
        if (!loginButtonRef.current) return;

        gsap.to(loginButtonRef.current, {
            backgroundPosition: "75% 100%",
            duration: 0.5,
            ease: "power2.out",
        });
    };

    const handleMouseLeave = () => {
        if (!loginButtonRef.current) return;

        gsap.to(loginButtonRef.current, {
            backgroundPosition: "0% 100%",
            duration: 0.5,
            ease: "power2.out",
        });
    };

    return (
        <>
            <Historybar />
            <button
                id="login-button"
                type="button"
                ref={loginButtonRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                Login
            </button>
            <div className="background">
                <div className="main-title">
                    <p id="title">docsearcher</p>
                    <p id="subtitle">
                        Search PDFs by description, not keywords
                    </p>
                    <Searchbar />
                    <p id="description">
                        PDFs are dense. You shouldn't need to know the exact words in a document to find what you're looking for. docsearcher lets you describe the information you need in plain English and finds the 5 most relevant passages for you so you can stop searching and start reading.
                    </p>
                </div>
                <Dropzone />
            </div>
        </>
    )
}

export default Search
