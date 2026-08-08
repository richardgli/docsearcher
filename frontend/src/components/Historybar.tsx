import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Menu } from "lucide-react";

export default function Historybar() {
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const sidebarContentRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [documents, setDocuments] = useState<
        Array<{
            id: string;
            filename: string;
            created_at: string;
            status: string;
        }>
    >([]);
    const [isLoading, setIsLoading] = useState(false);
    const sidebarWidth = 250;
    const popoutDistance = 30;
    const BACKEND_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (!sidebarContentRef.current) return;
        gsap.set(sidebarContentRef.current, { x: -sidebarWidth });
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const controller = new AbortController();

        setIsLoading(true);
        fetch(`${BACKEND_URL}/api/documents`, {
            credentials: "include",
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    return null;
                }

                return response.json();
            })
            .then((payload) => {
                setDocuments(payload?.documents ?? []);
            })
            .catch((error) => {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                setDocuments([]);
            })
            .finally(() => {
                setIsLoading(false);
            });

        return () => controller.abort();
    }, [BACKEND_URL, isOpen]);
    
    const handleMenuClick = () => {
        if (!menuButtonRef.current) return;
        if (isOpen) {
            gsap.to(menuButtonRef.current, {
                x: 0,
                duration: 0.25,
                ease: "power2.out",
            });

            gsap.to(sidebarContentRef.current, {
                x: -sidebarWidth,
                duration: 0.25,
                ease: "power2.out",
            });
        } else {
            gsap.to(menuButtonRef.current, {
                x: sidebarWidth,
                duration: 0.25,
                ease: "power2.out",
            });

            gsap.to(sidebarContentRef.current, {
                x: 0,
                duration: 0.25,
                ease: "power2.out",
            });
        }
        setIsOpen(!isOpen);
    };

    const handleHistoryItemClick = (item: string) => {
        console.log("Clicked:", item);
        gsap.to(sidebarContentRef.current, {
            x: -sidebarWidth,
            duration: 0.25,
            ease: "power2.out",
        });
        
        gsap.to(menuButtonRef.current, {
            x: 0,
            duration: 0.25,
            ease: "power2.out",
        });
        setIsOpen(false);
    };

    const handleClickOutside = (e: React.MouseEvent) => {
        if (sidebarContentRef.current && !sidebarContentRef.current.contains(e.target as Node)) {
            gsap.to(sidebarContentRef.current, {
                x: -sidebarWidth,
                duration: 0.25,
                ease: "power2.out",
            });
            gsap.to(menuButtonRef.current, {
                x: 0,
                duration: 0.25,
                ease: "power2.out",
            });
            setIsOpen(false);
        }
    };
    
    const handleMouseEnter = () => {
        if (!menuButtonRef.current || isOpen) return;
        
        gsap.to(menuButtonRef.current, {
            x: isOpen ? sidebarWidth + popoutDistance : popoutDistance,
            duration: 0.25,
            ease: "power2.out",
        })

        gsap.to(sidebarContentRef.current, {
            x: isOpen ? popoutDistance : -sidebarWidth + popoutDistance,
            duration: 0.25,
            ease: "power2.out",
        });        
    };
    
    const handleMouseLeave = () => {
        if (!menuButtonRef.current || isOpen) return;
        
        gsap.to(menuButtonRef.current, {
            x: isOpen ? sidebarWidth : 0,
            duration: 0.25,
            ease: "power2.out",
        });

        gsap.to(sidebarContentRef.current, {
            x: isOpen ? 0: -sidebarWidth,
            duration: 0.25,
            ease: "power2.out",
        });
    };

    return (
        <>
            {isOpen && (
                <div className="sidebar-overlay" onClick={handleClickOutside}/>
            )}
            <button 
                id="menu-button"
                ref={menuButtonRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleMenuClick}
                >
                <Menu size={24} strokeWidth={1.5} />
            </button>
            <div 
                id="sidebar" 
                ref={sidebarContentRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={isOpen ? undefined : handleMenuClick}
            >
                <div className="sidebar-content" id={isOpen ? "" : "pointer"}>
                    <p>Recent docs</p>
                    {isOpen && (
                        <ul className="history-list">
                            {isLoading && <li className="history-empty">Loading documents...</li>}
                            {!isLoading && documents.length === 0 && (
                                <li className="history-empty">No documents yet.</li>
                            )}
                            {documents.map((doc) => (
                                <li key={doc.id}>
                                    <button onClick={() => handleHistoryItemClick(doc.filename)}>
                                        <span>{doc.filename}</span>
                                        <small>
                                            {new Date(doc.created_at).toLocaleString()}
                                        </small>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}