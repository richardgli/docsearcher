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
                <div>
                    <p id="title">docsearcher</p>
                    <p id="subtitle">
                        a goated ai tool for finding specific information in PDFs WITHOUT keywords
                    </p>
                    <Searchbar />
                    <p id="description">
                        Describe what this website is and explain why its a better alternative to regular searching using ctrl + f as;dlkf jas;lf jawra; igheoaiugh o;asfkh ao;irguh ogiu ha;s oigha;sofgia;sofgi has;ofgi ha;oguh ear;ogi ha;goisadh o;osif gha;ogi hraw;og ihro;aihas;oflkjas f;oewoi;rigiroirwofgh aw or fiho idoshfasd fhasd;k
                    </p>
                </div>
                <Dropzone />
            </div>
        </>
    )
}

export default Search
